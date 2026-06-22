import Greeting from "./Greeting";

const log = (message: string) => message;

export default (
  <div>
    <Greeting count={1} />
    <Greeting name="hi" count={2} greet={(message) => log(message)} />
  </div>
);
