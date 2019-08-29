import { Iexample } from "./iexample";

export class CustomeGeometry implements Iexample {
    title: string = "使用自定义几何体(非以地心为原点建模)"
    beInit?: boolean;
    init?(props: import("./iexample").IinitProps): void {

        let hwidth = 2.0;
        let hheigt = 2.0;
        let positions = new Float64Array([hwidth, hheigt, 0.0, -hwidth, hheigt, 0.0, -hwidth, -hheigt, 0.0, hwidth, -hheigt, 0.0]);
        let sts = new Float32Array([1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0]);
        let indices = new Uint16Array([0, 2, 1, 0, 3, 2]);

        let geometry = new Cesium.Geometry({
            attributes: {
                position: new Cesium.GeometryAttribute({
                    componentDatatype: Cesium.ComponentDatatype.DOUBLE,
                    componentsPerAttribute: 3,
                    values: positions
                }),
                st: new Cesium.GeometryAttribute({
                    componentDatatype: Cesium.ComponentDatatype.FLOAT,
                    componentsPerAttribute: 2,
                    values: sts
                })
            },
            indices: indices,
            primitiveType: Cesium.PrimitiveType.TRIANGLES,
            boundingSphere: Cesium.BoundingSphere.fromVertices(positions)
        });

        let pos = Cesium.Cartesian3.fromDegrees(121, 31, 100);
        let hpr = new Cesium.HeadingPitchRoll();
        let orientation = Cesium.Transforms.headingPitchRollQuaternion(pos, hpr);
        let modelToWorldMatrix = Cesium.Matrix4.fromTranslationQuaternionRotationScale(pos, orientation, new Cesium.Cartesian3(1, 1, 1));

        let instance = new Cesium.GeometryInstance({
            geometry: geometry,
            attributes: {
                color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.WHITE)
            },
            modelMatrix: modelToWorldMatrix,
        });

        props.viewer.scene.primitives.add(new Cesium.Primitive({
            geometryInstances: instance,
            modelMatrix: Cesium.Matrix4.IDENTITY,
            appearance: new Cesium.PerInstanceColorAppearance(),
            asynchronous: false,
        }));

        props.viewer.camera.lookAt(pos, new Cesium.HeadingPitchRange(-30, -90, 100));

    }
    update(props: import("./iexample").IupdateProps): void {
    }


}