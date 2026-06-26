# @turbo/core

The authoring API for turbo components — signal-backed props and the lifecycle hook.

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

```bash
npx vitest run packages/core
```
