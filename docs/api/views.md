# Views

Views are page-level components that map to navigation steps in the Projects → Scenarios → Views workflow.

**Source:** `src/views/`

## Navigation Flow

```
FlowMainView
  ├── FlowProjectView      (step: "project")
  ├── FlowScenarioView     (step: "scenario")
  ├── FlowDatasetView      (step: "dataset")
  └── FlowVisualizationView (step: "visualization")
```

## FlowMainView

The top-level entry point. Routes to the appropriate child view based on the current `FlowLocation.step`. Handles `FlowRedirect` errors to navigate between steps automatically.

## FlowProjectView

Displays a list of projects. Only shown when the backend has the `"projects"` capability. Selecting a project navigates to the scenario step.

## FlowScenarioView

Displays scenarios within the active project. Allows selecting a scenario to proceed to visualization or browsing datasets.

## FlowDatasetView

Dataset exploration view. Renders the `DatasetViewer` for inspecting dataset contents in tabular form. The sidebar collapser is disabled in this step.

## FlowVisualizationView

The main visualization workspace. Combines:

- **Map canvas** (Deck.gl + Mapbox GL) with configured visualizer layers
- **Visualizer list** for adding, configuring, and reordering layers
- **Chart panel** for Chart.js visualizations
- **Time slider** for navigating simulation timestamps
- **Popup panels** for entity inspection

This view resolves the full location (project, scenario, view) on entry, loading all required resources.
