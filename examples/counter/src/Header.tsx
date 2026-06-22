import { input } from "@turbo/core";

const title = input.required<string>();

export default (
  <header>
    <h1 data-testid="title">{title()}</h1>
  </header>
);
