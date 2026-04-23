<template>
    <div class="editor-view" @keydown="onKeyDown" tabindex="-1">
        <EditorToolbar />
        <div class="editor-body">
            <div class="editor-map">
                <Deck ref="deckRef" :layers="layers" :camera="camera" @update:camera="camera = $event">
                    <template #control-left="{ onViewstateChange}">
                        <MapControlNavigation
                        :model-value="camera"
                        :init-camera="camera"
                        @update:model-value="onViewstateChange($event)"
                        />
                        <MapControlBaseMap :model-value="basempa" @update:model-value="basemap = $event" />     
                        <EditModeToolbar />
                    </template>
                    <template #control-zero="{ on }">
                        <span ref="deckOnRef" :data-on="registerOn(on)" style="display: none" />
                    </template>
                </Deck> 
            </div>
            <EditorSidebar class="editor-sidebar"/>
        </div>    
    </div>
</template>

<script setup lang="ts">
</script>