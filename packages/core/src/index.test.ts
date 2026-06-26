import { describe, it, expect, vi } from "vitest";
import { signal, effect, createRoot } from "@turbo/reactivity";
import {
  input,
  output,
  onDestroy,
  _$input,
  _$inputRequired,
  _$output,
} from "./index";

describe("_$input", () => {
  it("reads the prop when present, else the default", () => {
    expect(_$input({}, "title", "fallback")()).toBe("fallback");
    expect(_$input({ title: "given" }, "title", "fallback")()).toBe("given");
  });

  it("tracks a reactive prop getter", () => {
    const name = signal("a");
    const props = {
      get name() {
        return name();
      },
    };
    const value = _$input(props, "name", "");

    const seen: string[] = [];
    effect(() => seen.push(value()));

    name.set("b");
    expect(seen).toEqual(["a", "b"]);
  });
});

describe("_$inputRequired", () => {
  it("reads the prop value", () => {
    const count = _$inputRequired<number>({ count: 5 }, "count");
    expect(count()).toBe(5);
  });
});

describe("_$output", () => {
  it("invokes the bound handler with the emitted value", () => {
    const handler = vi.fn();
    const submit = _$output<string>({ submit: handler }, "submit");
    submit.emit("payload");
    expect(handler).toHaveBeenCalledWith("payload");
  });

  it("is a no-op when no handler is bound", () => {
    const submit = _$output<string>({}, "submit");
    expect(() => submit.emit("x")).not.toThrow();
  });
});

describe("authoring facades", () => {
  it("throw if executed without compilation", () => {
    expect(() => input("")).toThrow();
    expect(() => input.required<number>()).toThrow();
    expect(() => output()).toThrow();
  });
});

describe("onDestroy", () => {
  it("fires when the owning scope is disposed", () => {
    const cleanup = vi.fn();
    let disposeScope!: () => void;

    createRoot((dispose) => {
      disposeScope = dispose;
      onDestroy(cleanup);
    });

    expect(cleanup).not.toHaveBeenCalled();
    disposeScope();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
