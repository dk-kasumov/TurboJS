import type {
  CodeMapping,
  IScriptSnapshot,
  VirtualCode,
} from "@volar/language-core";
import { transform } from "./transform.ts";

function snapshotOf(text: string): IScriptSnapshot {
  return {
    getText: (start, end) => text.slice(start, end),
    getLength: () => text.length,
    getChangeRange: () => undefined,
  };
}

export class TurboVirtualCode implements VirtualCode {
  id = "root";
  languageId = "typescriptreact";
  snapshot!: IScriptSnapshot;
  mappings: CodeMapping[] = [];

  constructor(snapshot: IScriptSnapshot) {
    this.assign(snapshot);
  }

  update(snapshot: IScriptSnapshot): this {
    this.assign(snapshot);
    return this;
  }

  private assign(snapshot: IScriptSnapshot): void {
    const source = snapshot.getText(0, snapshot.getLength());
    const { code, mappings } = transform(source);
    this.snapshot = snapshotOf(code);
    this.mappings = mappings;
  }
}
