import { describe, it, expect, vi } from "vitest";
import { signal, effect, memo, untrack, onCleanup } from "./index";

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
