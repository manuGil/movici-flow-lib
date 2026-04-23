import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useMainStore } from "@movici-flow-lib/stores/main";
import LocalDataService from "@movici-flow-lib/services/LocalDataService";
import type { DatasetPatch } from "@movici-flow-lib/api/requests/datasets"; // todo: create file
import type { DatasetWithData } from "@movici-flow-lib/types"; 
import { detectGeometryType, extractGeometryColumns, geomColumstoWgs84Geometry, computeLineStringLength } from '../utils/geoJsonBridge';
import { 
    ViewMode, 
    ModifyMode,
    TranslateMode,
    DrawPointMode, 
    DrawLineStringMode, 
    DrawPolygonMode,
} from "@deck.gl-community/editable-layers";
import type { Feature} from "geojson";
import {  
    useEditorHistoryStore, 
    type Command, 
    type PropertyCommand,
    type GeometryCommand, 
    type DeleteCommand, 
    type CreateCommand,
} from "@movici-flow-lib/stores/editorHistory";
import { 
    detectGeometryType, 
    getGeometryKey, 
    groupToFeatureCollection,
    extractGeometryColumns,
    geomColumstoWgs84Geometry, 
    computeLineStringLength, 

} from "@movici-flow-lib/utils/geoJsonBridge";

type Changes = Map<string, Map<number, Record<string, unknown>>>;

