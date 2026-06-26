# @turbo/reactivity

The change-detection core of **turbo** — a small, synchronous, push-based signal system.
It knows nothing about the DOM or JSX.

> **Read** a signal inside a reaction and it subscribes; **write** the signal and every
> subscriber re-runs. Dependencies are re-tracked on every run, so they are always exact.

```ts
import { signal, memo, effect, batch, untrack, onCleanup } from "@turbo/reactivity";

const count = signal(0);
count();                       // read  → 0 (subscribes the running reaction)
count.set(count() + 1);        // write → notifies subscribers (skipped if Object.is-equal)

const double = memo(() => count() * 2);   // lazy, cached derived value
const stop = effect(() => console.log(double())); // runs now, re-runs on change
stop();                        // dispose
```

## API

| | |
| --- | --- |
| `signal(initial)` | callable getter with `.set`; `.set` no-ops on `Object.is` equality |
| `effect(fn)` | run `fn` now and on every dependency change; returns a disposer |
| `memo(fn)` | **lazy** derived value — computes on first read, recomputes after a dep changes |
| `batch(fn)` | coalesce writes; the flush is deferred until the outermost batch closes |
| `untrack(fn)` | run `fn` without subscribing its reads |
| `onCleanup(fn)` | register teardown on the active owner; runs before its next run and on dispose |
| `createRoot(fn)` | open a top-level owner scope; `fn` receives a `dispose` that tears it down |
| `isAccessor(v)` | true for a signal/memo (a branded getter) |

## How it works

Two ambient pointers drive everything: `activeReaction` (who is currently *tracking*) and
`activeOwner` (who *owns* newly created reactions and cleanups). A signal read links itself
to `activeReaction` both ways, so unsubscribing is a few `Set.delete`s with no knowledge of
signal internals.

- **Owner tree** — every `effect` / `memo` / `createRoot` is adopted by the current owner.
  Disposal recurses children-first, then unsubscribes deps, then runs cleanups. Because an
  effect disposes itself before each re-run, anything it created last time is torn down
  first — so effects-inside-effects (and swapped-out DOM content) never leak.
- **Scheduler** — writes enqueue observers into one global `Set` and `flush()` drains it to
  a fixpoint. Set-deduping makes the diamond `a → b,c → sink` run the sink **once**.

### Known sharp edges

- Not fully glitch-free: a sink reading **both** a source and a memo of that source can run
  twice.
- No cycle detection: an effect that writes a signal it also reads will loop.

## Tests

```bash
npx vitest run packages/reactivity
```

[`src/index.test.ts`](src/index.test.ts) asserts the fine-grained semantics with spies that
count runs: no-op writes ⇒ 0 runs, dynamic dependency tracking, `batch` coalescing,
`onCleanup` ordering, and owner-tree disposal.
