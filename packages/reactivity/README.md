# @turbo/reactivity

The change-detection core of **turbo**. A tiny, fine-grained, synchronous,
push-based reactivity system — the same model used by Solid and Vue's
`ref`/`effect`, kept deliberately minimal.

The whole idea fits in one sentence:

> **Reading** a signal while an effect is running *subscribes* that effect to the
> signal; **writing** the signal *re-runs* every subscribed effect.

Everything else (`memo`, `untrack`, `onCleanup`, dynamic dependency tracking,
cleanup) is built on top of that single rule.

---

## API at a glance

```ts
import { signal, effect, memo, untrack, onCleanup } from "@turbo/reactivity";

const count = signal(0);          // create reactive state
count();                          // read   -> 0  (subscribes the active effect)
count.set(1);                     // write  -> notifies subscribers
count.set(count() + 1);           // write a new value

const double = memo(() => count() * 2);   // cached derived value

const dispose = effect(() => {            // side-effect that re-runs on change
  console.log(double());
});
dispose();                                // stop the effect

untrack(() => count());                   // read without subscribing
onCleanup(() => {/* teardown */});        // register teardown for the current effect
```

---

## The core data structures

Two ideas hold the entire system together (see [`src/types.ts`](src/types.ts)):

### `Reaction` — a re-runnable unit of work (an effect)

```ts
class Reaction {
  constructor(
    public run: () => void,            // what to execute (re-run)
    public deps: Set<Set<Reaction>>,   // the observer-sets this reaction is in
    public cleanups: Array<() => void> // teardown callbacks for this run
  ) {}
}
```

A `Reaction` is one effect. It knows **how to run itself** (`run`) and it keeps a
back-reference to every signal it is subscribed to (`deps`) so it can unsubscribe
later.

### A signal's `observers` — the reverse link

Each signal owns a `Set<Reaction>` called `observers` — every effect that read it.

So the graph is doubly linked:

```
signal.observers : Set<Reaction>          "who depends on me"
reaction.deps    : Set<Set<Reaction>>     "which observer-sets contain me"
```

`reaction.deps` holds the *observer sets themselves*, not the signals. That's the
clever part: to unsubscribe, a reaction just deletes itself from each set it
remembers — it never needs to know about signal objects.

### One module-level global

```ts
let activeReaction: Reaction | null = null; // the effect currently running, if any
```

`activeReaction` is the heart of automatic dependency tracking: it's how a signal
read "knows" who is reading it.

---

## How it works, step by step

### 1. `signal(initial)` — reactive state

```ts
export function signal<T>(initial: T): WritableSignal<T> {
  let value = initial;
  const observers = new Set<Reaction>();

  const read = (() => {
    if (activeReaction) {                  // (a) someone is listening?
      observers.add(activeReaction);       //     remember them
      activeReaction.deps.add(observers);  //     and let them remember us
    }
    return value;
  }) as WritableSignal<T>;

  read.set = (next) => {
    if (Object.is(next, value)) return;    // (b) bail if unchanged
    value = next;

    for (const observer of [...observers]) // (c) snapshot, then notify
      observer.run();
  };

  return read;
}
```

**Reading** (`count()`):

- (a) If an effect is currently running (`activeReaction` is set), the two-way link
  is formed: the signal records the reaction in `observers`, and the reaction records
  this `observers` set in its `deps`. Now they know about each other.
- If nothing is running, the read is just a plain value read — no subscription.

Because subscription happens *on read*, dependencies are tracked **automatically and
dynamically**. You never declare them.

**Writing** (`count.set(...)`):

- (b) **`Object.is` guard:** if the value didn't actually change, nothing re-runs.
  This is what makes "set to the same value" a no-op.
- (c) **Snapshot with `[...observers]`:** we iterate a *copy*. An effect re-running
  will mutate `observers` (it unsubscribes then re-subscribes — see below), so
  iterating the live set would be unsafe.

### 2. `effect(fn)` — run now, re-run on change

```ts
export function effect(fn: Callback): Callback {
  const reaction = Reaction.from();
  reaction.run = () => {
    unsubscribe(reaction);          // (a) drop last run's subscriptions
    const prev = activeReaction;
    activeReaction = reaction;      // (b) become "the listener"
    try {
      fn();                         // (c) run user code; signal reads subscribe here
    } finally {
      activeReaction = prev;        // (d) restore (supports nesting)
    }
  };

  reaction.run();                   // run once immediately
  return () => unsubscribe(reaction); // disposer
}
```

A single `run` captures the whole tracking dance:

- (a) **Unsubscribe first.** Before each run we wipe the previous run's
  subscriptions. This is what makes dependency tracking *dynamic*: if a branch stops
  reading a signal, it stops being a dependency.
- (b) **Set `activeReaction`** so that any signal read inside `fn()` links back to
  this reaction.
- (c) **Run user code.** Every `signal()` read during this call subscribes.
- (d) **Restore `activeReaction`** to whatever it was before. Saving/restoring (rather
  than nulling) means effects can be created inside other effects without breaking the
  parent's tracking.

