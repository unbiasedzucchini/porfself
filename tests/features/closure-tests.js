// Detailed closure behavior tests
// These characterize exactly what works and what doesn't

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function assertEquals(actual, expected) {
  if (actual !== expected) {
    throw new Error('Expected ' + expected + ', got ' + actual);
  }
}

function runTests() {
  for (let i = 0; i < tests.length; i++) {
    const t = tests[i];
    try {
      t.fn();
      console.log('✅ ' + t.name);
      passed++;
    } catch (e) {
      console.log('❌ ' + t.name + ': ' + e.message);
      failed++;
    }
  }
  console.log('');
  console.log('Passed: ' + passed + '/' + (passed + failed));
}

// === CLOSURE TESTS ===

// Level 0: Global scope access (should work)
const GLOBAL_VAR = 42;
test('access global from function', () => {
  function inner() {
    return GLOBAL_VAR;
  }
  assertEquals(inner(), 42);
});

// Level 1: Function parameters (should work per Porffor docs)
test('closure over parameter', () => {
  function outer(x) {
    function inner() {
      return x;
    }
    return inner();
  }
  assertEquals(outer(10), 10);
});

test('returned closure over parameter', () => {
  function makeGetter(x) {
    return function() {
      return x;
    };
  }
  const get5 = makeGetter(5);
  assertEquals(get5(), 5);
});

// Level 2: Local variables (the problematic case)
test('closure over local const', () => {
  function outer() {
    const y = 20;
    function inner() {
      return y;
    }
    return inner();
  }
  assertEquals(outer(), 20);
});

test('closure over local let', () => {
  function outer() {
    let y = 30;
    function inner() {
      return y;
    }
    return inner();
  }
  assertEquals(outer(), 30);
});

test('returned closure over local', () => {
  function makeCounter() {
    let count = 0;
    return function() {
      count++;
      return count;
    };
  }
  const counter = makeCounter();
  assertEquals(counter(), 1);
  assertEquals(counter(), 2);
});

// Level 3: Nested closures
test('double nested closure', () => {
  function level1() {
    const a = 1;
    function level2() {
      const b = 2;
      function level3() {
        return a + b;
      }
      return level3();
    }
    return level2();
  }
  assertEquals(level1(), 3);
});

// Level 4: Arrow functions
test('arrow closure over local', () => {
  function outer() {
    const x = 5;
    const inner = () => x;
    return inner();
  }
  assertEquals(outer(), 5);
});

test('arrow returned as closure', () => {
  function makeAdder(x) {
    return y => x + y;
  }
  const add10 = makeAdder(10);
  assertEquals(add10(5), 15);
});

// Level 5: Method closures (Parser.prototype pattern)
test('method accessing this', () => {
  class Foo {
    constructor(x) {
      this.x = x;
    }
    getX() {
      return this.x;
    }
  }
  const f = new Foo(99);
  assertEquals(f.getX(), 99);
});

test('method with nested function accessing this', () => {
  class Foo {
    constructor(x) {
      this.x = x;
    }
    process() {
      const self = this;
      function helper() {
        return self.x;
      }
      return helper();
    }
  }
  const f = new Foo(77);
  assertEquals(f.process(), 77);
});

// Level 6: Closure in callback (very common pattern)
test('closure in array forEach', () => {
  let sum = 0;
  const arr = [1, 2, 3];
  arr.forEach(function(x) {
    sum += x;
  });
  assertEquals(sum, 6);
});

test('closure in array map', () => {
  const multiplier = 10;
  const arr = [1, 2, 3];
  const result = arr.map(function(x) {
    return x * multiplier;
  });
  assertEquals(result[0], 10);
  assertEquals(result[1], 20);
});

// Level 7: Block scope closures
test('closure over block-scoped variable', () => {
  function outer() {
    let result;
    {
      const blockVar = 123;
      result = function() {
        return blockVar;
      };
    }
    return result();
  }
  assertEquals(outer(), 123);
});

// Level 8: Loop closures (classic gotcha)
test('closure in loop with let', () => {
  const funcs = [];
  for (let i = 0; i < 3; i++) {
    funcs.push(function() { return i; });
  }
  assertEquals(funcs[0](), 0);
  assertEquals(funcs[1](), 1);
  assertEquals(funcs[2](), 2);
});

runTests();
