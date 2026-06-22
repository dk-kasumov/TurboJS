const name = input("world");
const count = input.required<number>();
const greet = output<string>();

export default (
  <button onClick={() => greet.emit(name())}>
    {name()} #{count()}
  </button>
);
