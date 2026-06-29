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

function observe<T>(read: () => T) {
  const spy = vi.fn();
  effect(() => spy(read()));
  return spy;
}

describe("signal", () => {
  it("holds and updates its value", () => {
    const count = signal(1);
    expect(count()).toBe(1);
    count.set(count() + 1);
    expect(count()).toBe(2);
  });
});

describe("effect", () => {
  it("runs once on creation, then on every real change", () => {
    const count = signal(1);
    const spy = observe(count);
    count.set(2);
    expect(spy.mock.calls).toEqual([[1], [2]]);
  });

  it("ignores writes that leave the value unchanged", () => {
    const count = signal(1);
    const spy = observe(count);
    count.set(1);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("retracks its dependencies on every run", () => {
    const useA = signal(true);
    const a = signal("a");
    const b = signal("b");
    const spy = observe(() => (useA() ? a() : b()));

    b.set("b is not tracked yet");
    expect(spy).toHaveBeenCalledTimes(1);

    useA.set(false);
    a.set("a is no longer tracked");
    expect(spy).toHaveBeenCalledTimes(2);

    b.set("tracked now");
    expect(spy).toHaveBeenLastCalledWith("tracked now");
  });

  it("stops running once disposed", () => {
    const count = signal(1);
    const spy = vi.fn();
    const dispose = effect(() => spy(count()));
    dispose();
    count.set(2);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe("memo", () => {
  it("computes lazily and caches until a dependency changes", () => {
    const a = signal(1);
    const compute = vi.fn(() => a() * 2);
    const double = memo(compute);
    expect(compute).not.toHaveBeenCalled();

    expect(double()).toBe(2);
    expect(double()).toBe(2);
    expect(compute).toHaveBeenCalledTimes(1);

    a.set(3);
    expect(compute).toHaveBeenCalledTimes(1);
    expect(double()).toBe(6);
    expect(compute).toHaveBeenCalledTimes(2);
  });

  it("notifies a dependent only once when inputs converge on it", () => {
    const a = signal(1);
    const b = memo(() => a() + 1);
    const c = memo(() => a() + 1);
    const spy = observe(() => b() + c());

    a.set(2);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenLastCalledWith(6);
  });
});

describe("untrack", () => {
  it("reads a signal without subscribing to it", () => {
    const tracked = signal(1);
    const hidden = signal(1);
    const spy = observe(() => tracked() + untrack(hidden));

    tracked.set(2);
    expect(spy).toHaveBeenCalledTimes(2);

    hidden.set(5);
    expect(spy).toHaveBeenCalledTimes(2);
  });
});

describe("batch", () => {
  it("coalesces writes so dependents run once at the close", () => {
    const a = signal(0);
    const b = signal(0);
    const spy = observe(() => a() + b());

    batch(() => {
      a.set(1);
      b.set(2);
    });

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenLastCalledWith(3);
  });

  it("flushes only when the outermost batch closes", () => {
    const a = signal(0);
    const spy = observe(a);

    batch(() => {
      a.set(1);
      batch(() => a.set(2));
      expect(spy).toHaveBeenCalledTimes(1);
    });

    expect(spy).toHaveBeenLastCalledWith(2);
  });

  it("reads a memo fresh after its dependency changes within the same batch", () => {
    const minutes = signal(2);
    const seconds = memo(() => minutes() * 60);
    let read = 0;

    batch(() => {
      minutes.set(1);
      read = seconds();
    });

    expect(read).toBe(60);
  });
});

describe("onCleanup", () => {
  it("runs before each re-run and once more on dispose", () => {
    const a = signal(1);
    const cleanup = vi.fn();
    const dispose = effect(() => {
      a();
      onCleanup(cleanup);
    });
    expect(cleanup).not.toHaveBeenCalled();

    a.set(2);
    expect(cleanup).toHaveBeenCalledTimes(1);

    dispose();
    expect(cleanup).toHaveBeenCalledTimes(2);
  });
});

describe("ownership", () => {
  it("disposes inner effects when their owner re-runs", () => {
    const outer = signal(0);
    const inner = signal(0);
    const spy = vi.fn();

    effect(() => {
      outer();
      effect(() => spy(inner()));
    });

    inner.set(1);
    expect(spy).toHaveBeenCalledTimes(2);

    outer.set(1);
    inner.set(2);
    expect(spy).toHaveBeenCalledTimes(4);
  });

  it("runs an inner onCleanup when the owning scope re-runs", () => {
    const outer = signal(0);
    const cleanup = vi.fn();
    effect(() => {
      outer();
      effect(() => onCleanup(cleanup));
    });

    outer.set(1);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});

describe("createRoot", () => {
  it("keeps owned effects alive until its disposer runs", () => {
    const a = signal(0);
    const spy = vi.fn();
    let dispose!: () => void;
    createRoot((d) => {
      dispose = d;
      effect(() => spy(a()));
    });

    a.set(1);
    expect(spy).toHaveBeenCalledTimes(2);

    dispose();
    a.set(2);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("runs onCleanup callbacks when disposed", () => {
    const cleanup = vi.fn();
    let dispose!: () => void;
    createRoot((d) => {
      dispose = d;
      onCleanup(cleanup);
    });

    dispose();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});

describe("isAccessor", () => {
  it("recognizes signals and memos, rejects everything else", () => {
    expect(isAccessor(signal(0))).toBe(true);
    expect(isAccessor(memo(() => 1))).toBe(true);

    expect(isAccessor(() => 1)).toBe(false);
    expect(isAccessor(5)).toBe(false);
    expect(isAccessor(null)).toBe(false);
    expect(isAccessor({})).toBe(false);
  });

  it("brands non-enumerably, so spreading drops the mark", () => {
    const copy = { ...memo(() => 1) };
    expect(Object.getOwnPropertySymbols(copy)).toHaveLength(0);
  });
});
