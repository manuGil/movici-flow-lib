
// TODO: Handle transformatios to GeoJson in the front-end, API must provide data in Movici's format. 

import {
    transform, 
    reverseTransform, 
    transformArray, 
    reverseTransformArray, 
    determineCRS
} from '../crs';

import type { Feature, FeatureCollection } from 'geojson';

export type { Feature, FeatureCollection };
export type GeometryType = "point" | "linestring" | "polygon";

export function detectGeometryType(): GeometryType | null {
    return null; // TODO: Implement geometry type detection based on the provided data
};
 
export function getGeometryKey(): string { 
    return ""; // TODO: Implement logic to determine the geometry key based on the provided data
}

export function extractGeometryColumns(): Record<string, unknown> {
    return {}; // TODO: Implement logic to extract geometry columns from the provided data
}

export function computeLineStringLength(coords: number[][]): number {
    return 0; // TODO: Implement logic to compute the length of a LineString geometry. Check with Pelle if this is needed in the front-end or if it can be computed in the back-end and provided as a property of the feature.
}

export function geomColumstoWgs84Geometry(): any {
    return {}; // TODO: Implement logic to transform geometry columns to WGS84 geometry. This will likely involve using the transform function from the crs module, and determining the source CRS using the determineCRS function.
}
