function f () {
  const x = { b: 1 };
  const y = { b: 2 };
  x.a = y; // x references y
  y.a = x; // y references x
  console.log(x, y);
  console.log(x.b, y.a);
  return "azerty";
}

f();
