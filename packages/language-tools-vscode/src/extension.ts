import * as vscode from "vscode";

export async function activate(): Promise<void> {
  const tsExtension = vscode.extensions.getExtension(
    "vscode.typescript-language-features",
  );
  await tsExtension?.activate();
}

export function deactivate(): void {}
