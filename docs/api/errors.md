# Errors

Custom error hierarchy for Flow navigation and validation errors.

**Source:** `src/errors.ts`

## Error Hierarchy

```
Error
└── MoviciError
    ├── ValidationError
    ├── FlowRedirect
    └── FlowErrorSetup
        ├── UserNotFound
        ├── ProjectNameNotProvided
        ├── ProjectInvalid
        ├── ScenarioNameNotProvided
        ├── ScenarioInvalid
        ├── ViewHasNoScenario
        ├── ViewInvalid
        ├── ViewNotInScenario
        ├── ViewNotInProject
        └── SummaryNotFound
```

## MoviciError

Base error class for all Flow errors.

```ts
class MoviciError extends Error {
  id?: string;
  context?: Record<string, string>;
  constructor(message?: string, context?: Record<string, string>);
  handleError(props: ErrorProps): void;
}
```

## ValidationError

Thrown for form validation failures.

## FlowRedirect

Thrown to trigger navigation to a different location. The flow store catches these to redirect automatically.

```ts
class FlowRedirect extends MoviciError {
  location: FlowLocation;
  constructor(location: FlowLocation, message?: string, context?: Record<string, string>);
}
```

## FlowErrorSetup

Base class for navigation setup errors. Each subclass specifies an `id` and a `redirect` route name.

```ts
class FlowErrorSetup extends MoviciError {
  redirect?: string;
}
```

### Setup Error Types

| Error | ID | Redirect | Description |
|-------|----|----------|-------------|
| `UserNotFound` | `userNotFound` | `Console` | No authenticated user found |
| `ProjectNameNotProvided` | `projectNameNotProvided` | `FlowProject` | Missing project name in location |
| `ProjectInvalid` | `projectInvalid` | `FlowProject` | Project name doesn't match any project |
| `ScenarioNameNotProvided` | `scenarioNameNotProvided` | `FlowScenario` | Missing scenario name in location |
| `ScenarioInvalid` | `scenarioInvalid` | `FlowScenario` | Scenario name doesn't match any scenario |
| `ViewHasNoScenario` | `viewHasNoScenario` | `FlowVisualization` | View is not associated with a scenario |
| `ViewInvalid` | `viewInvalid` | `FlowVisualization` | View UUID doesn't match any view |
| `ViewNotInScenario` | `viewNotInScenario` | `FlowScenario` | View doesn't belong to the active scenario |
| `ViewNotInProject` | `viewNotInProject` | `FlowProject` | View doesn't belong to the active project |
| `SummaryNotFound` | `summaryNotFound` | `FlowScenario` | Dataset summary could not be loaded |

Some errors override `handleError` to clean up invalid query parameters before redirecting (e.g., `ProjectInvalid` removes the `project` and `scenario` query params).
