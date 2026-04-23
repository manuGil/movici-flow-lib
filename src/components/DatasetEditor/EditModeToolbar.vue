<template>
    <div class="edit-mode-toolbar">
       <o-tooltip v-for="mode in visibleModes" :key="mode.key" :label="mode.lable" :position="right">
        <o-button 
            :variant="store.editModeKey === mode.key ? 'primary' : 'white'"
            size="small"
            :icon-left="mode.icon"
            icon-pack="fas"
            @click="store.setEditMode(mode.key)"
            class="mode-btn"
        /> 
        </o-tooltip>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useEditorStore } from '@movici-flow-lib/stores/editor';

// TODO: continue here

</script>