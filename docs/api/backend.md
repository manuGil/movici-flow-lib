# Backend

The `Backend` interface defines the contract between Movici Flow Lib and your data layer. The library never calls any API directly — all data access goes through the Backend services.

**Source:** `src/types/backend.ts`

## Backend Interface

```ts
interface Backend {
  getCapabilities(): BackendCapability[];
  dataset: DatasetService;
  geocode: GeocodeService;
  project: ProjectService;
  scenario: ScenarioService;
  summary: SummaryService;
  updates: UpdatesService;
  user: UserService;
  view: ViewService;
  fetch: FetchRequestService;
}
```

## Capabilities

```ts
type BackendCapability = "projects" | "geocode" | "user";
```

Capabilities gate optional features. For example, if `"projects"` is not included, the project selection step is skipped.

## Service Interfaces

### DatasetService

```ts
interface DatasetService {
  list(project_uuid?: UUID): Promise<Dataset[]>;
  getData<T>(params: GetDataParams): Promise<DatasetWithData<T> | null>;
  getState<T>(params: GetStateParams): Promise<DatasetWithData<T> | null>;
  getMetaData(datasetUUID: UUID): Promise<Dataset | null>;
}

interface GetDataParams {
  datasetUUID: UUID;
  entityGroup?: string;
  properties?: DataAttribute[];
}

interface GetStateParams {
  datasetUUID: UUID;
  scenarioUUID: UUID;
  entityGroup: string;
  timestamp?: number;
  properties?: DataAttribute[];
}
```

### ProjectService

```ts
interface ProjectService {
  list(): Promise<Project[] | null>;
}
```

### ScenarioService

```ts
interface ScenarioService {
  get(scenario_uuid: UUID): Promise<Scenario | null>;
  list(project_uuid?: UUID): Promise<ShortScenario[] | null>;
}
```

### ViewService

```ts
interface ViewService {
  create(scenarioUUID: UUID, view: ViewPayload): Promise<ViewCrudResponse | null>;
  list(scenarioUUID: UUID): Promise<View[] | null>;
  get(viewUUID: UUID): Promise<View | null>;
  update(viewUUID: UUID, view: ViewPayload): Promise<ViewCrudResponse | null>;
  delete(viewUUID: UUID): Promise<ViewCrudResponse | null>;
}
```

### UpdatesService

```ts
interface UpdatesService {
  get(uuid: UUID, entityGroup: string, properties: DataAttribute[]): Promise<UpdateWithData | null>;
  list(uuid: string): Promise<Update[] | null>;
}
```

### SummaryService

```ts
interface SummaryService {
  getScenario(scenario_uuid: UUID, dataset_uuid: UUID): Promise<DatasetSummary | null>;
  getDataset(dataset_uuid: UUID): Promise<DatasetSummary | null>;
}
```

### GeocodeService

```ts
interface GeocodeService {
  upstreamEPSG(): Promise<number>;
  resolveSuggestion(suggestion: GeocodeSuggestion): Promise<GeocodeSearchResult | null>;
  getSuggestions(query: GeocodeSearchQuery): Promise<GeocodeSuggestion[] | null>;
  getResults(query: GeocodeSearchQuery): Promise<GeocodeSearchResult[] | null>;
}
```

### UserService

```ts
interface UserService {
  get(): Promise<User | null>;
}
```

### FetchRequestService

```ts
interface FetchRequestService {
  getRequest<T extends keyof FetchRequestOptions>(
    request: T,
    options: FetchRequestOptions[T]
  ): { url: string; options: RequestInit };
}

interface FetchRequestOptions {
  datasetDataBlob: { datasetUUID: string };
  scenario: { scenarioUUID: string };
}
```
