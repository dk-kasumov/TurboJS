import Greeting from "./Greeting";

export default (
  <div>
    <Greeting count="not-a-number" />
    <Greeting count={1} who={1} />
  </div>
);
