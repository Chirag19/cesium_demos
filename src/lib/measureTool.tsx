import { PointGoup, PointGoupTypeEnum } from "./pointEditorTool";
import { Debug } from "./debug";
import { message } from "antd";
export enum ToolEnum {
    POINT = "点测量",
    LINE = "线段测量",
    VOLUME = "体积测量"
}
export interface ImeasureTool {
    type: ToolEnum;
    active: () => void;
    disActive: () => void;
    onMeasureEnd: (data: any) => void;
}

function samplePoint(viewer, position: Cesium.Cartesian2) {
    let ray = viewer.camera.getPickRay(position);
    let picked = viewer.scene.pickFromRay(ray, []);
    if (picked && picked.position != null) {
        let clampPos = viewer.scene.clampToHeight(picked.position);
        return clampPos;
    }
    return null;
}

export class PointTool implements ImeasureTool {
    handler: Cesium.ScreenSpaceEventHandler;
    viewer: Cesium.Viewer;
    beActived: boolean;
    readonly type = ToolEnum.POINT;
    constructor(viewer: Cesium.Viewer) {
        this.viewer = viewer;
    }
    private createHandler() {
        let handler = new Cesium.ScreenSpaceEventHandler();
        this.handler = handler;
        handler.setInputAction((event) => {
            if (this.beActived) {
                let point = samplePoint(this.viewer, event.position);
                if (point) {
                    let cargo = Cesium.Cartographic.fromCartesian(point);
                    let gps = [cargo.longitude * 180 / Math.PI, cargo.latitude * 180 / Math.PI, cargo.height];
                    let newPoint = this.viewer.entities.add({
                        position: point,
                        point: {
                            pixelSize: 5,
                            color: Cesium.Color.WHITE,
                            outlineColor: Cesium.Color.DEEPPINK,
                            outlineWidth: 2,
                            disableDepthTestDistance: Number.POSITIVE_INFINITY
                        },
                        // label: {
                        //     text: `点：${gps[0].toFixed(2)}, ${gps[1].toFixed(2)}, ${gps[2].toFixed(2)}`,
                        //     verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                        //     horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
                        //     showBackground: true,
                        //     disableDepthTestDistance: Number.POSITIVE_INFINITY,
                        //     scale: 0.5,
                        //     pixelOffset: new Cesium.Cartesian2(0, -10)
                        // } as any
                    });
                    if (this.onMeasureEnd) {
                        this.onMeasureEnd(gps);
                    };
                }
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    }
    active() {
        if (this.handler == null)
            this.createHandler();
        this.beActived = true;
        if (this.onPickPoint) this.onPickPoint(0);
    }
    disActive() {
        this.beActived = false;
    }
    onMeasureEnd: (point: number[]) => void;
    onPickPoint: (index: number) => void;
}
export class LineTool implements ImeasureTool {
    handler: Cesium.ScreenSpaceEventHandler;
    viewer: Cesium.Viewer;
    beActived: boolean;
    readonly type = ToolEnum.LINE;
    private enableBrokenLine: boolean = false;
    constructor(viewer: Cesium.Viewer) {
        this.viewer = viewer;
    }
    private endPos: Cesium.Cartesian3;
    private points: { pos: Cesium.Cartesian3, ins: Cesium.Entity }[] = [];
    private currentLine: Cesium.Entity;
    setBrokenLine(active: boolean) {
        this.enableBrokenLine = active;
    }

    private addSamplePoint(clampPos: Cesium.Cartesian3) {
        if (this.points.length == 0) {
            if (this.onMeasureStart) this.onMeasureStart();
            this.endPos = clampPos.clone();
            this.currentLine = this.viewer.entities.add({
                polyline: {
                    positions: new Cesium.CallbackProperty(() => {
                        let points = this.points.map(item => item.pos);
                        if (this.enableBrokenLine) {
                            return [...points, this.endPos];
                        } else {
                            if (this.points.length == 1) {
                                return [...points, this.endPos];
                            } else {
                                return [...points]
                            }
                        }
                    }, false),
                    width: 4,
                    material: Cesium.Color.YELLOW.withAlpha(0.7),
                    depthFailMaterial: Cesium.Color.AQUA.withAlpha(0.3)
                }
            });
        }

        let linePoint = this.viewer.entities.add({
            position: clampPos,
            point: {
                pixelSize: 5,
                color: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.DEEPPINK,
                outlineWidth: 2,
                disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
        });
        if (this.onCreatePoint) {
            this.onCreatePoint(linePoint);
        }
        this.points.push({ pos: clampPos, ins: linePoint });
        if (this.onPickPoint) this.onPickPoint(this.points.length);

        if (!this.enableBrokenLine && this.points.length == 2) {
            this.computeSample();
        }
    }


    private computeSample() {
        let pointArr = this.points;
        this.points = [];

        let lens = pointArr.reduce((total, item, index) => total + (pointArr[index + 1] ? Cesium.Cartesian3.distance(item.pos, pointArr[index + 1].pos) : 0), 0)
        // let lens = Cesium.Cartesian3.distance(pointArr[0].pos, pointArr[1].pos);
        this.currentLine.polyline.positions = pointArr.map(item => item.pos.clone()) as any;
        if (this.onMeasureEnd) this.onMeasureEnd(lens);
    }


    private createHandler() {
        let handler = new Cesium.ScreenSpaceEventHandler();
        this.handler = handler;
        let timeoutIDs: NodeJS.Timeout[] = [];
        handler.setInputAction((event) => {
            if (this.beActived) {
                let timeoutID = setTimeout(() => {
                    let point = samplePoint(this.viewer, event.position);
                    if (point) this.addSamplePoint(point);

                }, 200);
                timeoutIDs.push(timeoutID);
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        handler.setInputAction((event) => {
            timeoutIDs.forEach(item => clearTimeout(item));

            if (this.beActived && this.enableBrokenLine) {
                let point = samplePoint(this.viewer, event.position);
                if (point) {
                    this.addSamplePoint(point);
                    this.computeSample();
                }

            }
        }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

        handler.setInputAction((event) => {
            if (this.beActived) {
                let ray = this.viewer.camera.getPickRay(event.endPosition);
                let picked = this.viewer.scene.pickFromRay(ray, []);
                if (picked && picked.position != null) {
                    this.endPos = picked.position;
                }
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        handler.setInputAction((event) => {
            if (this.beActived) {
                this.delectLastPoint();
            }
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

    }

    delectLastPoint() {
        if (this.points.length > 0) {
            let point = this.points.splice(this.points.length - 1, 1);
            point.forEach(item => {
                this.viewer.entities.remove(item.ins);
            });
            if (this.onPickPoint) this.onPickPoint(this.points.length);
        }
    }

    active() {
        if (this.handler == null) {
            this.createHandler();
        }
        if (this.onPickPoint) this.onPickPoint(this.points.length);
        this.beActived = true;
    }
    disActive() {
        this.beActived = false;
    }
    onCreatePoint: (clickPos: Cesium.Entity) => void;
    onMeasureEnd: (lineLength: number) => void;
    onMeasureStart: () => void;
    onPickPoint: (index: number) => void;
}
export class VolumeTool implements ImeasureTool {
    handler: Cesium.ScreenSpaceEventHandler;
    viewer: Cesium.Viewer;
    beActived: boolean;
    readonly type = ToolEnum.VOLUME;
    constructor(viewer: Cesium.Viewer) {
        this.viewer = viewer;
    }
    private points: { pos: Cesium.Cartesian3, ins: Cesium.Entity }[] = [];

    private addSamplePoint(clampPos: Cesium.Cartesian3) {
        if (this.points.length == 0) {
            if (this.onMeasureStart) this.onMeasureStart();

            this.viewer.entities.add({
                polygon: {
                    hierarchy: new Cesium.CallbackProperty(() => {
                        return new Cesium.PolygonHierarchy(this.points.map(item => item.pos.clone()));
                    }, false),
                    // extrudedHeight: 200,
                    // height: height != null ? height : 0,
                    material: Cesium.Color.AQUA.withAlpha(0.3),
                    outline: true,
                    // outlineColor: Cesium.Color.AQUA,
                    outlineWidth: 20.0
                }
            });
        };

        let linePoint = this.viewer.entities.add({
            position: clampPos.clone(),
            point: {
                pixelSize: 5,
                color: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.DEEPPINK,
                outlineWidth: 2,
                disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
        });

        this.points.push({ pos: clampPos.clone(), ins: linePoint });

        if (this.onPickPoint) { this.onPickPoint(this.points.length) }
    }

    private createHandler() {
        // console.warn("@@@newhandler");

        let handler = new Cesium.ScreenSpaceEventHandler();
        this.handler = handler;

        var timeoutIDs: NodeJS.Timeout[] = [];
        handler.setInputAction((event) => {
            if (this.beActived) {
                let timeoutID = setTimeout(() => {
                    let point = samplePoint(this.viewer, event.position);
                    if (point) this.addSamplePoint(point);

                }, 200);
                timeoutIDs.push(timeoutID);
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
        handler.setInputAction((event) => {
            timeoutIDs.forEach(itme => {
                clearTimeout(itme);
            });
            if (this.beActived && this.points.length >= 2) {
                let point = samplePoint(this.viewer, event.position);
                if (point) this.addSamplePoint(point);

                let posArr = this.points;
                this.points = [];
                try {
                    let sampleData = VolumeTool.sampleVolume(this.viewer, { posArr: posArr.map(item => item.pos) });

                    let plan = this.viewer.entities.add({
                        polygon: {
                            hierarchy: sampleData.projectPosArr,
                            perPositionHeight: true,
                            // extrudedHeight: Cesium.Cartographic.fromCartesian(sampleData.centerPos).height,
                            material: Cesium.Color.YELLOW.withAlpha(0.3),
                            outline: true,
                            outlineColor: Cesium.Color.BLACK,
                            outlineWidth: 5.0
                        }
                    });

                    let volume = VolumeTool.computeVolumeBySampleHeight(this.viewer, sampleData);
                    if (this.onMeasureEnd)
                        this.onMeasureEnd({ ...sampleData, ...volume, plan });
                }
                catch (err) {
                    console.error(err);
                }
            }
        }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

        handler.setInputAction((event) => {
            if (this.beActived) {
                this.delectLastPoint();
            }
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    }
    active() {
        this.points = [];
        if (this.handler == null) {
            this.createHandler();
        }
        this.beActived = true;
        if (this.onPickPoint) this.onPickPoint(this.points.length);
    }
    disActive() {
        this.beActived = false;
    }
    onMeasureEnd: (volume: IvolumeReusult) => void;
    onMeasureStart: () => void;
    onPickPoint: (index: number) => void;

    delectLastPoint() {
        if (this.points.length > 0) {
            let point = this.points.splice(this.points.length - 1, 1);
            point.forEach(item => {
                this.viewer.entities.remove(item.ins);
            });
            if (this.onPickPoint) this.onPickPoint(this.points.length);
        }
    }

    static sampleVolume(viewer: Cesium.Viewer, options: IcomputeVolumeOptions) {
        let { posArr, basePlaneHeight, sampleInterval = 1.0 } = options;
        if (basePlaneHeight != null) {
        }
        else {
            let minHeight = Number.POSITIVE_INFINITY;
            let carPosArr: Cesium.Cartographic[] = [];
            posArr.forEach(item => {
                let carPos = Cesium.Cartographic.fromCartesian(item);
                if (carPos.height < minHeight) {
                    minHeight = carPos.height;
                }
                carPosArr.push(carPos);
            });
            basePlaneHeight = minHeight;
        }
        //--------------------计算出中心点，以及中心点法线
        let centerPos = Cesium.BoundingSphere.fromPoints(posArr).center;
        let centerCarpos = Cesium.Cartographic.fromCartesian(centerPos);
        centerPos = Cesium.Cartesian3.fromRadians(centerCarpos.longitude, centerCarpos.latitude, basePlaneHeight);
        // Debug.drawPoint(viewer, centerPos, Cesium.Color.GOLD);
        let centerNormal = Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(centerPos);
        //-------------------计算基准面，投影多边形点到平面上，计算出底面面积
        let basePlane = Cesium.Plane.fromPointNormal(centerPos, centerNormal);
        let projectPosArr = posArr.map(item => Cesium.Plane.projectPointOntoPlane(basePlane, item));

        //-----------------
        let dir_x_world = Cesium.Cartesian3.subtract(projectPosArr[1], projectPosArr[0], new Cesium.Cartesian3());
        Cesium.Cartesian3.normalize(dir_x_world, dir_x_world);
        let dir_z_world = basePlane.normal;
        let dir_y_world = Cesium.Cartesian3.cross(dir_z_world, dir_x_world, new Cesium.Cartesian3());
        let worldMat = new Cesium.Matrix4(dir_x_world.x, dir_y_world.x, dir_z_world.x, centerPos.x, dir_x_world.y, dir_y_world.y, dir_z_world.y, centerPos.y, dir_x_world.z, dir_y_world.z, dir_z_world.z, centerPos.z, 0, 0, 0, 1);
        let mat = Cesium.Matrix4.inverse(worldMat, new Cesium.Matrix4());
        let pointsInPlaneWorld: Cesium.Cartesian3[] = [];
        let max = new Cesium.Cartesian2(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
        let min = new Cesium.Cartesian2(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);

        projectPosArr.forEach(item => {
            let pointInPlane = Cesium.Matrix4.multiplyByPoint(mat, item, new Cesium.Cartesian3());
            pointInPlane.z = 0;
            pointsInPlaneWorld.push(pointInPlane);
            if (pointInPlane.x < min.x)
                min.x = pointInPlane.x;
            if (pointInPlane.y < min.y)
                min.y = pointInPlane.y;
            if (pointInPlane.x > max.x)
                max.x = pointInPlane.x;
            if (pointInPlane.y > max.y)
                max.y = pointInPlane.y;
            return pointInPlane;
        });
        let basePloygonArea = this.computeArea(pointsInPlaneWorld);

        let width = max.x - min.x;
        let height = max.y - min.y;
        let sampleCount_x = Math.ceil(width / sampleInterval);
        let sampleCount_y = Math.ceil(height / sampleInterval);

        //-------------------最小采样100
        let maxCount = Math.max(sampleCount_x, sampleCount_y);
        if (maxCount < 100) {
            let x_smapleInterval = width / 100;
            let y_smapleInterval = height / 100;
            sampleInterval = Math.max(x_smapleInterval, y_smapleInterval);
        }
        sampleCount_x = Math.ceil(width / sampleInterval);
        sampleCount_y = Math.ceil(height / sampleInterval);

        let sampleHeight: number[] = [];
        for (let i = 0; i <= sampleCount_x; i++) {
            for (let j = 0; j <= sampleCount_y; j++) {
                let samplePosInPlane = new Cesium.Cartesian3(min.x + (i + 0.5) * sampleInterval, min.y + (j + 0.5) * sampleInterval, 0);
                if (this.isInPolygon(samplePosInPlane, pointsInPlaneWorld)) {
                    let samplePosInWorld = Cesium.Matrix4.multiplyByPoint(worldMat, samplePosInPlane, new Cesium.Cartesian3());
                    let clampPos = viewer.scene.clampToHeight(samplePosInWorld);
                    if (clampPos != null) {
                        // let height = Cesium.Cartesian3.distance(samplePosInWorld, clampPos);
                        let height = Cesium.Plane.getPointDistance(basePlane, clampPos);
                        sampleHeight.push(height);
                        Debug.drawPoint(viewer, clampPos);
                        Debug.drawPoint(viewer, samplePosInWorld, Cesium.Color.GREEN);
                    }
                }
            }
        }
        return { posArr, sampleInterval, sampleHeight, basePloygonArea, centerPos, projectPosArr }
    }

    static computeVolumeBySampleHeight(viewer: Cesium.Viewer,
        options: {
            sampleHeight: number[],
            basePloygonArea: number,
            adjustHeight?: number
        }) {

        let { sampleHeight, basePloygonArea, adjustHeight: adjustHegiht = 0 } = options;

        let cutSampleHeight: number[] = [];
        let fillSampleHeight: number[] = [];
        sampleHeight.forEach((item) => {
            if (item < adjustHegiht) {
                fillSampleHeight.push(item);
            } else {
                cutSampleHeight.push(item);
            }
        })
        let cutHeightGroup = cutSampleHeight.reduce((total, currentValue) => { return total + currentValue; }, 0);
        let fillHeightGroup = fillSampleHeight.reduce((total, currentValue) => { return total + currentValue; }, 0);

        let cutVolume = cutHeightGroup * basePloygonArea / sampleHeight.length;
        let fillVolume = fillHeightGroup * basePloygonArea / sampleHeight.length;

        return { cutVolume, fillVolume }
    }


    private static computeArea(posArr: Cesium.Cartesian3[]) {
        let startPos = posArr[0];
        let temptLeft = new Cesium.Cartesian3();
        let temptRight = new Cesium.Cartesian3();
        let totalArea = 0;
        for (let i = 1; i < posArr.length - 1; i++) {
            let leftDir = Cesium.Cartesian3.subtract(posArr[i], startPos, temptLeft);
            let rightDir = Cesium.Cartesian3.subtract(posArr[i + 1], startPos, temptRight);
            let crossValue = Cesium.Cartesian3.cross(leftDir, rightDir, new Cesium.Cartesian3());
            totalArea += Cesium.Cartesian3.magnitude(crossValue) / 2;
        }
        return totalArea;
    }
    private static isInPolygon = (position: Cesium.Cartesian3, positions: Cesium.Cartesian3[]) => {
        var nCross = 0;
        for (var i = 0; i < positions.length; i++) {
            var p1 = positions[i];
            var p2 = positions[(i + 1) % positions.length];
            if (p1.y == p2.y)
                continue;
            if (position.y < Math.min(p1.y, p2.y))
                continue;
            if (position.y >= Math.max(p1.y, p2.y))
                continue;
            var x = (position.y - p1.y) * (p2.x - p1.x) / (p2.y - p1.y) + p1.x;
            if (x > position.x)
                nCross++;
        }
        if (nCross % 2 == 1) {
            return true;
        }
        else {
            return false;
        }
    };
}

export interface IcomputeVolumeOptions {
    posArr: Cesium.Cartesian3[];
    basePlaneHeight?: number;
    sampleInterval?: number;
}

export interface IvolumeReusult {
    posArr: Cesium.Cartesian3[],
    sampleInterval: number,
    sampleHeight: number[],
    basePloygonArea: number,
    centerPos: Cesium.Cartesian3,
    projectPosArr: Cesium.Cartesian3[],
    cutVolume: number,
    fillVolume: number,
    plan: Cesium.Entity;
}