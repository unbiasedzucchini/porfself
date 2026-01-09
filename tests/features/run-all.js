// Test runner that works under both Node and Porffor
// Run with: node tests/features/run-all.js
// Or: porf tests/features/run-all.js

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, msg) {
  if (!condition) {
    throw new Error(msg || 'Assertion failed');
  }
}

function assertEquals(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(msg || `Expected ${expected}, got ${actual}`);
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

// === TESTS ===

// Basic features (known working)
test('basic arithmetic', () => {
  assertEquals(1 + 2, 3);
});

test('string charCodeAt', () => {
  assertEquals('abc'.charCodeAt(0), 97);
});

test('array map', () => {
  const arr = [1, 2, 3].map(x => x * 2);
  assertEquals(arr[0], 2);
  assertEquals(arr[1], 4);
});

test('class with constructor', () => {
  class Point {
    constructor(x, y) {
      this.x = x;
      this.y = y;
    }
  }
  const p = new Point(3, 4);
  assertEquals(p.x, 3);
  assertEquals(p.y, 4);
});

test('class with method', () => {
  class Counter {
    constructor() { this.count = 0; }
    inc() { this.count++; }
  }
  const c = new Counter();
  c.inc();
  c.inc();
  assertEquals(c.count, 2);
});

test('default parameters', () => {
  function greet(name = 'world') {
    return 'hello ' + name;
  }
  assertEquals(greet(), 'hello world');
  assertEquals(greet('test'), 'hello test');
});

test('destructuring object', () => {
  const { a, b } = { a: 1, b: 2, c: 3 };
  assertEquals(a, 1);
  assertEquals(b, 2);
});

test('destructuring array', () => {
  const [x, y] = [10, 20];
  assertEquals(x, 10);
  assertEquals(y, 20);
});

test('for loop', () => {
  let sum = 0;
  for (let i = 0; i < 5; i++) {
    sum += i;
  }
  assertEquals(sum, 10);
});

test('for...in', () => {
  const obj = { a: 1, b: 2 };
  let keys = '';
  for (const k in obj) {
    keys += k;
  }
  assert(keys.includes('a') && keys.includes('b'));
});

test('for...of array', () => {
  let sum = 0;
  for (const x of [1, 2, 3]) {
    sum += x;
  }
  assertEquals(sum, 6);
});

test('ternary operator', () => {
  const x = true ? 1 : 2;
  const y = false ? 1 : 2;
  assertEquals(x, 1);
  assertEquals(y, 2);
});

test('logical or', () => {
  assertEquals(false || 5, 5);
  assertEquals(3 || 5, 3);
});

test('logical and', () => {
  assertEquals(true && 5, 5);
  assertEquals(false && 5, false);
});

test('bitwise or', () => {
  assertEquals(1 | 2, 3);
  assertEquals(4 | 1, 5);
});

test('regex test', () => {
  const re = /[0-9]+/;
  assert(re.test('abc123'));
  assert(!re.test('abc'));
});

test('regex match', () => {
  const m = 'hello123'.match(/[0-9]+/);
  assertEquals(m[0], '123');
});

test('string replace with regex', () => {
  const s = 'a b c'.replace(/ /g, '-');
  assertEquals(s, 'a-b-c');
});

test('new RegExp', () => {
  const re = new RegExp('[a-z]+', 'g');
  assert(re.test('hello'));
});

// Acorn-specific features to test

test('Object.create(null)', () => {
  const obj = Object.create(null);
  obj.foo = 'bar';
  assertEquals(obj.foo, 'bar');
});

test('prototype assignment', () => {
  function Foo() {}
  Foo.prototype.bar = function() { return 42; };
  const f = new Foo();
  assertEquals(f.bar(), 42);
});

test('prototype modification after creation', () => {
  class Base {}
  const pp = Base.prototype;
  pp.getValue = function() { return this.value; };
  
  class Child extends Base {
    constructor(v) { super(); this.value = v; }
  }
  const c = new Child(99);
  assertEquals(c.getValue(), 99);
});

test('function call/apply', () => {
  function greet(greeting) {
    return greeting + ' ' + this.name;
  }
  const obj = { name: 'world' };
  assertEquals(greet.call(obj, 'hello'), 'hello world');
});

test('hasOwnProperty', () => {
  const obj = { a: 1 };
  assert(obj.hasOwnProperty('a'));
  assert(!obj.hasOwnProperty('b'));
});

test('Array.isArray', () => {
  assert(Array.isArray([1, 2, 3]));
  assert(!Array.isArray({ length: 0 }));
});

test('String.fromCharCode', () => {
  assertEquals(String.fromCharCode(97), 'a');
  assertEquals(String.fromCharCode(65, 66, 67), 'ABC');
});

test('double negation coercion', () => {
  assertEquals(!!1, true);
  assertEquals(!!0, false);
  assertEquals(!!'hello', true);
  assertEquals(!!'', false);
});

test('nullish coalescing', () => {
  assertEquals(null ?? 'default', 'default');
  assertEquals(undefined ?? 'default', 'default');
  assertEquals(0 ?? 'default', 0);
  assertEquals('' ?? 'default', '');
});

// Run all tests
runTests();
