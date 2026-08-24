<template>
  <WidgetContainer collapsable>
    <template #collapse-title="{ collapsed }">
      <div class="is-flex is-flex-direction-row-reverse is-align-items-center is-clickable">
        <o-icon
          title="Layers"
          class="collapsed-icon"
          pack="far"
          :icon="collapsed ? 'stream' : 'minus-square'"
        />
        <label class="label is-flex-grow-1 mb-0" v-show="!collapsed">Layers</label>
      </div>
    </template>
    <template #collapse-content>
      <ul class="entities-list is-size-7 mt-2">
        <li v-for="name in store.entityGroupNames" :key="name" :title="name" class="pl-0 is-flex">
          <o-checkbox
            :model-value="store.isGroupVisible(name)"
            :disabled="name === store.entityGroup"
            @update:model-value="(v: boolean) => store.setGroupVisible(name, v)"
            size="small"
          >
            {{ formatEntityNames(name) }} ({{ entityCount(name) }})
          </o-checkbox>
        </li>
        <li v-if="!store.entityGroupNames.length" class="has-text-grey">No entity group</li>
      </ul>
    </template>
  </WidgetContainer>
</template>
<script setup lang="ts">
import WidgetContainer from "@movici-flow-lib/components/mapControls/WidgetContainer.vue";
import { useEditorStore } from "@movici-flow-lib/stores/editor";
import { snakeToSpaces, upperFirst } from "@movici-flow-lib/utils/filters";

const store = useEditorStore();
const formatEntityNames = (name: string) => upperFirst(snakeToSpaces(name));
const entityCount = (name: string) =>
  ((store.dataset?.data?.[name]?.["id"] as unknown[]) ?? []).length;
</script>
