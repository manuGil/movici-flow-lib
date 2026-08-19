/*
A store to keep tack changes to a dataset during editing. Enables undo and redo 
on the dataset editor.
*/
import { defineStore } from "pinia";
import { ref } from "vue";
import type { GeometryType } from "@movici-flow-lib/utils/geoJsonBridge";
import type { Feature } from "geojson";

export interface UpdatePropertyCommand {
  kind: "property";
  entityGroup: string;
  id: number;
  property: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface GeometryCommand {
  kind: "geometry";
  entityGroup: string;
  id: number;
  geometryType: GeometryType;
  geometryKey: string;
  oldGeometryColumns: Record<string, unknown>;
  newGeometryColumns: Record<string, unknown>;
}

export interface DeleteCommand {
  kind: "delete";
  entityGroup: string;
  id: number;
  isNew: boolean; // distinguishes between deleting an existing entity and deleting a newly created entity that hasn't been saved to the back-end yet
  dataIndex: number;
  rowData: Record<string, unknown>;
  wgs84Feature: Feature | null;
  pendingChanges: Record<string, unknown> | undefined;
  pendingGeometryChanges: Record<string, unknown> | undefined;
}

export interface CreateCommand {
  kind: "create";
  entityGroup: string;
  id: number;
  dataIndex: number;
  rowData: Record<string, unknown>;
  wgs84Feature: Feature;
  geometryColumns: Record<string, unknown>;
}

export type Command = UpdatePropertyCommand | GeometryCommand | DeleteCommand | CreateCommand;

export const useEditorHistoryStore = defineStore("editorHistory", () => {
  const undoStack = ref<Command[]>([]);
  const redoStack = ref<Command[]>([]);

  function push(cmd: Command) {
    undoStack.value.push(cmd);
    redoStack.value = []; // clear redo stack on new action
  }

  function undo(apply: (cmd: Command) => void) {
    const cmd = undoStack.value.pop();
    if (!cmd) return;
    apply(cmd);
    redoStack.value.push(cmd);
  }

  function redo(apply: (cmd: Command) => void) {
    const cmd = redoStack.value.pop();
    if (!cmd) return;
    apply(cmd);
    undoStack.value.push(cmd);
  }

  function clear() {
    undoStack.value = [];
    redoStack.value = [];
  }

  return {
    undoStack,
    redoStack,
    push,
    undo,
    redo,
    clear,
  };
});
