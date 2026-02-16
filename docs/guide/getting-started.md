# Getting Started

::: warning
This documentation was generated using an AI assistant and may contain inaccuracies. Please verify the information with the source code or official documentation.
:::

Movici Flow Lib is a Vue 3 + TypeScript visualization library for interactive geospatial data exploration. It renders spatial data using **Deck.gl** and **Mapbox GL**, with charts via **Chart.js**, and manages a Projects → Scenarios → Views navigation workflow backed by a pluggable Backend interface.

## Quick Setup

After [installing](/guide/installation) the library, register the plugin in your app entry point:

```ts
import { createPinia } from "pinia";
import { createApp } from "vue";
import Oruga from "@oruga-ui/oruga-next";
import { bulmaConfig } from "@oruga-ui/theme-bulma";
import merge from "lodash/merge";

import App from "./App.vue";
import Flow, { orugaConfig } from "@movici-flow-lib";

createApp(App)
  .use(Oruga, merge(bulmaConfig, orugaConfig))
  .use(createPinia())
  .use(router)
  .use(i18n)
  .use(Flow, {
    homeRoute: {
      name: "MyHomeRoute",
    },
  })
  .mount("#app");
```

The `homeRoute` option tells Flow where to navigate when the user leaves the Flow UI.

## Wiring a Backend

Flow does not ship with a concrete API client. You must implement the [`Backend`](/api/backend) interface and assign it to the flow store:

```ts
import { useFlowStore } from "@movici-flow-lib/stores/flow";
import { setClient } from "@movici-flow-lib/crs";

const flowStore = useFlowStore();

// Create your Client and Backend instances
const client = getClient();
const backend = getBackend(client);

// Supply them to Flow
flowStore.backend = backend;
setClient(client);
```

See the [Backend API reference](/api/backend) for the full list of service interfaces you need to implement.

## Key Components

Once the plugin and backend are configured, the main entry points are:

| Component      | Purpose                                                                 |
| -------------- | ----------------------------------------------------------------------- |
| `FlowMainView` | Top-level view that manages the Projects → Scenarios → Views navigation |
| `Deck`         | Deck.gl map canvas                                                      |
| `MapVis`       | Combined map visualization with layer management                        |

Start with `FlowMainView` to get the full navigation experience, or use `Deck` and `MapVis` directly for embedding map visualizations in custom layouts.

## Next Steps

- [Installation](/guide/installation) — detailed setup instructions
- [Architecture](/guide/architecture) — how the library is structured
- [API Reference](/api/plugin) — plugin options and component registration
