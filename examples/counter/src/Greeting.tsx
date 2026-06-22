import { input, output } from "@turbo/core";

const name = input("friend");
const greet = output<string>();

export default (
  <button data-testid="greet" onClick={() => greet.emit(`hello, ${name()}`)}>
    greet {name()}
  </button>
);
