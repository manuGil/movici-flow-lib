# Components

All components are registered globally when the Flow plugin is installed. They can be used in templates without explicit imports.

## Map Components

| Component | Description |
|-----------|-------------|
| `Deck` | Deck.gl WebGL canvas for rendering map layers |
| `MapVis` | Full map visualization combining Deck.gl layers with Mapbox GL base map |
| `TimeSlider` | Simulation timeline scrubber for navigating timestamped data |

## Visualizer Components

| Component | Description |
|-----------|-------------|
| `VisualizerElement` | Configuration panel for a single visualizer (color, size, visibility settings) |
| `VisualizerSummary` | Compact summary display of a visualizer's current configuration |
| `FlowLayerPicker` | Layer selection interface for adding visualizers to a view |

## Data Components

| Component | Description |
|-----------|-------------|
| `DatasetViewer` | Tabular viewer for dataset contents |
| `AttributeSelector` | Dropdown selector for dataset attributes |
| `GeometrySelector` | Selector for entity group / geometry type |

## UI Components

| Component | Description |
|-----------|-------------|
| `ColorInput` | Color value input field |
| `FlowColorPicker` | Full color picker with palette and custom input |
| `FlowStep` | Navigation step indicator in the project → scenario → view workflow |
| `ExportForm` | Form for configuring data export options |
| `FlowExport` | Export action trigger with format selection |

## Info Components

| Component | Description |
|-----------|-------------|
| `ProjectInfoBox` | Displays project metadata |
| `ScenarioInfoBox` | Displays scenario metadata |
| `ViewInfoBox` | Displays view metadata |
| `ViewLoaderModal` | Modal for loading/selecting saved views |
