# 04 · header

**in** — `Unit` (factory-wrapped; `templates` + `helpers` populated by stage 02)
**out** — `Unit` (runtime import + hoisted template declarations prepended)

Reads what stage 02 collected (the template HTML strings and the set of runtime
helpers actually used) and prepends the file header. It runs **last** precisely
because it needs the complete picture of what the body ended up using.

Skips when `compiled` is false. Note the decoupling: this stage never imports
stage 02 — it only reads `unit.templates` / `unit.helpers` off the `Unit`.

Given `templates = ["<button><!></button>"]` and `helpers = {nodeAt, on, insert}`,
it prepends:
```js
import { template as _$template, insert as _$insert, on as _$on, nodeAt as _$nodeAt } from "@turbo/runtime";
const _tmpl$0 = _$template("<button><!></button>");
```
(`template` is added here, since this stage is what emits `_$template(...)`.)
