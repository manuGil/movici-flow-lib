<template>
  <nav class="editor-toolbar is-flex is-align-items-center px-4 py-2">
    <span v-if="store.dirtyCount > 0" class="is-size-7 has-text-warning-dark mr-3">
      {{ store.dirtyCount }} unsaved change{{ store.dirtyCount !== 1 ? "s" : "" }}
    </span>
    <o-button
      icon-left="plus-square"
      icon-pack="fas"
      size="small"
      variant="dark"
      class="mr-1"
      @click=""
      title="Add attribute"
    >
    </o-button>
    <o-button
      icon-left="object-group"
      icon-pack="far"
      size="small"
      variant="dark"
      class="mr-1"
      @click=""
      title="New entity group"
    >
    </o-button>
    <o-button
      icon-left="undo"
      icon-pack="fas"
      size="small"
      variant="dark"
      class="mr-1"
      :disabled="historyStore.undoStack.length === 0"
      @click="store.undo()"
      title="Undo"
    >
    </o-button>

    <o-button
      icon-left="redo"
      icon-pack="fas"
      size="small"
      variant="dark"
      class="mr-3"
      :disabled="historyStore.redoStack.length === 0"
      @click="store.redo()"
      title="Redo"
    >
    </o-button>

    <o-button
      icon-left="save"
      icon-pack="fas"
      size="small"
      variant="primary"
      :disabled="!store.isDirty || store.saving"
      @click="onSave"
      title="Save"
    >
    </o-button>
  </nav>
</template>

<script setup lang="ts">
import { useEditorStore } from "@movici-flow-lib/stores/editor";
import { useEditorHistoryStore } from "@movici-flow-lib/stores/editorHistory";
import { useDialog } from "@movici-flow-lib/baseComposables/useDialog";
import { ref, computed } from "vue";
import type { GeometryType } from "@movici-flow-lib/utils/geoJsonBridge";

const store = useEditorStore();
const historyStore = useEditorHistoryStore();
const { openDialog } = useDialog();

function onSave() {
  const emptied = store.groupsToBeEmptied;
  if (!emptied.length) return void store.save();

  openDialog({
    title: "Delete entity group?",
    message:
      `Saving will delete all entities from ${emptied.map((n) => `'${n}'`).join(", ")} group. ` +
      `It will also delete the emptied entity group. ` +
      `This cannot be undone.`,
    variant: "danger",
    hasIcon: true,
    cancelText: "Cancel",
    confirmButtonText: "Yes. Save",
    onConfirm: () => store.save(),
  });
}

function onClose() {
  return null;
}

const newGroupName = ref("");
const newGroupGeometry = ref<GeometryType>("point");
const addGroupError = ref<string | null>(null);

const canAddGroup = computed(() => !!store.dataset?.data && newGroupName.value.trim().length > 0);

function onAddEntityGroup() {
  if (!canAddGroup.value) return;
  const name = newGroupName.value.trim();
  if (store.addEntityGroup(name, newGroupGeometry.value)) {
    newGroupName.value = "";
    addGroupError.value = null;
  } else {
    addGroupError.value = `Cannot add entity group '${name}': it already exists`;
  }
}

function onNewEntityGroup() {}
</script>

<style scoped lang="scss">
.editor-toolbar {
  background: white;
  border-bottom: 1px solid $grey-lighter;
  height: 52px;
  flex-shrink: 0;

  .dataset-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 400px;
  }
}
</style>
