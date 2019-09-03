import Axios from "axios"
import React from "react";
import { CesiumMap } from "../lib/map";

export class Adjust3dtilesHeight extends React.Component {
    static title: string = "调整3dtiles高度";

    handleViewerLoaded(viewer: Cesium.Viewer) {
        let modelPath = "http://cloudv2bucket.oss-cn-shanghai.aliyuncs.com/185/1254/resultCC/Production_1.json"
        Axios.get(modelPath).then((data) => {
            let res = data.data as any;
            var modelSphere = res.root.boundingVolume.sphere;
            const boundingSphere = new Cesium.BoundingSphere(new Cesium.Cartesian3(modelSphere[0], modelSphere[1], modelSphere[2]), modelSphere[3]);//用zyx及R来调用
            return boundingSphere;

        }).then((boundingSphere) => {
            let tileset = viewer.scene.primitives.add(new Cesium.Cesium3DTileset({
                url: modelPath,
                maximumScreenSpaceError: 0.8,
                maximumNumberOfLoadedTiles: 100
            }));
            //----------------调整高度
            let heightOffset = -30;

            let surfaceNormal = Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(boundingSphere.center);
            let translationb = Cesium.Cartesian3.multiplyByScalar(surfaceNormal, heightOffset, new Cesium.Cartesian3());
            tileset.modelMatrix = Cesium.Matrix4.fromTranslation(translationb);

            viewer.zoomTo(tileset);
        });
    }

    render() {
        return (
            <CesiumMap id={Adjust3dtilesHeight.title} onViewerLoaded={(viewer) => { this.handleViewerLoaded(viewer) }} />
        )
    }
}


