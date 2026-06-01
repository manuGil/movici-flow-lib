<template>
  <aside class="editor-sidebar">
    <div class="sidebar-header p-3 border-bottom">
      <o-field :label="'Entity group'" label-class="is-size-7">
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
        {{ entityCount }} entiies
        <span v-if="modifiedCount > 0" class="has-test-warning-dark ml-2">
          ({{ modifiedCount }} modified)
        </span>
      </div>
    </div>
    <div class="sidebar-content p-3">
      <div v-if="store.selectedId !== null" class="mb-2">
        <span class="is-size-7 has-text-grey">Entity ID: </span>
        <span class="is-size-7 has-text-weight-bold">{{ store.selectedId }} </span>
      </div>
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
import { computed } from "vue";
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
  const enums = g?.["enums"] as Record<string, string[]> | undefined;
  return enums ?? {};
});

const enumNames = computed<Record<string, string>>(() => {
  // We need to know which properties map to which enum names, but that is
  // awailable only in the dataset summary. For now, we match by convention using
  // a best effort.
  return {};
});

function onPropertyChange(prop: string, value: unknown) {
  if (!store.entityGroup || store.selectedId === null) return;
  store.updateProperty(store.entityGroup, store.selectedId, prop, value);
}
</script>

<!-- TODO: use existing styles of extend styles -->
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
}
</style>
