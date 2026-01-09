// Basic tokenization tests extracted from acorn
// Designed to work without closures (for Porffor compatibility)

// Instead of closures, we use a global parser state
let input = '';
let pos = 0;
let tokStart = 0;
let tokEnd = 0;
let tokType = '';
let tokVal = null;

function reset(code) {
  input = code;
  pos = 0;
  tokStart = 0;
  tokEnd = 0;
  tokType = '';
  tokVal = null;
}

// Character codes
const CH_0 = 48;
const CH_9 = 57;
const CH_a = 97;
const CH_z = 122;
const CH_A = 65;
const CH_Z = 90;
const CH_UNDERSCORE = 95;
const CH_DOLLAR = 36;
const CH_SPACE = 32;
const CH_TAB = 9;
const CH_LF = 10;
const CH_CR = 13;
const CH_LPAREN = 40;
const CH_RPAREN = 41;
const CH_LBRACE = 123;
const CH_RBRACE = 125;
const CH_LBRACKET = 91;
const CH_RBRACKET = 93;
const CH_SEMICOLON = 59;
const CH_COMMA = 44;
const CH_DOT = 46;
const CH_PLUS = 43;
const CH_MINUS = 45;
const CH_STAR = 42;
const CH_SLASH = 47;
const CH_EQ = 61;
const CH_LT = 60;
const CH_GT = 62;
const CH_DQUOTE = 34;
const CH_SQUOTE = 39;

function isDigit(ch) {
  return ch >= CH_0 && ch <= CH_9;
}

function isIdentifierStart(ch) {
  return (ch >= CH_a && ch <= CH_z) ||
         (ch >= CH_A && ch <= CH_Z) ||
         ch === CH_UNDERSCORE ||
         ch === CH_DOLLAR;
}

function isIdentifierChar(ch) {
  return isIdentifierStart(ch) || isDigit(ch);
}

function isWhitespace(ch) {
  return ch === CH_SPACE || ch === CH_TAB || ch === CH_LF || ch === CH_CR;
}

function skipWhitespace() {
  while (pos < input.length && isWhitespace(input.charCodeAt(pos))) {
    pos++;
  }
}

function readNumber() {
  tokStart = pos;
  while (pos < input.length && isDigit(input.charCodeAt(pos))) {
    pos++;
  }
  tokEnd = pos;
  tokType = 'num';
  tokVal = parseInt(input.slice(tokStart, tokEnd), 10);
}

function readIdentifier() {
  tokStart = pos;
  while (pos < input.length && isIdentifierChar(input.charCodeAt(pos))) {
    pos++;
  }
  tokEnd = pos;
  const word = input.slice(tokStart, tokEnd);
  
  // Check keywords
  if (word === 'let' || word === 'const' || word === 'var' ||
      word === 'function' || word === 'if' || word === 'else' ||
      word === 'for' || word === 'while' || word === 'return' ||
      word === 'true' || word === 'false' || word === 'null') {
    tokType = word;
    tokVal = word;
  } else {
    tokType = 'name';
    tokVal = word;
  }
}

function readString(quote) {
  pos++; // skip opening quote
  tokStart = pos;
  while (pos < input.length && input.charCodeAt(pos) !== quote) {
    pos++;
  }
  tokEnd = pos;
  tokType = 'string';
  tokVal = input.slice(tokStart, tokEnd);
  pos++; // skip closing quote
}

function nextToken() {
  skipWhitespace();
  
  if (pos >= input.length) {
    tokType = 'eof';
    tokVal = null;
    return;
  }
  
  const ch = input.charCodeAt(pos);
  
  // Numbers
  if (isDigit(ch)) {
    readNumber();
    return;
  }
  
  // Identifiers and keywords
  if (isIdentifierStart(ch)) {
    readIdentifier();
    return;
  }
  
  // Strings
  if (ch === CH_DQUOTE || ch === CH_SQUOTE) {
    readString(ch);
    return;
  }
  
  // Single-char tokens
  tokStart = pos;
  pos++;
  tokEnd = pos;
  tokVal = null;
  
  switch (ch) {
    case CH_LPAREN: tokType = '('; break;
    case CH_RPAREN: tokType = ')'; break;
    case CH_LBRACE: tokType = '{'; break;
    case CH_RBRACE: tokType = '}'; break;
    case CH_LBRACKET: tokType = '['; break;
    case CH_RBRACKET: tokType = ']'; break;
    case CH_SEMICOLON: tokType = ';'; break;
    case CH_COMMA: tokType = ','; break;
    case CH_DOT: tokType = '.'; break;
    case CH_PLUS: tokType = '+'; break;
    case CH_MINUS: tokType = '-'; break;
    case CH_STAR: tokType = '*'; break;
    case CH_SLASH: tokType = '/'; break;
    case CH_EQ: tokType = '='; break;
    case CH_LT: tokType = '<'; break;
    case CH_GT: tokType = '>'; break;
    default: tokType = 'unknown'; break;
  }
}

