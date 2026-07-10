/* An utility to do data transformations that enable editing datasets.
The dataset editor requires data to be in GeoJsonData.
*/

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

export function extractGeometryColumns(
  feature: Feature,
  geomType: GeometryType,
  geomKey: string,
  epsg: number | null,
): Record<string, unknown> {
  const crs = determineCRS(epsg);
  const geom = (feature as any).geometry;

  if (geomType === "point") {
    const [lon, lat] = geom?.coordinates ?? [0, 0];
    const [x, y] = reverseTransform([lon, lat], crs);
    return { "geometry.x": x, "geometry.y": y };
  }

  if (geomType === "linestring") {
    const coords: [number, number][] = geom?.coordinates ?? [];
    const transformed = reverseTransformArray(coords, crs);
    return { [geomKey]: transformed.map(([x, y]) => [x, y]) };
  }

  // Polygon case: GeoJSON stores polygons as [[ring]], for now we are keeping ONLY outter ring. FIXME:
  const rings: [number, number][][] = geom?.coordinates ?? [];
  const outerRing: [number, number][] = rings[0] ?? [];
  const transformed = reverseTransformArray(outerRing, crs);
  return { [geomKey]: transformed.map(([x, y]) => [x, y]) };
}

export function computeLineStringLength(coords: number[][]): number {
  return 0; // TODO: See GH issues
}

export function geomColumnsToWgs84Geometry(
  geomColumns: Record<string, unknown>,
  geomType: GeometryType,
  geomKey: string,
  epsg: number | null,
): any {
  const crs = determineCRS(epsg);

  if (geomType == "point") {
    const x = geomColumns["geometry.x"] as number;
    const y = geomColumns["geometry.y"] as number;
    const [lon, lat] = transform([x, y], crs);
    return { type: "Point", coordinates: [lon, lat] };
  }

  if (geomType == "linestring") {
    const line = geomColumns[geomKey] as number[][];
    const transformed = transformArray(line as [number, number][], crs);
    return { type: "LineString", coordinates: transformed.map(([lon, lat]) => [lon, lat]) };
  }

  // Polygon case
  const ring = geomColumns[geomKey] as number[][];
  const transformed = transformArray(ring as [number, number][], crs);
  return { type: "Polygon", coordinates: [transformed.map(([lon, lat]) => [lon, lat])] }; // TODO: Implement logic to transform geometry columns to WGS84 geometry. This will likely involve using the transform function from the crs module, and determining the source CRS using the determineCRS function.
}
