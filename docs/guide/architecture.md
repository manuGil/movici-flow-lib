# Architecture

## Plugin Entry Point

`src/index.ts` exports a Vue plugin that registers all components globally. Host apps install it with:

```ts
app.use(Flow, { homeRoute });
```

The plugin iterates over all exported components and registers them on the Vue app instance. It also updates the global Movici settings with the provided options.

## Backend Abstraction

`src/types/backend.ts` defines the `Backend` interface with these services:

| Service | Responsibility |
|---------|---------------|
| `dataset` | List datasets, fetch data and state, get metadata |
| `project` | List projects |
| `scenario` | List and get scenarios |
| `view` | CRUD operations on views |
| `updates` | List and get simulation updates |
| `geocode` | Geocoding suggestions and results |
| `user` | Get current user |
| `summary` | Get dataset summaries (by scenario or dataset) |
| `fetch` | Convert requests to fetch-compatible format |

The library is decoupled from any specific API — host apps provide a Backend implementation. **Capabilities** (`"projects"`, `"geocode"`, `"user"`) gate optional features at runtime.

## State Management (Pinia)

### Flow Store (`useFlowStore`)

The central store managing navigation state: projects, scenarios, datasets, views, and the current user. It handles step-based navigation (project → scenario → visualization) with automatic resource loading and redirect logic via `FlowRedirect` errors.

### Parsed View Store (`useParsedViewStore`)

Holds the parsed representation of the current view: visualizer infos, chart infos, timestamp, and camera state.

### Popup Store (`usePopupStore`)

Manages map popup state including hover popups, persistent click popups, and right-side popups. Handles popup lifecycle with debounced hover and accent highlighting.

### Summary Store (`useSummaryStore`)

Caches dataset summaries with a hash-based store and promise deduplication. Automatically clears when the active scenario changes.

### UI Store (`useUIStore`)

Controls global UI state: loading indicator, sidebar collapse, and collapser availability per navigation step.

## Visualizer System

### VisualizerManager

`src/visualizers/VisualizerManager.ts` manages the visualizer lifecycle with declarative reconciliation. It compares the current view configuration with active visualizers and creates, updates, or removes them as needed.

### Visualizer Types

Defined in the `FlowVisualizerType` enum:

- **Points** — point markers
- **Lines** — line segments
- **Polygons** — filled polygon areas
- **Arcs** — arc connections between points
- **Icons** — icon markers
- **Grid** — grid cell rendering
- **FloodingGrid** — specialized grid with height map support

### Visualizer Modules

Pluggable visual modules in `src/visualizers/visualizerModules/`:

- **Color** — static or data-driven color mapping (buckets/gradient)
- **Size** — static or data-driven size in pixels or meters
- **Visibility** — data-driven entity visibility filtering
- **Popup** — interactive popup content configuration
- **RenderOrder** — layer rendering order control

### TapefileStore

`src/visualizers/TapefileStore.ts` provides a lazy-loading data cache for simulation state, fetching timestamped data on demand.

## Views

`src/views/` contains page-level components that map to navigation steps:

| View | Step |
|------|------|
| `FlowMainView` | Entry point, routes to other views |
| `FlowProjectView` | Project selection |
| `FlowScenarioView` | Scenario selection within a project |
| `FlowDatasetView` | Dataset exploration |
| `FlowVisualizationView` | Map visualization with visualizers and charts |

## Composables

### Domain Composables (`src/composables/`)

Encapsulate domain logic: `useCharts`, `useViews`, `useVisualizerList`, `useDeckGL`, `useMapVis`, `useGeocoding`, `useScenario`, `useAttributes`, `useReactiveSummary`, and more.

### Base Composables (`src/baseComposables/`)

Utility/global composables:

- `useMoviciSettings` — global settings management
- `useDialog` — dialog/modal management
- `useSnackbar` — toast notification management

## Path Alias

`@movici-flow-lib` resolves to `src/` (configured in `project/tsconfig.json`). All internal imports use this alias.
