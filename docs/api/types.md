# Types

Core type definitions for the visualizer configuration system.

**Source:** `src/types/flowVisualizers.ts`

## FlowVisualizerType

```ts
enum FlowVisualizerType {
  POINTS = "points",
  LINES = "lines",
  POLYGONS = "polygons",
  ARCS = "arcs",
  ICONS = "icons",
  GRID = "grid",
  FLOODING_GRID = "floodingGrid",
}
```

## Visualizer Options

### CommonVisualizerOptions

Base options shared by all visualizer types:

```ts
interface CommonVisualizerOptions {
  type: FlowVisualizerType;
  color?: ColorClause;
  popup?: PopupClause;
  size?: SizeClause;
  visibility?: VisibilityClause;
  icon?: IconClause;
  shape?: IconClause;
  floodingGrid?: FloodingGridClause;
}
```

Each visualizer type has a dedicated interface that narrows the `type` field:

- `PointVisualizerOptions` — `type: POINTS`
- `LineVisualizerOptions` — `type: LINES`
- `PolygonVisualizerOptions` — `type: POLYGONS`
- `ArcVisualizerOptions` — `type: ARCS`
- `IconVisualizerOptions` — `type: ICONS`
- `GridVisualizerOptions` — `type: GRID`
- `FloodingGridVisualizerOptions` — `type: FLOODING_GRID`

The union type `FlowVisualizerOptions` covers all of these.

## Clauses

### ColorClause

```ts
interface ColorClause {
  static?: StaticColorClause;    // { color: RGBAColor }
  byValue?: ByValueColorClause;  // data-driven color mapping
  legend?: LegendOptions;
  advanced?: AdvancedColorSettings;
}

interface ByValueColorClause extends ByValueClause {
  type: "buckets" | "gradient";
  colors: ValueMapping<RGBAColor>;  // [number, RGBAColor][]
  maxValue?: number;
  semiTransparent?: boolean;
}

interface AdvancedColorSettings {
  fillOpacity?: number;
  renderOrder?: RenderOrderType;
  specialColor?: RGBAColor;
  undefinedColor?: RGBAColor;
  legend?: LegendOptions;
}
```

### SizeClause

```ts
interface SizeClause {
  static?: StaticSizeClause;
  byValue?: ByValueSizeClause;
  dashed?: boolean;
}

type SizeUnit = "pixels" | "meters";

interface StaticSizeClause {
  size: number;
  units: SizeUnit;
  minPixels?: number;
  maxPixels?: number;
}

interface ByValueSizeClause extends ByValueClause {
  sizes: ValueMapping<number>;  // [number, number][]
  units: SizeUnit;
  minPixels?: number;
  maxPixels?: number;
}
```

### IconClause

```ts
interface IconClause {
  static?: StaticIconClause;    // { icon: string }
  byValue?: ByValueIconClause;  // { icons: ValueMapping<string> }
  legend?: LegendOptions;
}
```

### PopupClause

```ts
interface PopupClause {
  title: string;
  show?: boolean;
  onHover?: boolean;
  dynamicTitle?: boolean;
  items: PopupItem[];
}
```

### VisibilityClause

```ts
interface VisibilityClause {
  byValue: ByValueVisibilityClause;
}

interface ByValueVisibilityClause extends ByValueClause {
  mapping: ValueMapping<boolean>;  // [number, boolean][]
  maxValue?: number;
}
```

### FloodingGridClause

```ts
interface FloodingGridClause {
  heightMapDataset: string;
  heightMapDatasetUUID?: UUID;
}
```

## View Configuration

```ts
interface FlowViewConfig {
  version: number;
  visualizers: FlowVisualizerConfig[];
  charts?: FlowChartConfig[];
  camera?: ViewState;
  timestamp?: number;
}

interface FlowVisualizerConfig {
  name: string;
  dataset_name: string;
  entity_group: string;
  additional_entity_groups?: Record<string, string>;
  visible?: boolean;
  settings: FlowVisualizerOptions;
}
```

## Shared Types

```ts
interface ByValueClause {
  attribute: AttributeSummary | null;
}

type ValueMapping<T> = [number, T][];

interface LegendOptions {
  labels?: string[];
}

interface Mapper<In, Out> {
  getValue(input: In): Out;
}
```
