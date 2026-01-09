// Tests for acorn-specific patterns

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

function assertEquals(actual, expected, msg) {
  if (actual !== expected) throw new Error(msg || `Expected ${expected}, got ${actual}`);
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

// === ACORN-SPECIFIC PATTERNS ===

// From whitespace.js
test('linebreak regex', () => {
  const lineBreak = /\r\n?|\n|\u2028|\u2029/;
  assert(lineBreak.test('\n'));
  assert(lineBreak.test('\r'));
  assert(lineBreak.test('\r\n'));
  assert(!lineBreak.test('a'));
});

test('isNewLine function', () => {
  function isNewLine(code) {
    return code === 10 || code === 13 || code === 0x2028 || code === 0x2029;
  }
  assert(isNewLine(10));  // \n
  assert(isNewLine(13));  // \r
  assert(!isNewLine(32)); // space
});

test('nextLineBreak function', () => {
  function isNewLine(code) {
    return code === 10 || code === 13 || code === 0x2028 || code === 0x2029;
  }
  function nextLineBreak(code, from, end) {
    if (end === undefined) end = code.length;
    for (let i = from; i < end; i++) {
      let next = code.charCodeAt(i);
      if (isNewLine(next))
        return i < end - 1 && next === 13 && code.charCodeAt(i + 1) === 10 ? i + 2 : i + 1;
    }
    return -1;
  }
  assertEquals(nextLineBreak('abc\ndef', 0), 4);
  assertEquals(nextLineBreak('abc', 0), -1);
  assertEquals(nextLineBreak('a\r\nb', 0), 3);
});

// From util.js
test('hasOwn pattern', () => {
  const hasOwnProperty = Object.prototype.hasOwnProperty;
  const hasOwn = function(obj, propName) {
    return hasOwnProperty.call(obj, propName);
  };
  const obj = { a: 1 };
  assert(hasOwn(obj, 'a'));
  assert(!hasOwn(obj, 'b'));
  assert(!hasOwn(obj, 'toString')); // inherited
});

test('isArray pattern', () => {
  const toString = Object.prototype.toString;
  const isArray = Array.isArray || function(obj) {
    return toString.call(obj) === '[object Array]';
  };
  assert(isArray([1, 2]));
  assert(!isArray({ length: 2 }));
});

test('wordsRegexp pattern', () => {
  const regexpCache = Object.create(null);
  function wordsRegexp(words) {
    return regexpCache[words] || (regexpCache[words] = new RegExp('^(?:' + words.replace(/ /g, '|') + ')$'));
  }
  const kw = wordsRegexp('break case continue');
  assert(kw.test('break'));
  assert(kw.test('case'));
  assert(!kw.test('if'));
});

test('codePointToString', () => {
  function codePointToString(code) {
    if (code <= 0xFFFF) return String.fromCharCode(code);
    code -= 0x10000;
    return String.fromCharCode((code >> 10) + 0xD800, (code & 1023) + 0xDC00);
  }
  assertEquals(codePointToString(65), 'A');
  assertEquals(codePointToString(0x1F600), '😀');
});

// From scopeflags.js
test('scope flags bitwise', () => {
  const SCOPE_TOP = 1;
  const SCOPE_FUNCTION = 2;
  const SCOPE_ASYNC = 4;
  const SCOPE_GENERATOR = 8;
  const SCOPE_VAR = SCOPE_TOP | SCOPE_FUNCTION;
  
  assertEquals(SCOPE_VAR, 3);
  
  function functionFlags(async, generator) {
    return SCOPE_FUNCTION | (async ? SCOPE_ASYNC : 0) | (generator ? SCOPE_GENERATOR : 0);
  }
  assertEquals(functionFlags(false, false), 2);
  assertEquals(functionFlags(true, false), 6);
  assertEquals(functionFlags(true, true), 14);
});

// From locutil.js
test('Position class', () => {
  class Position {
    constructor(line, col) {
      this.line = line;
      this.column = col;
    }
    offset(n) {
      return new Position(this.line, this.column + n);
    }
  }
  const pos = new Position(1, 5);
  assertEquals(pos.line, 1);
  assertEquals(pos.column, 5);
  const pos2 = pos.offset(3);
  assertEquals(pos2.column, 8);
});

// From tokentype.js
test('TokenType class pattern', () => {
  class TokenType {
    constructor(label, conf) {
      if (conf === undefined) conf = {};
      this.label = label;
      this.keyword = conf.keyword;
      this.beforeExpr = !!conf.beforeExpr;
      this.binop = conf.binop || null;
    }
  }
  
  const beforeExpr = { beforeExpr: true };
  function binop(name, prec) {
    return new TokenType(name, { beforeExpr: true, binop: prec });
  }
  
  const num = new TokenType('num', { startsExpr: true });
  assertEquals(num.label, 'num');
  assertEquals(num.beforeExpr, false);
  
  const plus = binop('+/-', 9);
  assertEquals(plus.binop, 9);
  assertEquals(plus.beforeExpr, true);
});

test('keyword registration pattern', () => {
  const keywords = {};
  class TokenType {
    constructor(label, conf) {
      if (conf === undefined) conf = {};
      this.label = label;
      this.keyword = conf.keyword;
    }
  }
  function kw(name, options) {
    if (options === undefined) options = {};
    options.keyword = name;
    return keywords[name] = new TokenType(name, options);
  }
  
  const _break = kw('break');
  const _if = kw('if');
  
  assertEquals(keywords['break'].keyword, 'break');
  assertEquals(keywords['if'].keyword, 'if');
});

// From identifier.js
test('isIdentifierStart', () => {
  function isIdentifierStart(code) {
    if (code < 65) return code === 36; // $
    if (code < 91) return true; // A-Z
    if (code < 97) return code === 95; // _
    if (code < 123) return true; // a-z
    return false; // simplified, no unicode
  }
  
  assert(isIdentifierStart(36));  // $
  assert(isIdentifierStart(65));  // A
  assert(isIdentifierStart(95));  // _
  assert(isIdentifierStart(97));  // a
  assert(!isIdentifierStart(48)); // 0
  assert(!isIdentifierStart(32)); // space
});

test('isIdentifierChar', () => {
  function isIdentifierChar(code) {
    if (code < 48) return code === 36; // $
    if (code < 58) return true; // 0-9
    if (code < 65) return false;
    if (code < 91) return true; // A-Z
    if (code < 97) return code === 95; // _
    if (code < 123) return true; // a-z
    return false;
  }
  
  assert(isIdentifierChar(36));  // $
  assert(isIdentifierChar(48));  // 0
  assert(isIdentifierChar(65));  // A
  assert(isIdentifierChar(95));  // _
  assert(isIdentifierChar(97));  // a
  assert(!isIdentifierChar(32)); // space
});

// Parser.prototype extension pattern (critical!)
test('prototype extension pattern', () => {
  class Parser {
    constructor(input) {
      this.input = input;
      this.pos = 0;
    }
  }
  
  const pp = Parser.prototype;
  
  pp.current = function() {
    return this.input.charCodeAt(this.pos);
  };
  
  pp.advance = function() {
    return this.input.charCodeAt(this.pos++);
  };
  
  const p = new Parser('abc');
  assertEquals(p.current(), 97); // 'a'
  assertEquals(p.advance(), 97);
  assertEquals(p.current(), 98); // 'b'
});

// State management pattern
test('parser state class', () => {
  class Parser {
    constructor(options, input) {
      this.options = options;
      this.input = input;
      this.pos = 0;
      this.type = null;
      this.value = null;
    }
  }
  
  const p = new Parser({ ecmaVersion: 2020 }, 'let x = 1');
  assertEquals(p.options.ecmaVersion, 2020);
  assertEquals(p.input, 'let x = 1');
});

runTests();
