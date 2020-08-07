import React, { useState, useEffect } from "react";
import { CesiumMap } from "@/lib";
import { LineMeasureComp } from "@/lib/components/measureTools/lineMeasureComp";

export default class LineMeasureDemo extends React.Component {
    state = {
        viewer: null
    }
    render() {
        return (
            <CesiumMap onViewerLoaded={(viewer) => {
                this.setState({ viewer });
                this.handleViewerLoaded(viewer);
            }} >
                {
                    this.state.viewer ? <LineMeasureComp viewer={this.state.viewer} showSwitch={true} /> : null
                }
            </CesiumMap>
        )
    }

    private handleViewerLoaded(viewer: Cesium.Viewer) {
        let modelPath = Cesium.IonResource.fromAssetId(17732);
        let tileset = viewer.scene.primitives.add(
            new Cesium.Cesium3DTileset({
                url: modelPath,
                maximumScreenSpaceError: 0.8,
                maximumNumberOfLoadedTiles: 100,
            })
        ) as Cesium.Cesium3DTileset;

        viewer.zoomTo(tileset);
    }
}
