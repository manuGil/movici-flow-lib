import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Movici Flow Lib",
  description: "Vue 3 + TypeScript visualization library for interactive geospatial data exploration",
  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "API Reference", link: "/api/plugin" },
    ],
    sidebar: {
      "/guide/": [
        {
          text: "Guide",
          items: [
            { text: "Getting Started", link: "/guide/getting-started" },
            { text: "Installation", link: "/guide/installation" },
            { text: "Architecture", link: "/guide/architecture" },
          ],
        },
      ],
      "/api/": [
        {
          text: "API Reference",
          items: [
            { text: "Plugin", link: "/api/plugin" },
            { text: "Backend", link: "/api/backend" },
            { text: "Client", link: "/api/client" },
            { text: "Stores", link: "/api/stores" },
            { text: "Composables", link: "/api/composables" },
            { text: "Components", link: "/api/components" },
            { text: "Views", link: "/api/views" },
            { text: "Types", link: "/api/types" },
            { text: "Errors", link: "/api/errors" },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/movici/movici-flow-lib" },
    ],
  },
});
