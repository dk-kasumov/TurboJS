# @turbo/core

The authoring API for turbo components — signal-backed props, the lifecycle hook, and the
per-component `component()` config (CSS encapsulation).

```tsx
import { input, output, onDestroy } from "@turbo/core";

const label = input("Save");          // optional prop, with a default
const id = input.required<string>();  // required prop, no default
const click = output<MouseEvent>();   // callback prop the parent binds

onDestroy(() => console.log("gone")); // teardown when the owning scope disposes

export default <button onClick={(e) => click.emit(e)}>{label()}</button>;
```

Each binding is named by its **variable name** — `input("Save")` declares a prop called
`label`. A parent passes them like attributes: `<Button label={text()} onClick={…} />`.

## How it works

`input` / `output` are **authoring facades** — calling them at runtime throws. The compiler
([stage 03-factory](../compiler/src/stages/03-factory)) rewrites each binding to its real
implementation, threading in the injected `props`:

```
const label = input("Save")        →   const label = _$input(props, "label", "Save")
const id = input.required<T>()     →   const id = _$inputRequired(props, "id")
const click = output<T>()          →   const click = _$output(props, "click")
```

`_$input` returns a signal-like accessor that reads the prop (falling back to the default)
and stays reactive across the component boundary; `_$output` returns `{ emit }` that invokes
the bound callback (a no-op if none was passed). `onDestroy` is `onCleanup` from
[`@turbo/reactivity`](../reactivity), re-exported under a component-friendly name.

## CSS encapsulation — `component()`

A component opts into scoped styles by exporting a `config`:

```tsx
import { component, Encapsulation } from "@turbo/core";

export const config = component({
  encapsulation: Encapsulation.Emulated, // default — omit it to get this
  styles: "./button.css",                // string | string[] — co-located CSS
});

export default <button class="btn">…</button>;
```

`Encapsulation` is a const-object enum (a real `enum` is non-erasable and breaks the
strip-only loader): `Encapsulation.Emulated` (`"emulated"`) | `Encapsulation.None` (`"none"`).

- **`Emulated`** (default, Angular/Vue-style) — the compiler stamps a per-component
  attribute (`t-<hash>`) on every element of the view and suffixes every CSS selector with
  it (`.btn` → `.btn[t-1a2b3c]`), so the styles can't leak out. CSS custom properties still
  cascade in, so theming via `--vars` works.
- **`None`** — the CSS is injected globally, unscoped; the opt-out.

Like `input`/`output`, `component()` is a **compile-time marker** — calling it at runtime
throws. The compiler finds the `config` export, reads it statically, resolves the `styles`
files, and strips the export from the output (see [`scope.ts`](../compiler/src/scope.ts) and
[`encapsulation/`](../compiler/src/encapsulation)). The bundler reads the CSS via the
[vite-plugin](../vite-plugin)'s `resolveStyle` (with `addWatchFile` for HMR).

```bash
npx vitest run packages/core
```
