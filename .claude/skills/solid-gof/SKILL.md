---
name: solid-gof
description: SOLID and Gang-of-Four design-principle guidance grounded in turbo's compiler/runtime/reactivity architecture. Use when refactoring or designing new modules to keep responsibilities clean and extension points open.
---

# turbo — SOLID & GoF guidance

Apply these to the actual architecture, not in the abstract. The guiding invariant:
**three layers stay decoupled** — `compiler` (parse + codegen), `runtime` (DOM), `reactivity`
(change detection) — joined only by a thin contract. The compiler emits thunks `() => expr`
and named runtime calls; it never imports reactivity and never decides what is reactive.

## SOLID, applied
- **SRP** — One reason to change per module. The compiler shouldn't know DOM internals; the runtime
  shouldn't know JSX; reactivity shouldn't know either. Watch oversized functions (`emitElement`,
  `compile`) — split parsing, HTML building, and codegen.
- **OCP** — Adding a new binding kind (insert / attr / event / …) should *extend*, not edit, the core
  walker. Prefer a **registry/Strategy of part-emitters** keyed by part kind over a growing `if/else`.
- **LSP** — Every component is uniformly `(props) => Node`; every reactive read is `() => T`. Don't
  introduce component shapes that can't substitute for that.
- **ISP** — The runtime is a set of small focused helpers (`template`, `nodeAt`, `insert`, `setAttr`,
  `on`, `render`), never a god-object. Keep it that way.
- **DIP** — The compiler depends on the runtime's *named contract*, not its implementation. You should
  be able to swap the runtime (e.g. a server/string renderer) without touching the compiler.

## GoF patterns already (or naturally) in play
- **Observer** — the reactivity core (signals notify reactions). Don't reinvent it elsewhere.
- **Visitor** — Babel `traverse` is a visitor over the AST; add behavior as visitor methods.
- **Composite / Interpreter** — the JSX/template tree (elements compose children with index paths).
- **Factory** — components are factories; `render` is the composition root.
- **Flyweight** — `template()` builds one parsed node and clones it per instance; keep templates stateless and hoisted.
- **Strategy** — the recommended shape for part-emitters and for future control-flow (insert reconcilers: text vs list vs branch).

## Refactor checklist
1. Name the single responsibility of each unit; move anything that doesn't fit.
2. Find the open/closed seams (new attr type? new node kind? new prop semantics?) and make them data-driven (registry) not branchy.
3. Prefer building AST nodes over string concatenation where it removes escaping/parsing risk — but don't over-engineer; string codegen is fine for leaf snippets.
4. De-duplicate (escaping, name normalization, marker logic).
5. Take small steps; **keep `pnpm test` + `pnpm e2e` green after each step** — behavior must not change.
