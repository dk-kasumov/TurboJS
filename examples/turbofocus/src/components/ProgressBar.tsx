import { input } from "@turbo/core";

const percent = input(0);

export default (
  <div class="bar">
    <div class="bar-fill" style={`width:${percent()}%`} />
  </div>
);
