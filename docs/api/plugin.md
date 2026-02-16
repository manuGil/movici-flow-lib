# Plugin

The Flow plugin is the main entry point for integrating Movici Flow Lib into a Vue 3 application.

**Source:** `src/index.ts`

::: warning
This documentation was generated using an AI assistant and may contain inaccuracies. Please verify the information with the source code or official documentation.
:::

## Installation

```ts
import Flow, { orugaConfig } from "@movici-flow-lib";

app.use(Flow, {
  homeRoute: { name: "MyHomeRoute" },
});
```

## FlowPluginOptions

```ts
interface FlowPluginOptions {
  homeRoute: RouteLocationRaw;
}
```

| Property    | Type               | Description                                                 |
| ----------- | ------------------ | ----------------------------------------------------------- |
| `homeRoute` | `RouteLocationRaw` | Vue Router location to navigate to when leaving the Flow UI |

## Plugin Behavior

The `install` function:

1. Iterates over all components exported from `src/components/` and registers them globally on the Vue app using `app.component(name, component)`
2. Calls `useMoviciSettings().updateSettings(options)` with the provided options to configure global settings

## Oruga Config

The plugin also exports `orugaConfig`, a configuration object for [Oruga UI](https://oruga-ui.com/) that should be merged with the Bulma theme config:

```ts
import Oruga from "@oruga-ui/oruga-next";
import { bulmaConfig } from "@oruga-ui/theme-bulma";
import merge from "lodash/merge";

app.use(Oruga, merge(bulmaConfig, orugaConfig));
```