// === TESTS ===

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

function assertTokens(code, expectedTokens) {
  reset(code);
  for (let i = 0; i < expectedTokens.length; i++) {
    nextToken();
    const exp = expectedTokens[i];
    if (tokType !== exp.type) {
      throw new Error('Token ' + i + ': expected type ' + exp.type + ', got ' + tokType);
    }
    if (exp.value !== undefined && tokVal !== exp.value) {
      throw new Error('Token ' + i + ': expected value ' + exp.value + ', got ' + tokVal);
    }
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

// === TEST CASES ===

test('single number', () => {
  assertTokens('42', [
    { type: 'num', value: 42 },
    { type: 'eof' }
  ]);
});

test('multiple numbers', () => {
  assertTokens('1 2 3', [
    { type: 'num', value: 1 },
    { type: 'num', value: 2 },
    { type: 'num', value: 3 },
    { type: 'eof' }
  ]);
});

test('identifier', () => {
  assertTokens('foo', [
    { type: 'name', value: 'foo' },
    { type: 'eof' }
  ]);
});

test('keyword let', () => {
  assertTokens('let', [
    { type: 'let', value: 'let' },
    { type: 'eof' }
  ]);
});

test('variable declaration', () => {
  assertTokens('let x = 5', [
    { type: 'let', value: 'let' },
    { type: 'name', value: 'x' },
    { type: '=' },
    { type: 'num', value: 5 },
    { type: 'eof' }
  ]);
});

test('string double quote', () => {
  assertTokens('"hello"', [
    { type: 'string', value: 'hello' },
    { type: 'eof' }
  ]);
});

test('string single quote', () => {
  assertTokens("'world'", [
    { type: 'string', value: 'world' },
    { type: 'eof' }
  ]);
});

test('function call', () => {
  assertTokens('foo(1, 2)', [
    { type: 'name', value: 'foo' },
    { type: '(' },
    { type: 'num', value: 1 },
    { type: ',' },
    { type: 'num', value: 2 },
    { type: ')' },
    { type: 'eof' }
  ]);
});

test('object literal tokens', () => {
  assertTokens('{ a }', [
    { type: '{' },
    { type: 'name', value: 'a' },
    { type: '}' },
    { type: 'eof' }
  ]);
});

test('array literal tokens', () => {
  assertTokens('[1, 2]', [
    { type: '[' },
    { type: 'num', value: 1 },
    { type: ',' },
    { type: 'num', value: 2 },
    { type: ']' },
    { type: 'eof' }
  ]);
});

test('arithmetic operators', () => {
  assertTokens('1 + 2 * 3', [
    { type: 'num', value: 1 },
    { type: '+' },
    { type: 'num', value: 2 },
    { type: '*' },
    { type: 'num', value: 3 },
    { type: 'eof' }
  ]);
});

test('comparison', () => {
  assertTokens('a < b', [
    { type: 'name', value: 'a' },
    { type: '<' },
    { type: 'name', value: 'b' },
    { type: 'eof' }
  ]);
});

test('function declaration start', () => {
  assertTokens('function foo()', [
    { type: 'function', value: 'function' },
    { type: 'name', value: 'foo' },
    { type: '(' },
    { type: ')' },
    { type: 'eof' }
  ]);
});

test('if statement start', () => {
  assertTokens('if (x) {', [
    { type: 'if', value: 'if' },
    { type: '(' },
    { type: 'name', value: 'x' },
    { type: ')' },
    { type: '{' },
    { type: 'eof' }
  ]);
});

test('return statement', () => {
  assertTokens('return 42;', [
    { type: 'return', value: 'return' },
    { type: 'num', value: 42 },
    { type: ';' },
    { type: 'eof' }
  ]);
});

runTests();