export type EditModeKey =
  | "view"
  | "modify"
  | "translate"
  | "draw-point"
  | "draw-line"
  | "draw-polygon"
  | "delete"
  | "select-rect";
  
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
        "select-rect": new ViewMode(),
    };

    const editMode = computed(() => modeInstances[editModeKey.value]);
    const historyStore = useEditorHistoryStore();

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
        const groupData = dataset.value?.data?.[entityGroup.value] as Record<string, unknown[]> | undefined;
        if (!groupData) return null;
        const ids: number[] = (groupData["id"] as number[]) ?? [];
        const index = ids.indexOf(selectedId.value);
        if (index === - 1) return null;
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

            for (const key of ["geometry.polygon", "geometry.polygon_2d", "geometry.polygon_3d"] as const) {
                if (key in g) {
                    for (const ring in g[key] as number[][][]) {
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
        const groupData = dataset.value.data[entityGroup.value] as Record<string, unknown[]> | undefined;
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

    const patch = computed<DatasetPatch>(() => { // This should be moved, see related issue.
        const data: Record<string, Record<string, unknown[]>> = {};
        
        // Collect all entity groups that have changes
        const allGroups = new Set([...changes.value.keys(), ...geometryChanges.value.keys()]);

        for (const group of allGroups) {
            const propChanges = changes.value.get(group) ?? new Map();
            const geomChanges = geometryChanges.value.get(group) ?? new Map();

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
            data[group] = { id: ids, ...propArrays };
        }

        // Collect deletions for pre-existing entities. New entities that are created and deleted within the same editing session don't need to be sent as they don't exist in the back-end.
        const deleted: Record<string, number[]> = {};
        for (const [group, ids] of deletedEntityIds.value.entries()) {
            if (ids.size > 0) {
                deleted[group] = Array.from(ids);
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

        const mainStore = useMainStore();
        const service = new LocalDataService(mainStore.client);
        const result = await service.getData({ datasetUUID: uuid });
        if (result) {
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
    };

    function getOriginalGeomColumns(groupName: string, id: number): Record<string, unknown> {
        const groupData = dataset.value?.data?.[groupName] as Record<string, unknown[]> | undefined;
        if (!groupData) return {};
        const geomType = detectGeometryType(groupData);
        if (!geomType) return {};
        const ids = (groupData["id"] as number[]) ?? [];
        const index = ids.indexOf(id);
        if (index === -1) return {};

        if (geomType === "point") {
            return {
                "geometry.x": (groupData[
                    "geometry.x"] as number[])[index],
                "geometry.y": (groupData["geometry.y"] as number[])[index],
            }
        }
        const geomKey = getGeometryKey(groupData, geomType);
        return { [geomKey]: (groupData[geomKey] as unknown[])[index] };
    };

    function syncShapeLength(): void { }; // TODO: remove, not necessary
    
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
        
        const geomType = detectGeometryType(groupData);
        if (!geomType) return;
        const geomKey = getGeometryKey(groupData, geomType);

        for (const featureIndex of featureIndexes) {
            const feature = updatedFeatures[featureIndex];
            if (!feature) continue;
            const id = (feature as any).properties?.__ind as number | undefined;
            if (id === undefined) continue;

            const newGeomColumns = extractGeometryColumns(feature as any, geomType, geomKey, epsg);
            const oldGeomColumns = getOriginalGeomColumns(groupName, id);

            // upgrade geometryChanges
            if (!geometryChanges.value.has(groupName)) {
                geometryChanges.value.set(groupName, new Map())
            }
            const groupGeomChanges = geometryChanges.value.get(groupName)!;
            if (!groupGeomChanges.has(id)) {
                groupGeomChanges.set(id, {});
            }
            Object.assign(groupGeomChanges.get(id)!, newGeomColumns);

            // Push to history
            historyStore.push({
                kind: "geometry",
                entityGroup: groupName,
                id,
                featureIndex,
                geomType,
                geomKey,
                oldGeomColumns,
                newGeomColumns,
            });

        }
    };

    function applyGeometryCommand(cmd: GeometryCommand, isUndo: boolean) {
        const geomToApply = isUndo ? cmd.oldGeomColumns : cmd.newGeomColumns;
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
            Object.assign(groupGeomChanges.get(cmd.id)!, geomToApply)
        }

        // Update wgs84Features for rendering
        const currentFeatures = wgs84Features.value[cmd.entityGroup];
        if (currentFeatures && currentFeatures[cmd.featureIndex]) {
            const newGeom = geomColumnsToWgs84Geometry(geomToApply, cmd.geomType, cmd.geomKey, epsg);
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
        selectedId.value = null,
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
        selectedId.value = ids.length === 1 ? ids[0] : null;
    }

    function updateProperty(
        group: string,
        id: number,
        prop: string,
        newValue: unknown,
        skipHistory = false,
    ) {
        // Determine old value (from pending changes or original data)
        const pending = changes.value.get(group)?.get(id);
        const groupData = dataset.value?.data?.[group] as Record<string, unknown[]> | undefined;
        const ids: number[] = (groupData?.["id"] as number[]) ?? [];
        const index = ids.indexOf(id);
        const originalValue = index !== -1 ? (groupData?.[prop] as unknown[])?.[index] : undefined;
        const oldValue = pending?.[prop] !== undefined ? pending[prop] : originalValue;

        if (!changes.value.has(group)) {
            changes.value.set(group, new Map());
        }
        const groupChanges = changes.value.get(group)!;
        if (!groupChanges.has(id)) {
            groupChanges.set(id, {});
        }
        groupChanges.get(id)![prop] = newValue;

        if (!skipHistory) {
            historyStore.push({
                kind: "property",
                entityGroup: group,
                id,
                property: prop,
                oldValue,
                newValue
            }
            );
        }
    }

    function reverProperty(group: string, id: number, prop: string, skipHistory = false
    ) {
        const groupChanges = changes.value.get(group);
        if (!groupChanges) return;
        const entityChanges = groupChanges.get(id);
        if (!entityChanges) return;
        delete entityChanges[prop];
        if (Object.keys(entityChanges).length === 0) {
            groupChanges.delete(id);
        }
    }

    // TODO: missin code


    function applyDeleteCommand(cmd: DeleteCommand, isUndo: boolean) {
        if (isUndo) {
            restoreEntity(cmd);
        } else {
            deletedEntity(cmd.entityGroup, cmd.id, true)
         }
    }

    // TODO: CONTINUE HERE


 });