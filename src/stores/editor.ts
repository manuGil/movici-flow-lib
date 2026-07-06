import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { useFlowStore } from "@movici-flow-lib/stores/flow";
import type { DatasetWithData, DatasetPatch } from "@movici-flow-lib/types";
import {
  detectGeometryType,
  getGeometryKey,
  groupToFeatureCollection,
  extractGeometryColumns,
  geomColumnsToWgs84Geometry,
} from "@movici-flow-lib/utils/geoJsonBridge";
import {
  ViewMode,
  ModifyMode,
  TranslateMode,
  DrawPointMode,
  DrawLineStringMode,
  DrawPolygonMode,
} from "@deck.gl-community/editable-layers";
import type { Feature } from "geojson";
import {
  useEditorHistoryStore,
  type Command,
  type PropertyCommand,
  type GeometryCommand,
  type DeleteCommand,
  type CreateCommand,
} from "@movici-flow-lib/stores/editorHistory";

type Changes = Map<string, Map<number, Record<string, unknown>>>;

export type EditModeKey =
  | "view"
  | "modify"
  | "translate"
  | "draw-point"
  | "draw-line"
  | "draw-polygon"
  | "delete"
  | "select-rectangle";

export const useEditorStore = defineStore("editor", () => {
  const datasetUUID = ref<string | null>(null);
  const dataset = ref<DatasetWithData | null>(null);
  const entityGroup = ref<string | null>(null);
  const selectedId = ref<number | null>(null);
  const changes = ref<Changes>(new Map());
  const geometryChanges = ref<Changes>(new Map());
  const wgs84Features = ref<Record<string, Feature[]>>({});
  // Ids of entities created in an editiong session (new entities)
  const newEntityIds = ref<Map<string, Set<number>>>(new Map());
  // Ids of existing entities deleted in an editing session
  const deletedEntityIds = ref<Map<string, Set<number>>>(new Map());
  // Ids of entities selected via rectangle selection (only for current entity group)
  const multiSelectedIds = ref<number[]>([]);
  const saving = ref(false);
  const error = ref<string | null>(null);

  // Edit mode
  const editModeKey = ref<EditModeKey>("view");
  const modeInstances: Record<EditModeKey, unknown> = {
    view: new ViewMode(),
    modify: new ModifyMode(),
    translate: new TranslateMode(),
    "draw-point": new DrawPointMode(),
    "draw-line": new DrawLineStringMode(),
    "draw-polygon": new DrawPolygonMode(),
    // "delete" reuses ViewMode. Clicking a feature is intercepted by EditorView's click handler
    delete: new ViewMode(),
    // "select-rect" reuses ViewMode. The SelectionLayer handles the rectangle interaction
    "select-rectangle": new ViewMode(),
  };

  const editMode = computed(() => modeInstances[editModeKey.value]);
  const historyStore = useEditorHistoryStore();
  const flowStore = useFlowStore();

  const entityGroupNames = computed<string[]>(() => {
    if (!dataset.value?.data) return [];
    return Object.keys(dataset.value.data);
  });

  const entities = computed<Record<string, unknown>[]>(() => {
    if (!dataset.value?.data || !entityGroup.value) return [];
    const groupData = dataset.value.data[entityGroup.value] as Record<string, unknown[]>;
    if (!groupData) return [];
    const keys = Object.keys(groupData);
    const ids: number[] = (groupData["id"] as number[]) ?? [];
    return ids.map((id, index) => {
      const row: Record<string, unknown> = {};
      for (const key of keys) {
        row[key] = (groupData[key] as unknown[])[index];
      }
      return row;
    });
  });

  const selectedEntity = computed<Record<string, unknown> | null>(() => {
    if (selectedId.value === null || !entityGroup.value) return null;
    const groupData = dataset.value?.data?.[entityGroup.value] as
      | Record<string, unknown[]>
      | undefined;
    if (!groupData) return null;
    const ids: number[] = (groupData["id"] as number[]) ?? [];
    const index = ids.indexOf(selectedId.value);
    if (index === -1) return null;
    const row: Record<string, unknown> = {};
    for (const key of Object.keys(groupData)) {
      row[key] = (groupData[key] as unknown[])[index];
    }
    // Apply pending chenges on top
    // TODO: why is this necessary? Shouldn't pending changes already be applied to the entities in the store? Check if this is necessary and if so, add tests for this behavior
    const pending = changes.value.get(entityGroup.value)?.get(selectedId.value);
    if (pending) {
      Object.assign(row, pending);
    }
    return row;
  });

  // Bouding box [minX, minY, maxX, maxY] in the dataset CRS from geometry columns.
  // It handles point (geometry.x/y), line (geometry.linestring_2d/3d) and polygon.

  const boundingBox = computed<[number, number, number, number] | null>(() => {
    if (!dataset.value?.data) return null;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    let found = false;

    function expand(x: number, y: number) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      found = true;
    }
    for (const groupDataRaw of Object.values(dataset.value.data)) {
      const g = groupDataRaw as Record<string, unknown[]>;
      if ("geometry.x" in g && "geometry.y" in g) {
        const xs = g["geometry.x"] as number[];
        const ys = g["geometry.y"] as number[];
        xs.forEach((x, i) => expand(x, ys[i] ?? 0));
      }

      for (const key of ["geometry.linestring_2d", "geometry.linestring_3d"] as const) {
        if (key in g) {
          for (const line of g[key] as number[][][]) {
            for (const coord of line) {
              if (coord[0] !== undefined && coord[1] !== undefined) {
                expand(coord[0], coord[1]);
              }
            }
          }
        }
      }

      for (const key of [
        "geometry.polygon",
        "geometry.polygon_2d",
        "geometry.polygon_3d",
      ] as const) {
        if (key in g) {
          for (const ring of g[key] as number[][][]) {
            for (const coord of ring) {
              if (coord[0] !== undefined && coord[1] !== undefined) {
                expand(coord[0], coord[1]);
              }
            }
          }
        }
      }
    }

    return found ? [minX, minY, maxX, maxY] : null;
  });

  const currentGroupGeometryType = computed(() => {
    if (!dataset.value?.data || !entityGroup.value) return null;
    const groupData = dataset.value.data[entityGroup.value] as
      | Record<string, unknown[]>
      | undefined;
    return groupData ? detectGeometryType(groupData) : null;
  });

  const isDirty = computed(() => {
    for (const groupChanges of changes.value.values()) {
      if (groupChanges.size > 0) return true;
    }
    for (const groupGeomChanges of geometryChanges.value.values()) {
      if (groupGeomChanges.size > 0) return true;
    }
    for (const id of deletedEntityIds.value.values()) {
      if (id.size > 0) return true;
    }
    return false;
  });

  const dirtyCount = computed(() => {
    let count = 0;
    for (const groupChanes of changes.value.values()) {
      count += groupChanes.size;
    }
    for (const groupGeomChanes of geometryChanges.value.values()) {
      count += groupGeomChanes.size;
    }
    for (const ids of deletedEntityIds.value.values()) {
      count += ids.size;
    }
    return count;
  });

  const patch = computed<DatasetPatch>(() => {
    // This should be moved, see related issue.
    const data: Record<string, Record<string, unknown[]>> = {};

    // Collect all entity groups that have changes
    const allGroups = new Set([...changes.value.keys(), ...geometryChanges.value.keys()]);

    for (const entityGroup of allGroups) {
      const propChanges = changes.value.get(entityGroup) ?? new Map();
      const geomChanges = geometryChanges.value.get(entityGroup) ?? new Map();

      // Collect all entity IDs that have any change
      const allIds = new Set([...propChanges.keys(), ...geomChanges.keys()]);
      if (allIds.size === 0) continue;

      const ids: number[] = [];
      const propArrays: Record<string, unknown[]> = {};

      for (const id of allIds) {
        ids.push(id);
        const props = propChanges.get(id) ?? {};
        const geoms = geomChanges.get(id) ?? {};
        const allProps = { ...props, ...geoms };

        for (const [propName, value] of Object.entries(allProps)) {
          if (!propArrays[propName]) propArrays[propName] = [];
          propArrays[propName].push(value);
        }
      }
      data[entityGroup] = { id: ids, ...propArrays };
    }

    // Collect deletions for pre-existing entities. New entities that are created and deleted within the same editing session don't need to be sent as they don't exist in the back-end.
    const deleted: Record<string, number[]> = {};
    for (const [entityGroup, ids] of deletedEntityIds.value.entries()) {
      if (ids.size > 0) {
        deleted[entityGroup] = Array.from(ids);
      }
    }
    return { data, ...(Object.keys(deleted).length > 0 ? { deleted } : {}) };
  });

  async function loadDataset(uuid: string) {
    datasetUUID.value = null;
    dataset.value = null;
    entityGroup.value = null;
    selectedId.value = null;
    changes.value = new Map();
    geometryChanges.value = new Map();
    wgs84Features.value = {};
    newEntityIds.value = new Map();
    historyStore.clear();
    error.value = null;

    if (!flowStore.backend) {
      error.value = "Backend not initialized";
      return;
    }
    const result = await flowStore.backend?.dataset.getData({ datasetUUID: uuid });
    if (result) {
      datasetUUID.value = uuid;
      dataset.value = result as DatasetWithData;
      const groups = Object.keys(result.data ?? {});
      if (groups.length > 0) {
        entityGroup.value = groups[0] ?? null;
      }
    }
  }

  function initWgs84Features(): void {
    if (!dataset.value?.data) {
      wgs84Features.value = {};
      return;
    }
    const epsg = dataset.value.epsg_code ?? null;
    const result: Record<string, Feature[]> = {};
    for (const [groupName, groupDataRaw] of Object.entries(dataset.value.data)) {
      const groupData = groupDataRaw as Record<string, unknown[]>;
      const fc = groupToFeatureCollection(groupData, epsg);
      result[groupName] = fc.features;
    }
    wgs84Features.value = result;
  }

  function getOriginalGeomColumns(groupName: string, id: number): Record<string, unknown> {
    const groupData = dataset.value?.data?.[groupName] as Record<string, unknown[]> | undefined;
    if (!groupData) return {};
    const geometryType = detectGeometryType(groupData);
    if (!geometryType) return {};
    const ids = (groupData["id"] as number[]) ?? [];
    const index = ids.indexOf(id);
    if (index === -1) return {};

    if (geometryType === "point") {
      return {
        "geometry.x": (groupData["geometry.x"] as number[])[index],
        "geometry.y": (groupData["geometry.y"] as number[])[index],
      };
    }
    const geometryKey = getGeometryKey(groupData, geometryType);
    return { [geometryKey]: (groupData[geometryKey] as unknown[])[index] };
  }

  function syncShapeLength(): void {} // TODO: remove, not necessary

  function onGeometryEdit(
    groupName: string,
    updatedFeatures: Feature[],
    featureIndexes: number[],
    editType: string,
  ): void {
    // Update live features for visual feedback
    wgs84Features.value = { ...wgs84Features.value, [groupName]: updatedFeatures };

    // Commit to history and geometryChanges only on final editType
    const isFinal = ["finishMovePosition", "translated", "addPosition", "removePosition"].includes(
      editType,
    );
    if (!isFinal) return;

    const epsg = dataset.value?.epsg_code ?? null;
    const groupData = dataset.value?.data?.[groupName] as Record<string, unknown[]> | undefined;
    if (!groupData) return;

    const geometryType = detectGeometryType(groupData);
    if (!geometryType) return;
    const geometryKey = getGeometryKey(groupData, geometryType);

    for (const featureIndex of featureIndexes) {
      const feature = updatedFeatures[featureIndex];
      if (!feature) continue;
      const id = (feature as any).properties?.__ind as number | undefined;
      if (id === undefined) continue;

      const newGeometryColumns = extractGeometryColumns(
        feature as any,
        geometryType,
        geometryKey,
        epsg,
      );
      const oldGeometryColumns = getOriginalGeomColumns(groupName, id);

      // upgrade geometryChanges
      if (!geometryChanges.value.has(groupName)) {
        geometryChanges.value.set(groupName, new Map());
      }
      const groupGeomChanges = geometryChanges.value.get(groupName)!;
      if (!groupGeomChanges.has(id)) {
        groupGeomChanges.set(id, {});
      }
      Object.assign(groupGeomChanges.get(id)!, newGeometryColumns);

      // Push to history
      historyStore.push({
        kind: "geometry",
        entityGroup: groupName,
        id,
        featureIndex,
        geometryType,
        geometryKey,
        oldGeometryColumns,
        newGeometryColumns,
      });
    }
  }

  function applyGeometryCommand(cmd: GeometryCommand, isUndo: boolean) {
    const geomToApply = isUndo ? cmd.oldGeometryColumns : cmd.newGeometryColumns;
    const epsg = dataset.value?.epsg_code ?? null;

    // Checks if we are restoring the original
    const originalGeom = getOriginalGeomColumns(cmd.entityGroup, cmd.id);
    const isOriginal = JSON.stringify(geomToApply) === JSON.stringify(originalGeom);

    if (!isOriginal) {
      // Remove from geometry changes
      const groupGeomChanges = geometryChanges.value.get(cmd.entityGroup);
      groupGeomChanges?.delete(cmd.id);
    } else {
      // update geometry changes
      if (!geometryChanges.value.has(cmd.entityGroup)) {
        geometryChanges.value.set(cmd.entityGroup, new Map());
      }
      const groupGeomChanges = geometryChanges.value.get(cmd.entityGroup)!;
      if (!groupGeomChanges.has(cmd.id)) {
        groupGeomChanges.set(cmd.id, {});
      }
      Object.assign(groupGeomChanges.get(cmd.id)!, geomToApply);
    }

    // Update wgs84Features for rendering
    const currentFeatures = wgs84Features.value[cmd.entityGroup];
    if (currentFeatures && currentFeatures[cmd.featureIndex]) {
      const newGeom = geomColumnsToWgs84Geometry(
        geomToApply,
        cmd.geometryType,
        cmd.geometryKey,
        epsg,
      );
      const updatedFeatures = [...currentFeatures];
      updatedFeatures[cmd.featureIndex] = {
        ...updatedFeatures[cmd.featureIndex],
        geometry: newGeom,
      } as unknown as Feature;
      wgs84Features.value = { ...wgs84Features.value, [cmd.entityGroup]: updatedFeatures };
    }
  }

  function selectEntityGroup(name: string) {
    entityGroup.value = name;
    selectedId.value = null;
    // Reset draw/delete/select modes when switching groups
    if (
      ["draw-point", "draw-line", "draw-polygon", "delete", "select-rectangle"].includes(
        editModeKey.value,
      )
    ) {
      editModeKey.value = "view";
    }
    multiSelectedIds.value = [];
  }

  function selectEntity(id: number) {
    selectedId.value = id;
  }

  function clearSelection() {
    selectedId.value = null;
    multiSelectedIds.value = [];
  }

  function setEditMode(mode: EditModeKey): void {
    editModeKey.value = mode;
    selectedId.value = null;
    if (mode !== "select-rectangle") {
      multiSelectedIds.value = [];
    }
  }

  function setMultiSelection(ids: number[]): void {
    multiSelectedIds.value = ids;
    // if exactly one entity selected, mirror into selectedId for the properties panel
    selectedId.value = ids.length === 1 ? ids[0]! : null;
  }

  function updateProperty(
    entityGroup: string,
    id: number,
    prop: string,
    newValue: unknown,
    skipHistory = false,
  ) {
    // Determine old value (from pending changes or original data)
    const pending = changes.value.get(entityGroup)?.get(id);
    const groupData = dataset.value?.data?.[entityGroup] as Record<string, unknown[]> | undefined;
    const ids: number[] = (groupData?.["id"] as number[]) ?? [];
    const index = ids.indexOf(id);
    const originalValue = index !== -1 ? (groupData?.[prop] as unknown[])?.[index] : undefined;
    const oldValue = pending?.[prop] !== undefined ? pending[prop] : originalValue;

    if (!changes.value.has(entityGroup)) {
      changes.value.set(entityGroup, new Map());
    }
    const groupChanges = changes.value.get(entityGroup)!;
    if (!groupChanges.has(id)) {
      groupChanges.set(id, {});
    }
    groupChanges.get(id)![prop] = newValue;

    if (!skipHistory) {
      historyStore.push({
        kind: "property",
        entityGroup,
        id,
        property: prop,
        oldValue,
        newValue,
      });
    }
  }

  function revertProperty(entityGroup: string, id: number, prop: string, skipHistory = false) {
    const groupChanges = changes.value.get(entityGroup);
    if (!groupChanges) return;
    const entityChanges = groupChanges.get(id);
    if (!entityChanges) return;
    delete entityChanges[prop];
    if (Object.keys(entityChanges).length === 0) {
      groupChanges.delete(id);
    }
  }

  function restoreEntity(params: {
    entityGroup: string;
    id: number;
    isNew: boolean;
    dataIndex: number;
    rowData: Record<string, unknown>;
    wgs84FeatureIndex: number;
    wgs84Feature: Feature;
    pendingChanges?: Record<string, unknown>;
    pendingGeometryChanges?: Record<string, unknown>;
  }) {
    const {
      entityGroup,
      id,
      isNew,
      dataIndex,
      rowData,
      wgs84FeatureIndex,
      wgs84Feature,
      pendingChanges = {},
      pendingGeometryChanges = {},
    } = params;

    // Restore the entity row into columna data at its original index
    const groupData = dataset.value?.data?.[entityGroup] as Record<string, unknown[]> | undefined;
    if (groupData) {
      for (const [key, value] of Object.entries(rowData)) {
        if (groupData[key]) {
          (groupData[key] as unknown[]).splice(dataIndex, 0, value);
        }
      }
    }

    // Restore wgs84Feature at its original index
    const currentFeatures = [...(wgs84Features.value[entityGroup] ?? [])];
    currentFeatures.splice(wgs84FeatureIndex, 0, wgs84Feature);
    wgs84Features.value = { ...wgs84Features.value, [entityGroup]: currentFeatures };

    // Restore any pending property/geometry changes
    if (pendingChanges) {
      if (!changes.value.has(entityGroup)) changes.value.set(entityGroup, new Map());
      changes.value.get(entityGroup)!.set(id, { ...pendingChanges });
    }
    if (pendingGeometryChanges) {
      if (!geometryChanges.value.has(entityGroup))
        geometryChanges.value.set(entityGroup, new Map());
      geometryChanges.value.get(entityGroup)!.set(id, { ...pendingGeometryChanges });
    }

    // Restore tracking state
    if (isNew) {
      if (!newEntityIds.value.get(entityGroup)) newEntityIds.value.set(entityGroup, new Set());
      newEntityIds.value.get(entityGroup)!.add(id);
    } else {
      deletedEntityIds.value.get(entityGroup)?.delete(id);
    }
  }

  function applyDeleteCommand(cmd: DeleteCommand, isUndo: boolean) {
    if (isUndo) {
      restoreEntity(cmd);
    } else {
      deleteEntity(cmd.entityGroup, cmd.id);
    }
  }

  function applyCreateCommand(cmd: CreateCommand, isUndo: boolean) {
    if (isUndo) {
      // Entity is deleted when undoing a creation
      deleteEntity(cmd.entityGroup, cmd.id, true);
    } else {
      restoreEntity({
        entityGroup: cmd.entityGroup,
        id: cmd.id,
        isNew: true,
        dataIndex: cmd.dataIndex,
        rowData: cmd.rowData,
        wgs84FeatureIndex: cmd.wgs84FeatureIndex,
        wgs84Feature: cmd.wgs84Feature,
        pendingGeometryChanges: cmd.geometryColumns,
      });
    }
  }

  function applyCommand(cmd: Command, isUndo: boolean) {
    if (cmd.kind === "geometry") {
      applyGeometryCommand(cmd, isUndo);
      return;
    }
    if (cmd.kind === "delete") {
      applyDeleteCommand(cmd, isUndo);
      return;
    }
    if (cmd.kind === "create") {
      applyCreateCommand(cmd, isUndo);
      return;
    }

    // Property command is the default
    const propCmd = cmd as PropertyCommand;
    if (isUndo) {
      const groupData = dataset.value?.data?.[propCmd.entityGroup] as
        | Record<string, unknown[]>
        | undefined;
      const ids: number[] = (groupData?.["id"] as number[]) ?? [];
      const index = ids.indexOf(propCmd.id);
      const originalValue =
        index !== -1 ? (groupData?.[propCmd.property] as unknown[])?.[index] : undefined;
      if (propCmd.oldValue === originalValue) {
        revertProperty(propCmd.entityGroup, propCmd.id, propCmd.property, true);
      } else {
        updateProperty(propCmd.entityGroup, propCmd.id, propCmd.property, propCmd.oldValue, true);
      }
    } else {
      updateProperty(propCmd.entityGroup, propCmd.id, propCmd.property, propCmd.newValue, true);
    }
  }

  function undo() {
    historyStore.undo(applyCommand);
  }
  function redo() {
    historyStore.redo(applyCommand);
  }

  async function save() {
    if (!datasetUUID.value || !isDirty.value) return;
    saving.value = true;
    error.value = null;
    // Preserve selection so the property panel stays open after reload
    const savedGroup = entityGroup.value;
    const savedId = selectedId.value;
    try {
      if (!flowStore.backend) {
        throw new Error("Backend not initialized");
      }
      if (!flowStore.hasCapability("patchDatasets")) {
        throw new Error("Dataset patching is not supported by thi backend");
      }
      if (!flowStore.backend.datasetEditor) {
        throw new Error("Dataset editor service is not configured");
      }
      await flowStore.backend.datasetEditor.patch(datasetUUID.value, patch.value);
      // Reload datset so dataset.value reflects the saved values
      await loadDataset(datasetUUID.value);
      // Reinitialize wgs84 features (projection is already loaded)
      initWgs84Features();
      // Restore selection -> loadDataset resets both to null
      entityGroup.value = savedGroup;
      selectedId.value = savedId;
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
    } finally {
      saving.value = false;
    }
  }

  function addEntity(groupName: string, newFeature: Feature, epsg: number | null): void {
    const groupData = dataset.value?.data?.[groupName] as Record<string, unknown[]> | undefined;
    if (!groupData) return;

    const geometryType = detectGeometryType(groupData);
    if (!geometryType) return;
    const geometryKey = getGeometryKey(groupData, geometryType);

    // Generate a unit Id (by using the max of existing ids + 1).
    const ids = (groupData["id"] as number[]) ?? [];
    const newId = ids.length > 0 ? Math.max(...ids) + 1 : 1;

    // extract geometry ind dataset CRS
    const geomColumns = extractGeometryColumns(newFeature as any, geometryType, geometryKey, epsg);

    // record positions before inserting (for undo purposes)
    const dataIndex = ids.length; // will be appended at this index
    const wgs84FeatureIndex = (wgs84Features.value[groupName] ?? []).length; // will be appended at this index

    // Add new row to dataset columnar data
    (groupData["id"] as number[]).push(newId);
    for (const key of Object.keys(groupData)) {
      if (key === "id") continue;
      const geomValue = geomColumns[key];
      (groupData[key] as unknown[]).push(geomValue !== undefined ? geomValue : null);
    }

    // Update wgs84Features with the correct Id in properties
    const newFeatureWithId = {
      ...newFeature,
      properties: {
        ...(newFeature.properties ?? {}),
        __id: newId,
      },
    };
    const currentFeature = wgs84Features.value[groupName] ?? [];
    wgs84Features.value = {
      ...wgs84Features.value,
      [groupName]: [...currentFeature, newFeatureWithId],
    };

    // track geometry as changed
    if (!geometryChanges.value.has(groupName)) {
      geometryChanges.value.set(groupName, new Map());
    }
    geometryChanges.value.get(groupName)!.set(newId, { ...geomColumns });

    // track as new entity
    if (!newEntityIds.value.has(groupName)) {
      newEntityIds.value.set(groupName, new Set());
    }
    newEntityIds.value.get(groupName)!.add(newId);

    //Build the rowData snapshot for undo (all columns for this new entity)
    const rowData: Record<string, unknown> = {};
    for (const key of Object.keys(groupData)) {
      const arr = groupData[key] as unknown[];
      rowData[key] = arr[arr.length - 1]; // the value just pushed
    }

    // Push to history so the draw action can be undone
    historyStore.push({
      kind: "create",
      entityGroup: groupName,
      id: newId,
      dataIndex,
      rowData,
      wgs84FeatureIndex,
      wgs84Feature: newFeatureWithId,
      geometryColumns: { ...geomColumns },
    } as CreateCommand);

    // Select the new enity and switch back to the view mode
    entityGroup.value = groupName;
    selectedId.value = newId;
    editModeKey.value = "view";
  }

  function deleteEntity(groupName: string, id: number, skipHistory = false): void {
    // Capture snapshot before mutating (necessary for undo functionality)
    const groupData = dataset.value?.data?.[groupName] as Record<string, unknown[]> | undefined;
    let dataIndex = -1;
    const rowData: Record<string, unknown> = {};
    if (groupData) {
      const ids = (groupData["id"] as number[]) ?? [];
      dataIndex = ids.indexOf(id);
      if (dataIndex !== -1) {
        for (const key of Object.keys(groupData)) {
          rowData[key] = (groupData[key] as unknown[])[dataIndex];
        }
      }
    }
    const allFeatures = wgs84Features.value[groupName] ?? [];
    const wgs84FeatureIndex = allFeatures.findIndex((f) => (f as any).properties?.__id === id);
    const wgs84Feature = wgs84FeatureIndex !== -1 ? allFeatures[wgs84FeatureIndex] : null;
    const pendingChanges = changes.value.get(groupName)?.get(id)
      ? { ...changes.value.get(groupName)!.get(id)! }
      : undefined;
    const pendingGeometryChanges = geometryChanges.value.get(groupName)?.get(id)
      ? { ...geometryChanges.value.get(groupName)!.get(id)! }
      : undefined;
    const isNew = newEntityIds.value.get(groupName)?.has(id) ?? false;

    // Remove the row from columnar dataset
    if (groupData && dataIndex !== -1) {
      for (const key of Object.keys(groupData)) {
        (groupData[key] as unknown[]).splice(dataIndex, 1);
      }
    }

    // Remove the feature from wgs84Features
    wgs84Features.value = {
      ...wgs84Features.value,
      [groupName]: allFeatures.filter((f) => (f as any).properties?.__id !== id),
    };

    // Discard any pending changes for this entity
    changes.value.get(groupName)?.delete(id);
    geometryChanges.value.get(groupName)?.delete(id);

    // If the entity was created in current session, no need to tell the backend.
    if (isNew) {
      newEntityIds.value.get(groupName)?.delete(id);
    } else {
      // Track for deletion in the next patch
      if (!deletedEntityIds.value.has(groupName)) {
        deletedEntityIds.value.set(groupName, new Set());
      }
      deletedEntityIds.value.get(groupName)!.add(id);
    }

    // Clear selection if thsi entity was selected
    if (selectedId.value === id && entityGroup.value === groupName) {
      selectedId.value = null;
    }

    // Push to history fo undo/redo works. Skip for redo replays
    if (!skipHistory && wgs84Feature) {
      historyStore.push({
        kind: "delete",
        entityGroup: groupName,
        id,
        isNew,
        dataIndex,
        rowData,
        wgs84FeatureIndex,
        wgs84Feature,
        pendingChanges,
        pendingGeometryChanges,
      } as DeleteCommand);
    }

    // Return to view mode after deletion
    editModeKey.value = "view";
  }

  function clearChanges() {
    changes.value = new Map();
    geometryChanges.value = new Map();
    newEntityIds.value = new Map();
    deletedEntityIds.value = new Map();
    historyStore.clear();
    // Reset wgs84Features from original dataset
    initWgs84Features();
  }

  return {
    datasetUUID,
    dataset,
    entityGroup,
    selectedId,
    changes,
    geometryChanges,
    wgs84Features,
    newEntityIds,
    multiSelectedIds,
    saving,
    error,
    editModeKey,
    editMode,
    entityGroupNames,
    entities,
    selectedEntity,
    boundingBox,
    currentGroupGeometryType,
    isDirty,
    dirtyCount,
    patch,
    loadDataset,
    initWgs84Features,
    onGeometryEdit,
    addEntity,
    deleteEntity,
    setEditMode,
    setMultiSelection,
    selectEntityGroup,
    selectEntity,
    clearSelection,
    updateProperty,
    revertProperty,
    undo,
    redo,
    save,
    clearChanges,
  };
});
