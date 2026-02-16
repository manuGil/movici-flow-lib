# Stores

Movici Flow Lib uses [Pinia](https://pinia.vuejs.org/) for state management. All stores are defined using the Composition API style.

## useFlowStore

**Source:** `src/stores/flow.ts`

The central store managing navigation state and resource loading.

### State

| Ref | Type | Description |
|-----|------|-------------|
| `backend` | `Ref<Backend>` | The active Backend implementation |
| `projects` | `Ref<Project[]>` | Loaded projects |
| `project` | `Ref<Project>` | Currently active project |
| `scenarios` | `Ref<ShortScenario[]>` | Loaded scenarios |
| `scenario` | `Ref<ShortScenario \| Scenario \| null>` | Currently active scenario |
| `datasets` | `Ref<ShortDataset[]>` | Loaded datasets |
| `views` | `Ref<View[]>` | Loaded views |
| `view` | `Ref<View>` | Currently active view |
| `currentUser` | `Ref<User \| null>` | Current authenticated user |
| `currentLocation` | `Ref<FlowLocation>` | Current navigation location |
| `initialized` | `Ref<boolean>` | Whether the store has been initialized |

### Actions

| Action | Signature | Description |
|--------|-----------|-------------|
| `initialize` | `() => Promise<void>` | Loads user and projects |
| `hasCapability` | `(query: BackendCapability) => boolean` | Checks if the backend supports a capability |
| `setLocation` | `(location: FlowLocation) => Promise<void>` | Navigates to a location, initializing on first call |
| `updateLocation` | `(location: Partial<FlowLocation>) => Promise<void>` | Merges partial location into current |
| `loadDatasets` | `() => Promise<void>` | Loads datasets for the active project |
| `loadViews` | `() => Promise<void>` | Loads views for the active scenario |

## useParsedViewStore

**Source:** `src/stores/parsedView.ts`

Holds the parsed representation of the current view.

### State

| Ref | Type | Description |
|-----|------|-------------|
| `visualizerInfos` | `Ref<ComposableVisualizerInfo[]>` | Parsed visualizer configurations |
| `chartInfos` | `Ref<ChartVisualizerInfo[]>` | Parsed chart configurations |
| `timestamp` | `Ref<number>` | Current simulation timestamp |
| `camera` | `Ref<DeckCamera>` | Current camera position |
| `initialCamera` | `Ref<DeckCamera>` | Camera position when the view was loaded |

### Actions

| Action | Signature | Description |
|--------|-----------|-------------|
| `reset` | `(toCamera?: DeckCamera) => void` | Resets all state to defaults |

## usePopupStore

**Source:** `src/stores/popup.ts`

Manages map popup state including hover, persistent click, and right-side popups.

### State

| Ref | Type | Description |
|-----|------|-------------|
| `popups` | `Ref<PopupInfo[]>` | All active popups |
| `mapPopups` | `ComputedRef<PopupInfo[]>` | Popups rendered on the map |
| `rightSidePopups` | `ComputedRef<PopupInfo[]>` | Popups rendered in the side panel |

### Actions

| Action | Signature | Description |
|--------|-----------|-------------|
| `onClick` | `(content: PopupContent, layerId: string) => void` | Handles click on a map entity |
| `onHover` | `(content: PopupContent \| null, layerId: string) => void` | Handles hover on a map entity |
| `remove` | `(popup: PopupInfo) => void` | Removes a specific popup |
| `moveToBottom` | `(popup: PopupInfo) => void` | Moves a popup to the bottom of the stack |
| `toggleLocation` | `(popup: PopupInfo) => void` | Toggles a popup between map and right-side |
| `clearAccents` | `(accent?: PopupAccent) => void` | Clears accent highlights |
| `layerIsHidden` | `(layerId: string) => void` | Removes map popups for a hidden layer |
| `layerIsRemoved` | `(layerId: string) => void` | Removes all popups for a removed layer |
| `reset` | `() => void` | Clears all popups and timeouts |

## useSummaryStore

**Source:** `src/stores/summary.ts`

Caches dataset summaries with deduplication.

### Actions

| Action | Signature | Description |
|--------|-----------|-------------|
| `getSummary` | `(params: { datasetUUID: UUID; scenarioUUID?: UUID }) => Promise<DatasetSummary>` | Gets summary, throws `SummaryNotFound` if missing |
| `getCachedSummary` | `(params: { datasetUUID: UUID; scenarioUUID?: UUID }) => DatasetSummary \| null` | Returns cached summary or null |
| `hasSummary` | `(params: { datasetUUID: UUID; scenarioUUID?: UUID }) => boolean` | Checks if a summary is cached |
| `clearSummaries` | `() => void` | Clears all cached summaries |

Summaries are automatically cleared when the active scenario changes.

## useUIStore

**Source:** `src/stores/ui.ts`

Controls global UI state.

### State

| Ref | Type | Description |
|-----|------|-------------|
| `loading` | `Ref<boolean>` | Global loading indicator |
| `collapse` | `Ref<boolean>` | Whether the sidebar is collapsed |
| `collapserEnabled` | `Ref<boolean>` | Whether the collapse toggle is available |

### Actions

| Action | Signature | Description |
|--------|-----------|-------------|
| `setLocation` | `(location: FlowLocation) => void` | Adjusts UI state based on navigation step |
