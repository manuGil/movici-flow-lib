<template>
  <nav class="editor-toolbar is-flex is-align-items-center px-4 py-2">
    <span v-if="store.dirtyCount > 0" class="dirty-count is-size-7 has-text-warning mr-3">
      {{ store.dirtyCount }} unsaved change{{ store.dirtyCount !== 1 ? "s" : "" }}
    </span>
    <div>
      <o-button
        icon-left="plus-square"
        icon-pack="far"
        size="small"
        class="tool-button mr-2"
        :disabled="!store.entityGroup"
        @click="onNewAttribute()"
        title="Add attribute"
      >
      </o-button>
      <o-button
        icon-left="object-group"
        icon-pack="far"
        size="small"
        class="tool-button mr-3"
        @click="onNewEntityGroup()"
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
        class="mr-3"
        variant="primary"
        :disabled="!store.isDirty || store.saving"
        @click="onSave"
        title="Save"
      >
      </o-button>
    </div>
    <o-field horizontal nowrap size="small" :label="'Entity group:'" label-class="is-size-7">
      <o-select
        v-model="selectedGroup"
        size="small"
        rounded
        :disabled="!store.entityGroupNames.length"
        placeholder="Select a group to edit"
      >
        <option v-for="name in store.entityGroupNames" :key="name" :value="name">
          {{ name }}
        </option>
      </o-select>
    </o-field>
  </nav>
</template>

<script setup lang="ts">
import type { Component } from "vue";
import { computed } from "vue";
import { useEditorStore } from "@movici-flow-lib/stores/editor";
import { useEditorHistoryStore } from "@movici-flow-lib/stores/editorHistory";
import { useDialog } from "@movici-flow-lib/baseComposables/useDialog";
import { useProgrammatic } from "@oruga-ui/oruga-next";
import NewAttributeTool from "./NewAttributeTool.vue";
import NewEntityGroupTool from "./NewEntityGroupTool.vue";

const store = useEditorStore();
const historyStore = useEditorHistoryStore();
const { openDialog } = useDialog();

store.entityGroupNames;

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

const { oruga } = useProgrammatic();

function openEditorTool(component: Component, props?: Record<string, unknown>) {
  oruga.modal.open({
    component,
    props,
    width: "max-content",
    trapFocus: false,
    canCancel: ["escape", "outside"],
  });
}

function onNewEntityGroup() {
  openEditorTool(NewEntityGroupTool);
}

function onNewAttribute() {
  if (!store.entityGroup) return;
  openEditorTool(NewAttributeTool, { entityGroup: store.entityGroup });
}

const selectedGroup = computed({
  get: () => store.entityGroup,
  set: (val: string | null) => {
    if (val) store.selectEntityGroup(val);
  },
});
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

  .dirty-count {
    order: 1;
    margin-left: auto;
  }
}
.tool-button {
  :deep(.button-wrapper) {
    align-items: center;
  }
  :deep(.icon i) {
    font-size: 1.1rem;
    line-height: 1;
  }
  border-color: $green;
  background-color: rgba($green, 0.1);
  color: $green;
  &:hover {
    background-color: rgba($green, 0.3);
  }
}
</style>
