import type { PickingInfo } from "@deck.gl/core";
import type { Feature } from "geojson";
import { computed, shallowRef, watch } from "vue";
import { useEditorStore } from "../stores/editor";
import { isMetricCRS, measureFeature, type Measurement } from "../utils/measure";

export interface MeasureTarget {
  groupName: string;
  id: number;
  pickInfo: PickingInfo; // used by DynamicDataView to place the popup
}

const MEASURABLE_TYPES = ["LineString", "Polygon"];

export function useMeasureTool() {
  const store = useEditorStore();
  const target = shallowRef<MeasureTarget | null>(null);

  function clear() {
    target.value = null;
  }

  function onClick(pickInfo?: PickingInfo) {
    const feature = pickInfo?.object as Feature | undefined;
    const id = feature?.properties?.__id as number | undefined;
    const groupName = pickInfo?.layer?.id.match(/^editable-(.+)$/)?.[1];
    if (
      !pickInfo ||
      id === undefined ||
      !groupName ||
      !MEASURABLE_TYPES.includes(feature?.geometry?.type ?? "")
    ) {
      return clear(); //
    }
    target.value = { groupName, id, pickInfo };
  }

  const measurement = computed<Measurement | null>(() => {
    const t = target.value;
    const crs = store.dataset?.epsg_code;
    if (!t || !isMetricCRS(crs) || !store.isGroupVisible(t.groupName)) return null;
    const feature = store.wgs84Features[t.groupName]?.find((f) => f.properties?.__id === t.id);
    if (!feature) return null;
    return measureFeature(feature, crs);
  });

  watch(measurement, (m) => {
    if (!m) clear();
  });
  // Leaving the tool  or reloading a dataset closes the popup
  watch(
    () => store.editModeKey,
    (mode) => {
      if (mode !== "measure") clear();
    },
  );
  watch(() => store.datasetUUID, clear);

  return { target, measurement, onClick, clear };
}
