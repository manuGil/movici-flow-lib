<template>
  <div class="modal-card new-entity-group-modal">
    <div class="box has-background-white p-4">
      <p class="title is-6 mb-3">New entity group</p>
      <o-field label="Name" label-class="is-size-7" class="mb-2">
        <div class="is-flex is-align-items-center add-row">
          <o-input
            ref="nameInput"
            v-model="name"
            size="small"
            placeholder="entities"
            expanded
            @keyup.enter="onAdd"
          />
        </div>
      </o-field>
      <o-field label="Geometry type" label-class="is-size-7" class="mb-2">
        <o-select v-model="geometryType" size="small">
          <option value="point">point</option>
          <option value="linestring">line</option>
          <option value="polygon">polygon</option>
        </o-select>
      </o-field>
      <p v-if="error" class="is-size-7 has-text-danger mt-1">{{ error }}</p>
      <div class="is-flex is-justify-content-flex-end mt-4">
        <o-button size="small" class="mr-2" @click="emit('close')">Cancel</o-button>
        <o-button size="small" class="mr-2" variant="primary" :disabled="!canAdd" @click="onAdd"
          >Add</o-button
        >
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useEditorStore } from "@movici-flow-lib/stores/editor";
import type { GeometryType } from "@movici-flow-lib/utils/geoJsonBridge";

const emit = defineEmits<{ (e: "close"): void }>();
const store = useEditorStore();
const name = ref("");
const geometryType = ref<GeometryType>("point");
const error = ref<string | null>(null);
const nameInput = ref<{ focus(): void } | null>(null);

const canAdd = computed(() => !!store.dataset?.data && name.value.trim().length > 0);
onMounted(() => nameInput.value?.focus());

function onAdd() {
  if (!canAdd.value) return;
  const groupName = name.value.trim();
  if (store.addEntityGroup(groupName, geometryType.value)) {
    emit("close");
  } else {
    error.value = `Cannot add entity group '${groupName}'. It already exists`;
  }
}
</script>
<style scoped lang="scss">
.new-entity-group-modal {
  width: 320px;
  max-width: 100%;
  .add-row {
    gap: 0.25rem;
  }
}
</style>
