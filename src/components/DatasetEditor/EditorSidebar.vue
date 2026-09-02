<template>
  <aside class="editor-sidebar">
    <div class="sidebar-header p-3 border-bottom">
      <o-field :label="'Editable entity group'" label-class="is-size-7">
        <o-select
          v-model="selectedGroup"
          size="small"
          expanded
          :disabled="!store.entityGroupNames.length"
          placeholder="Select entity group"
        >
          <option v-for="name in store.entityGroupNames" :key="name" :value="name">
            {{ name }}
          </option>
        </o-select>
      </o-field>

      <div class="is-size-7 has-text-grey mt-1">
        {{ entityCount }} entities
        <span v-if="modifiedCount > 0" class="has-text-warning-dark ml-2">
          ({{ modifiedCount }} modified)
        </span>
      </div>
    </div>
    <div class="sidebar-content p-3">
      <PropertyEditor
        :entity="store.selectedEntity"
        :entity-group="store.entityGroup"
        :general-enums="generalEnums"
        :enum-names="enumNames"
        @change="onPropertyChange"
      />
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useEditorStore } from "@movici-flow-lib/stores/editor";
import PropertyEditor from "./PropertyEditor.vue";

const store = useEditorStore();

const selectedGroup = computed({
  get: () => store.entityGroup,
  set: (val: string | null) => {
    if (val) store.selectEntityGroup(val);
  },
});

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
  // TODO: Review if this approach is generic/reliable enough.
  const result: Record<string, string> = {};
  if (!store.entityGroup) return result;
  const groupData = store.dataset?.data?.[store.entityGroup] as
    | Record<string, unknown[]>
    | undefined;
  if (!groupData) return result;
  for (const key of Object.keys(groupData)) {
    const suffix = key.split(".").pop() ?? key;
    if (generalEnums.value[suffix]) {
      result[key] = suffix;
    }
  }
  return result;
});

function onPropertyChange(prop: string, value: unknown) {
  if (!store.entityGroup || store.selectedId === null) return;
  store.updateProperty(store.entityGroup, store.selectedId, prop, value);
}
</script>

<style scoped lang="scss">
.editor-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  border-left: 1px solid $grey-lighter;
  background: white;

  .sidebar-header {
    border-bottom: 1px solid $grey-lighter;
    flex-shrink: 0;
  }
  .sidebar-content {
    flex: 1;
    overflow-y: auto;
  }
  .add-row {
    gap: 0.25rem;
  }
}
</style>
