import { describe, it, expect, vi } from "vitest";
import {
  signal,
  effect,
  memo,
  untrack,
  onCleanup,
  batch,
  createRoot,
  isAccessor,
} from "./index";

describe("signal", () => {
  it("reads and writes", () => {
    const a = signal(1);
    expect(a()).toBe(1);
    a.set(2);
    expect(a()).toBe(2);
    a.set(a() + 10);
    expect(a()).toBe(12);
  });
});

describe("effect", () => {
  it("runs immediately and on dependency change", () => {
    const a = signal(1);
    const spy = vi.fn();
    effect(() => spy(a()));
    expect(spy).toHaveBeenCalledTimes(1);
    a.set(2);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenLastCalledWith(2);
  });

  it("does not re-run when the value is unchanged", () => {
    const a = signal(1);
    const spy = vi.fn();
    effect(() => spy(a()));
    a.set(1);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("tracks dependencies dynamically", () => {
    const cond = signal(true);
    const a = signal("a");
    const b = signal("b");
    const spy = vi.fn();
    effect(() => spy(cond() ? a() : b()));
    expect(spy).toHaveBeenCalledTimes(1);

    // While cond is true, b is not a dependency.
    b.set("b2");
    expect(spy).toHaveBeenCalledTimes(1);

    cond.set(false);
    expect(spy).toHaveBeenCalledTimes(2);

    // Now a is no longer a dependency.
    a.set("a2");
    expect(spy).toHaveBeenCalledTimes(2);

    b.set("b3");
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it("can be disposed", () => {
    const a = signal(1);
    const spy = vi.fn();
    const dispose = effect(() => spy(a()));
    dispose();
    a.set(2);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe("memo", () => {
  it("derives and caches by Object.is", () => {
    const a = signal(2);
    const computeSpy = vi.fn((x: number) => x * 2);
    const double = memo(() => computeSpy(a()));
    const observe = vi.fn();
    effect(() => observe(double()));

    expect(double()).toBe(4);
    expect(observe).toHaveBeenCalledTimes(1);

    a.set(3);
    expect(double()).toBe(6);
    expect(observe).toHaveBeenLastCalledWith(6);
  });
});

describe("untrack", () => {
  it("reads without subscribing", () => {
    const a = signal(1);
    const b = signal(1);
    const spy = vi.fn();
    effect(() => spy(a() + untrack(() => b())));
    a.set(2);
    expect(spy).toHaveBeenCalledTimes(2);
    b.set(5);
    expect(spy).toHaveBeenCalledTimes(2);
  });
});

describe("onCleanup", () => {
  it("runs before re-run and on dispose", () => {
    const a = signal(1);
    const cleanup = vi.fn();
    const dispose = effect(() => {
      a();
      onCleanup(cleanup);
    });
    expect(cleanup).toHaveBeenCalledTimes(0);
    a.set(2);
    expect(cleanup).toHaveBeenCalledTimes(1);
    dispose();
    expect(cleanup).toHaveBeenCalledTimes(2);
  });
});

describe("batch", () => {
  it("coalesces multiple writes into one effect run", () => {
    const a = signal(0);
    const b = signal(0);
    const spy = vi.fn();
    effect(() => spy(a() + b()));
    expect(spy).toHaveBeenCalledTimes(1);

    batch(() => {
      a.set(1);
      b.set(2);
    });

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenLastCalledWith(3);
  });

  it("flushes once when the outermost batch closes", () => {
    const a = signal(0);
    const spy = vi.fn();
    effect(() => spy(a()));

    batch(() => {
      a.set(1);
      batch(() => a.set(2));
      expect(spy).toHaveBeenCalledTimes(1);
    });

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenLastCalledWith(2);
  });
});

describe("memo (lazy)", () => {
  it("does not compute until first read", () => {
    const a = signal(1);
    const compute = vi.fn(() => a());
    const m = memo(compute);
    expect(compute).toHaveBeenCalledTimes(0);

    expect(m()).toBe(1);
    expect(compute).toHaveBeenCalledTimes(1);
    m();
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it("recomputes only on read after a dependency changes", () => {
    const a = signal(1);
    const compute = vi.fn(() => a());
    const m = memo(compute);
    m();
    expect(compute).toHaveBeenCalledTimes(1);

    a.set(2);
    expect(compute).toHaveBeenCalledTimes(1);

    expect(m()).toBe(2);
    expect(compute).toHaveBeenCalledTimes(2);
  });

  it("runs a diamond sink once", () => {
    const a = signal(1);
    const b = memo(() => a() + 1);
    const c = memo(() => a() + 1);
    const spy = vi.fn();
    effect(() => spy(b() + c()));
    expect(spy).toHaveBeenCalledTimes(1);

    a.set(2);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenLastCalledWith(6);
  });
});

describe("ownership", () => {
  it("disposes nested effects when the outer effect re-runs", () => {
    const outer = signal(0);
    const inner = signal(0);
    const innerSpy = vi.fn();

    effect(() => {
      outer();
      effect(() => {
        inner();
        innerSpy();
      });
    });
    expect(innerSpy).toHaveBeenCalledTimes(1);

    inner.set(1);
    expect(innerSpy).toHaveBeenCalledTimes(2);

    outer.set(1);
    expect(innerSpy).toHaveBeenCalledTimes(3);

    inner.set(2);
    expect(innerSpy).toHaveBeenCalledTimes(4);
  });

  it("runs nested onCleanup when the owning scope re-runs", () => {
    const outer = signal(0);
    const cleanup = vi.fn();

    effect(() => {
      outer();
      effect(() => onCleanup(cleanup));
    });
    expect(cleanup).toHaveBeenCalledTimes(0);

    outer.set(1);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});

describe("isAccessor", () => {
  it("is true for signals and memos", () => {
    expect(isAccessor(signal(0))).toBe(true);
    expect(isAccessor(memo(() => 1))).toBe(true);
  });

  it("is false for plain functions regardless of arity", () => {
    expect(isAccessor(() => 1)).toBe(false);
    expect(isAccessor((props = {}) => props)).toBe(false);
  });

  it("is false for non-functions", () => {
    expect(isAccessor(5)).toBe(false);
    expect(isAccessor(null)).toBe(false);
    expect(isAccessor({})).toBe(false);
  });

  it("brands non-enumerably, so it is not copied by spread", () => {
    const copy = { ...memo(() => 1) };
    expect(Object.getOwnPropertySymbols(copy)).toHaveLength(0);
  });
});

describe("createRoot", () => {
  it("disposes the effects it owns", () => {
    const a = signal(0);
    const spy = vi.fn();
    let disposeRoot!: () => void;

    createRoot((dispose) => {
      disposeRoot = dispose;
      effect(() => spy(a()));
    });
    expect(spy).toHaveBeenCalledTimes(1);

    a.set(1);
    expect(spy).toHaveBeenCalledTimes(2);

    disposeRoot();
    a.set(2);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("runs onCleanup callbacks on dispose", () => {
    const cleanup = vi.fn();
    let disposeRoot!: () => void;

    createRoot((dispose) => {
      disposeRoot = dispose;
      onCleanup(cleanup);
    });
    expect(cleanup).toHaveBeenCalledTimes(0);

    disposeRoot();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
