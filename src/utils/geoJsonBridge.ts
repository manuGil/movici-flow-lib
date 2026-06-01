// TODO: Handle transformatios to GeoJson in the front-end, API must provide data in Movici's format.

import {
  transform,
  reverseTransform,
  transformArray,
  reverseTransformArray,
  determineCRS,
} from "../crs";

import type { Feature, FeatureCollection } from "geojson";

export type { Feature, FeatureCollection };
export type GeometryType = "point" | "linestring" | "polygon";

export function detectGeometryType(groupData: Record<string, unknown[]>): GeometryType | null {
  if ("geometry.x" in groupData && "geometry.y" in groupData) {
    return "point";
  }
  if ("geometry.linestring_2d" in groupData || "geometry.linestring_3d" in groupData) {
    return "linestring";
  }
  if (
    "geometry.polygon" in groupData ||
    "geometry.polygon_2d" in groupData ||
    "geometry.polygon_3d" in groupData
  ) {
    return "polygon";
  }
  return null; // No geometry columns detected
}

export function getGeometryKey(
  groupData: Record<string, unknown[]>,
  geomType: GeometryType,
): string {
  // point
  if (geomType === "point") {
    return "geometry.x";
  }
  // linestring
  if (geomType === "linestring") {
    if ("geometry.linestring_2d" in groupData) return "geometry.linestring_2d";
    return "geometry.linestring_3d";
  }
  // polygon
  if ("geometry.polygon" in groupData) return "geometry.polygon";
  if ("geometry.polygon_2d" in groupData) return "geometry.polygon_2d";
  return "geometry.polygon_3d";
}

export function groupToFeatureCollection(
  groupData: Record<string, unknown[]>,
  epsg: number | null,
): FeatureCollection {
  const geomType = detectGeometryType(groupData);
  const ids = (groupData["id"] as unknown[]) ?? [];
  const crs = determineCRS(epsg);

  //geometry property keys
  const geometryKey = new Set([
    "geometry.x",
    "geometry.y",
    "geometry.linestring_2d",
    "geometry.linestring_3d",
    "geometry.polygon",
    "geometry.polygon_2d",
    "geometry.polygon_3d",
  ]);

  const propKey = Object.keys(groupData).filter((k) => !geometryKey.has(k));

  // TODO: Continue here: REVIEW THE SYNTAX
  const features: Feature[] = ids.map((id, index) => {
    // Build properties
    const properties: Record<string, unknown> = { __id: id };
    for (const key of propKey) {
      properties[key] = (groupData[key] as unknown[])[index];
    }
    // Build geometry
    let geometry: any = null;

    if (geomType === "point") {
      const x = (groupData["geometry.x"] as number[])[index] ?? 0;
      const y = (groupData["geometry.y"] as number[])[index] ?? 0;
      const [lon, lat] = transform([x, y], crs);
      geometry = {
        type: "Point",
        coordinates: [lon, lat],
      };
    } else if (geomType === "linestring") {
      const geomKey = getGeometryKey(groupData, geomType);
      const line = (groupData[geomKey] as number[][][])[index];
      const transformed = transformArray(line as [number, number][], crs);
      geometry = { type: "LineString", coordinates: transformed.map(([lon, lat]) => [lon, lat]) };
    } else if (geomType === "polygon") {
      const geomKey = getGeometryKey(groupData, geomType);
      const ring = (groupData[geomKey] as number[][][])[index] ?? [];
      const transformed = transformArray(ring as [number, number][], crs);
      geometry = { type: "Polygon", coordinates: [transformed.map(([lon, lat]) => [lon, lat])] };
    }

    return {
      type: "Feature",
      geometry,
      properties,
    } as Feature;
  });

  return { type: "FeatureCollection", features };
}

export function extractGeometryColumns() {}

export function computeLineStringLength(coords: number[][]): number {
  return 0; // TODO: Implement logic to compute the length of a LineString geometry. Check with Pelle if this is needed in the front-end or if it can be computed in the back-end and provided as a property of the feature.
}

export function geomColumstoWgs84Geometry(): any {
  return {}; // TODO: Implement logic to transform geometry columns to WGS84 geometry. This will likely involve using the transform function from the crs module, and determining the source CRS using the determineCRS function.
}
