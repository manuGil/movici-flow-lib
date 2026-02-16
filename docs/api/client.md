# Client

The `Client` class provides HTTP communication built on Axios, with configurable error handling and concurrency control.

**Source:** `src/api/client.ts`

## ClientConfig

```ts
interface ClientConfig {
  baseURL: string;
  apiToken?: string | null;
  concurrency?: number;
  defaultCallbacks?: ErrorHandlingConfig;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `baseURL` | `string` | Base URL for all API requests |
| `apiToken` | `string \| null` | Optional authentication token |
| `concurrency` | `number` | Max concurrent requests (default: 10) |
| `defaultCallbacks` | `ErrorHandlingConfig` | Default error handlers |

## Client Class

```ts
class Client implements IClient {
  readonly onError: ErrorHandlingConfig;
  baseURL: string;
  apiToken: string | null;

  constructor(config: ClientConfig);
  request<T>(request: BaseRequest<T>, onError?: ErrorHandlingConfig): Promise<T | null>;
  handleError(e: Error | unknown, onError: ErrorHandlingConfig): void;
  downloadAsFile(data: Blob, filename: string): void;
  asFetchRequest(request: BaseRequest<unknown>): { url: string; options: RequestInit };
}
```

### Methods

#### `request<T>(request, onError?)`

Executes a `BaseRequest`, returning the parsed response or `null` on error. Errors are routed through `handleError`.

#### `handleError(e, onError)`

Merges the provided error handlers with the default callbacks. For Axios errors, it tries status-specific handlers first, then the generic `http` handler. Falls back to `all` for non-HTTP errors. Re-throws if no handler matches.

#### `downloadAsFile(data, filename)`

Creates a temporary download link to save a Blob as a file.

#### `asFetchRequest(request)`

Converts a `BaseRequest` into a plain `{ url, options }` object compatible with the Fetch API.

## ErrorHandlingConfig

```ts
interface ErrorHandlingConfig {
  [statusCode: number]: (e: HTTPErrorPayload) => void;
  http?: (e: HTTPErrorPayload) => void;
  all?: (e: Error | unknown) => void;
}

interface HTTPErrorPayload {
  status?: number;
  message: string;
}
```

## Factory Function

```ts
function defaultClient(settings?: {
  baseURL: string;
  apiToken?: string | null;
  callbacks?: ErrorHandlingConfig;
}): Client;
```

Creates a `Client` with a default concurrency of 10.
