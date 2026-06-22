#!/usr/bin/env node
import { check } from "./index.ts";

const tsconfig = process.argv[2] ?? "tsconfig.json";
const result = check(tsconfig);

const output = result.format();
if (output) process.stderr.write(`${output}\n`);

process.stderr.write(
  result.errorCount === 0
    ? "turbo-check: no type errors\n"
    : `turbo-check: ${result.errorCount} error(s)\n`,
);

process.exit(result.errorCount === 0 ? 0 : 1);
