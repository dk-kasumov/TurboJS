import { component, input } from "@turbo/core";

export const config = component({ styles: "./ProgressBar.css" });

const percent = input(0);

export default (
  <div class="bar">
    <div class="bar-fill" style={`width:${percent()}%`} />
  </div>
);
