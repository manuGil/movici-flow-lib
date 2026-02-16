# Composables

Movici Flow Lib provides composables organized into two categories: domain-specific composables for visualization logic and base composables for utility/global functionality.

## Domain Composables

**Source:** `src/composables/`

| Composable | Description |
|------------|-------------|
| `useAttributes` | Attribute selection and filtering logic |
| `useButtons` | Button configuration for UI actions |
| `useCharts` | Chart.js chart creation and management |
| `useClauseConfigurator` | Configuration logic for visualizer clauses (color, size, etc.) |
| `useDeckGL` | Deck.gl instance management and layer rendering |
| `useDraggable` | Drag-and-drop interaction handling |
| `useFixedPosition` | Fixed positioning logic for UI elements |
| `useFlowSidebar` | Sidebar navigation and state |
| `useGeocoding` | Geocoding search suggestions and result resolution |
| `useMapLayer` | Individual map layer configuration |
| `useMapVis` | Combined map visualization orchestration |
| `useReactiveSummary` | Reactive dataset summary fetching |
| `useScenario` | Scenario loading and activation |
| `useValidator` | Form validation logic |
| `useViews` | View CRUD operations and lifecycle |
| `useVisualizerList` | Visualizer list management (add, remove, reorder, duplicate) |

## Base Composables

**Source:** `src/baseComposables/`

### useMoviciSettings

Global settings management. Stores configuration provided during plugin installation (e.g., `homeRoute`) and default view state.

```ts
const { settings, updateSettings } = useMoviciSettings();
```

### useDialog

Dialog/modal management for confirmation prompts and custom dialogs.

```ts
const { showDialog, closeDialog } = useDialog();
```

### useSnackbar

Toast notification management for success, error, and info messages.

```ts
const { showSnackbar } = useSnackbar();
```
