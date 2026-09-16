<template>
  <WidgetContainer
    class="property-sidebar"
    collapsable
    :collapsed="sidebar.collapsed.value"
    @update:collapsed="sidebar.setCollapsed"
  >
    <template #collapse-title="{ collapsed }">
      <div class="is-flex is-flex-direction-row-reverse is-align-items-center is-clickable">
        <o-icon
          :title="collapes ? 'Show property editor' : 'Hide property editor'"
          class="collapsed-icon"
          pack="far"
          :icon="collapsed ? 'edit' : 'minus-square'"
        />

        <div class="is-flex-grow-1" v-show="!collapsed">
          <p class="label mb-0">{{ groupLabel || "Property Editor" }}</p>
          <p class="is-size-7 has-text-grey">
            {{ selectionLabel }}
            <span v-if="modifiedCount > 0" class="has-text-warning-dark ml-2">
              ({{ modifiedCount }} modified)
            </span>
          </p>
        </div>
      </div>
    </template>
    <template #collapse-content>
      <div class="sidebar-content mt-2">
        <PropertyEditor
          :entity="store.selectedEntity"
          :entity-group="store.entityGroup"
          :attributes="attributes"
          :selected-ids="store.selectedIds"
          :general-enums="generalEnums"
          :enum-names="enumNames"
          @change="onPropertyChange"
          @delete-attribute="onDeleteAttribute"
        />
      </div>
    </template>
  </WidgetContainer>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useEditorStore } from "@movici-flow-lib/stores/editor";
import { useDialog } from "@movici-flow-lib/baseComposables/useDialog";
import { useEditorSidebar } from "@movici-flow-lib/composables/useEditorSidebar";
import PropertyEditor from "./PropertyEditor.vue";
import { snakeToFriendly } from "@movici-flow-lib/utils/filters.ts";

const store = useEditorStore();
const sidebar = useEditorSidebar();
const { openDialog } = useDialog();

const groupLabel = computed(() => snakeToFriendly(store.entityGroup));

const attributes = computed<string[]>(() => {
  const group = store.entityGroup;
  if (!group) return [];
  const groupData = store.dataset?.data?.[group] as Record<string, unknown[]> | undefined;
  if (!groupData) return [];
  return Object.keys(groupData).filter((key) => !store.isAttributeDeleted(group, key));
});

const selectionLabel = computed(
  () => `${store.selectedIds.length} of ${entityCount.value} selected`,
);

function onPropertyChange(prop: string, value: unknown) {
  if (!store.entityGroup || !store.selectedIds.length) return;
  store.updatePropertyForIds(store.entityGroup, store.selectedIds, prop, value);
}

function onDeleteAttribute(prop: string) {
  const group = store.entityGroup;
  if (!group) return;
  openDialog({
    title: "Delete attribute?",
    message:
      `Attribute '${prop}' will be removed from entity group '${group}'. ` +
      `You can undo this until the datase is saved.`,
    variant: "danger",
    hasIcon: true,
    confirmButtonText: "Yes. Delete",
    onConfirm: () => store.deleteAttribute(group, prop),
  });
}

const entityCount = computed(() => {
  if (!store.dataset?.data || !store.entityGroup) return 0;
  const groupData = store.dataset.data[store.entityGroup] as Record<string, unknown[]> | undefined;
  return (groupData?.["id"] as unknown[])?.length ?? 0;
});

const modifiedCount = computed(() => {
  if (!store.entityGroup) return 0;
  return store.changes.get(store.entityGroup)?.size ?? 0;
});

const generalEnums = computed<Record<string, string[]>>(() => {
  const g = store.dataset?.general as Record<string, unknown> | undefined;
  // Accept "enums" as a lenient fallback
  const enums = (g?.["enum"] ?? g?.["enums"]) as Record<string, string[]> | undefined;
  return enums ?? {};
});

const enumNames = computed<Record<string, string>>(() => {
  // enum_name mapping lives in the dataset
  // summary, which the editor doesn't load.
  // We apply a Best-effort convention:
  // an attribute maps to the enum named after its last segment, e.g.
  // "operational.power_source" -> general.enum["power_source"]
  const result: Record<string, string> = {};
  if (!store.entityGroup) return result;
  for (const key of attributes.value) {
    const suffix = key.split(".").pop() ?? key;
    if (generalEnums.value[suffix]) {
      result[key] = suffix;
    }
  }
  return result;
});
</script>

<style scoped lang="scss">
.property-sidebar {
  width: 360px;
}

.sidebar-header {
  border-bottom: 1px solid $grey-lighter;
  flex-shrink: 0;
}
.sidebar-content {
  max-height: 55vh;
  overflow-y: auto;
}
</style>
