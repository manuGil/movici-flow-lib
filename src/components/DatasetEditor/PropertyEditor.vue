<template>
  <div class="property-editor">
    <div v-if="!entity" class="has-text-grey is-size-7 p-4">Select and entity on the map</div>
    <div v-else>
      <div
        v-for="(value, key) in editableProperties"
        :key="key"
        class="property-row is-flex is-align-items-center mb-2"
      >
        <span
          class="property-key is-size-7 has-test-grey-dark mr-2"
          :title="String(key)"
          :class="{ 'has-text-warning-dark has-test-weight-bold': isModified(String(key)) }"
        >
          {{ String(key) }}
          <span v-if="isModified(String(key))">*</span>
        </span>
        <div class="is-flex-grow-1">
          <o-select
            v-if="getEnumOptions(String(key))"
            :model-value="currentValue(String(value))"
            @update:model-value="(v: unknown) => emit('change', String(key), Number(v))"
            size="small"
          >
            <option
              v-for="(label, index) in getEnumOptions(String(key))"
              :key="index"
              :value="index"
            >
              {{ label }}
            </option>
          </o-select>
          <o-switch
            v-else-if="typeof value === 'boolean'"
            :model-value="Boolean(currentValue(String(key)))"
            @update:modelvalue="(v: boolean) => emit('change', String(key), v)"
            size="small"
          />
          <o-input
            v-else-if="typeof value === 'number'"
            type="number"
            :model-value="String(currentValue(String(key)))"
            @change="
              (e: Event) =>
                emit('change', String(key), Number((e.target as HTMLInputElement).value))
            "
            size="small"
          />
          <!-- Read only geometry or complex entity -->
          <span
            v-else-if="isGeometry(String(key))"
            class="is-size-7 has-text-gey is-family-monospace"
          >
            [geometry]
          </span>
          <!-- Fallback (string) -->
          <o-input
            v-else
            type="text"
            :model-value="String(currentValue(String(key)))"
            @change="
              (e: Event) => emit('change', String(key), (e.target as HTMLInputElement).value)
            "
            size="small"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useEditorStore } from "@movici-flow-lib/stores/editor";

const props = defineProps<{
  entity: Record<string, unknown> | null;
  entityGroup: string | null;
  generalEnums: Record<string, string[]>;
  enumNames: Record<string, string>; // PropNames become enumNames
}>();

const emit = defineEmits<{
  (e: "change", prop: string, value: unknown): void;
}>();

const store = useEditorStore();

const editableProperties = computed(() => {
  if (!props.entity) return {};
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props.entity)) {
    result[k] = v;
  }
  return result;
});

function isGeometry(key: string): boolean {
  return key.startsWith("geometry.");
}

function isModified(key: string): boolean {
  if (!props.entityGroup || store.selectedId === null) return false;
  const pending = store.changes.get(props.entityGroup)?.get(store.selectedId);
  return pending !== undefined && key in pending;
}

function currentValue(key: string): unknown {
  if (!props.entityGroup || store.selectedId === null) return props.entity?.[key];
  const pending = store.changes.get(props.entityGroup)?.get(store.selectedId);
  if (pending && key in pending) return pending[key];
  return props.entity?.[key];
}

function getEnumOptions(key: string): string[] | null {
  const enumName = props.enumNames[key];
  if (!enumName) return null;
  return props.generalEnums[enumName] ?? null;
}
</script>

<!-- TODO: use existing styles or extend styles -->
<style scoped lang="scss">
.property-editor {
  overflow-y: auto;
}
.property-row {
  gap: 0.5rem;
  .property-key {
    min-width: 140px;
    max-width: 140px;
    word-break: break-all;
    flex-shrink: 0;
  }
}
</style>
