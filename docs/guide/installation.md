# Installation

Movici Flow Lib is currently not an NPM package. To use this library you must add it to your project as a git submodule and configure your build tooling.

## 1. Add as a Git Submodule

```bash
git submodule add <repo-url> movici-flow-lib
```

## 2. Copy Assets

Copy the required assets into your project:

- Copy `src/assets` contents (images, sass) into your own `src/assets/`
- Copy `public/` contents into your own `public/`
- Copy dependencies from `project/package.json` into your own `package.json`

Your project layout should look like:

```
├── movici-flow-lib/
├── src/
│   ├── assets/
│   │   ├── images/
│   │   ├── sass/
│   ├── ... your own project files
├── public/
│   ├── static/
│   ├── ... your own public files
├── package.json
```

## 3. Configure TypeScript

Update your `tsconfig.json` to include Flow Lib sources and set up the path alias:

```json
{
  "include": [
    "movici-flow-lib/src/**/*",
    "movici-flow-lib/src/**/*.json",
    "movici-flow-lib/src/**/*.vue"
  ],
  "compilerOptions": {
    "paths": {
      "@movici-flow-lib/*": ["./movici-flow-lib/src/*"],
      "@movici-flow-lib": ["movici-flow-lib/src/index.ts"]
    }
  }
}
```

## 4. Configure Vite

Add the `@movici-flow-lib` alias to your `vite.config.ts`:

```ts
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "@movici-flow-lib",
        replacement: fileURLToPath(
          new URL("./movici-flow-lib/src", import.meta.url)
        ),
      },
    ],
  },
});
```

## 5. Register the Plugin

See [Getting Started](/guide/getting-started) for the `app.use(Flow, ...)` setup.
