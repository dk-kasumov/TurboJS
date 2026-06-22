import Header from "./Header";
import Fallback from "./Fallback";

const value = signal(true);
const Computed = memo(() => (value() ? <Header title="a" /> : <Fallback />));
const NodeComp = () => <div>123</div>;
const SignalComp = signal<JSX.Element>(<div />);

export default (
  <div>
    {value() ? <Header title="x" /> : <Fallback />}
    <Computed />
    <NodeComp />
    <SignalComp />
  </div>
);