`effect` runs **once immediately** and returns a **disposer** that unsubscribes it for
good.

#### Dynamic dependencies in action

```ts
effect(() => spy(cond() ? a() : b()));
```

While `cond` is `true`, the effect reads `cond` and `a` — so only those are
dependencies; changing `b` does nothing. Flip `cond` to `false` and the next run
unsubscribes from `a`, subscribes to `b`. No manual dependency arrays, ever. (This is
the `effect > tracks dependencies dynamically` test.)

### 3. `unsubscribe(reaction)` — the teardown primitive

```ts
function unsubscribe(r: Reaction) {
  for (const dep of r.deps) dep.delete(r); // remove from every observer-set
  r.deps.clear();

  for (const cleanup of r.cleanups) cleanup(); // run teardown callbacks
  r.cleanups.length = 0;
}
```

This does two jobs:

1. **Detach** the reaction from every signal that referenced it (`dep.delete(r)`),
   then forget those sets.
2. **Run cleanups** registered via `onCleanup`, then clear them.

It runs in two situations: at the **start of every re-run** (so old subscriptions and
old cleanups don't pile up) and on **dispose** (final teardown).

### 4. `onCleanup(fn)` — teardown for the current effect

```ts
export function onCleanup(fn: () => void): void {
  if (activeReaction) activeReaction.cleanups.push(fn);
}
```

Registers a callback on the currently-running effect. It fires **before the next
re-run** and **on dispose** (because both go through `unsubscribe`). Use it to clear
timers, remove listeners, abort fetches — anything that must be undone before the
effect runs again or stops.

### 5. `memo(fn)` — cached derived value

```ts
export function memo<T>(fn: () => T): Accessor<T> {
  const s = signal<T>(undefined as T);
  effect(() => s.set(fn()));   // recompute when fn's dependencies change
  return () => s();            // read the cached result (and subscribe to it)
}
```

A memo is just **a signal driven by an effect**:

- The internal `effect` runs `fn()` and pushes the result into a hidden signal `s`.
  When any dependency of `fn` changes, the effect re-runs and updates `s`.
- Reading the memo reads `s`, so the caller **subscribes to the memo's output**, not
  to `fn`'s inputs.
- Caching falls out for free: `s.set` uses the `Object.is` guard, so if `fn()`
  produces the same value, downstream effects **don't** re-run.

### 6. `untrack(fn)` — read without subscribing

```ts
export function untrack<T>(fn: () => T): T {
  const prev = activeReaction;
  activeReaction = null;   // hide the active reaction
  try {
    return fn();
  } finally {
    activeReaction = prev;
  }
}
```

Temporarily clears `activeReaction`, so any signal read inside `fn` sees "no
listener" and skips subscription. Useful when you need a value but don't want it to
become a dependency:

```ts
effect(() => spy(a() + untrack(() => b()))); // depends on a, NOT b
```

---

## Putting it together: the lifecycle of one update

```ts
const count = signal(0);
const double = memo(() => count() * 2);
effect(() => console.log(double()));   // logs 0
count.set(5);                          // logs 10
```

1. `memo` creates signal `s` and an effect `E_memo = () => s.set(count() * 2)`.
   Running it reads `count` (subscribes `E_memo` to `count`) and sets `s` to `0`.
2. The outer `effect` `E_log` runs, reads `double()` → reads `s` (subscribes `E_log`
   to `s`), logs `0`.
3. `count.set(5)`: value changed, so `count` notifies its observer `E_memo`.
4. `E_memo` re-runs: unsubscribes, re-reads `count` (re-subscribes), computes `10`,
   calls `s.set(10)`.
5. `s` changed, so it notifies `E_log`.
6. `E_log` re-runs and logs `10`.

A single synchronous push, propagated one edge at a time through the dependency graph.

---

## Design notes & gotchas

- **Synchronous & immediate.** Updates propagate depth-first the moment you call
  `.set`. The `Object.is` guard at each signal stops no-op writes from cascading.
- **Why snapshot `[...observers]`?** A re-running effect mutates the very set being
  iterated (unsubscribe removes it, re-running re-adds it). Iterating a copy avoids
  "modified during iteration" bugs.
- **Why store observer *sets* in `deps`, not signals?** Unsubscribe becomes a couple
  of `Set.delete` calls with zero knowledge of signal internals.
- **Effects own cleanups per run.** Anything in `onCleanup` is flushed on the next
  run and on dispose — pair every subscription/timer with its teardown.
- **`memo` is eager.** Its driving effect runs immediately and on every dependency
  change, even if nothing reads the memo. It caches the *result*, not the
  *computation trigger*.

---

## Running the tests

```bash
pnpm test                          # whole monorepo (Vitest)
npx vitest run packages/reactivity # just this package
```

The suite in [`src/index.test.ts`](src/index.test.ts) covers reads/writes, dynamic
dependency tracking, disposal, `memo` caching, `untrack`, and `onCleanup` ordering.
