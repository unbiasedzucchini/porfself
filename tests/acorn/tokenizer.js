// Full tokenizer for JavaScript
// Closure-free design for Porffor compatibility

// === GLOBAL STATE ===
let input = '';
let pos = 0;
let lineStart = 0;
let curLine = 1;

// Current token
let tokStart = 0;
let tokEnd = 0;
let tokType = '';
let tokVal = null;

// === CHARACTER CODES ===
const CH_0 = 48, CH_9 = 57;
const CH_a = 97, CH_z = 122;
const CH_A = 65, CH_Z = 90;
const CH_UNDERSCORE = 95, CH_DOLLAR = 36;
const CH_SPACE = 32, CH_TAB = 9, CH_LF = 10, CH_CR = 13;
const CH_LPAREN = 40, CH_RPAREN = 41;
const CH_LBRACE = 123, CH_RBRACE = 125;
const CH_LBRACKET = 91, CH_RBRACKET = 93;
const CH_SEMI = 59, CH_COMMA = 44, CH_DOT = 46;
const CH_PLUS = 43, CH_MINUS = 45, CH_STAR = 42, CH_SLASH = 47;
const CH_PERCENT = 37, CH_CARET = 94, CH_AMP = 38, CH_PIPE = 124;
const CH_TILDE = 126, CH_BANG = 33, CH_QUESTION = 63, CH_COLON = 58;
const CH_EQ = 61, CH_LT = 60, CH_GT = 62;
const CH_DQUOTE = 34, CH_SQUOTE = 39, CH_BACKTICK = 96;
const CH_BACKSLASH = 92, CH_HASH = 35, CH_AT = 64;

// === HELPERS ===
function isDigit(ch) {
  return ch >= CH_0 && ch <= CH_9;
}

function isHexDigit(ch) {
  return isDigit(ch) || (ch >= 97 && ch <= 102) || (ch >= 65 && ch <= 70);
}

function isIdentStart(ch) {
  return (ch >= CH_a && ch <= CH_z) || (ch >= CH_A && ch <= CH_Z) ||
         ch === CH_UNDERSCORE || ch === CH_DOLLAR;
}

function isIdentChar(ch) {
  return isIdentStart(ch) || isDigit(ch);
}

function parseNumStr(str) {
  const eIdx = str.indexOf('e');
  const EIdx = str.indexOf('E');
  const expIdx = eIdx >= 0 ? eIdx : EIdx;
  
  if (expIdx < 0) {
    return parseFloat(str);
  }
  
  const mantissa = parseFloat(str.slice(0, expIdx));
  const expPart = str.slice(expIdx + 1);
  const exp = parseInt(expPart, 10);
  
  let result = mantissa;
  if (exp > 0) {
    for (let i = 0; i < exp; i++) result *= 10;
  } else {
    for (let i = 0; i < -exp; i++) result /= 10;
  }
  return result;
}

function isWhitespace(ch) {

}

// === KEYWORDS ===
const keywords = {
  'break': 'break', 'case': 'case', 'catch': 'catch', 'continue': 'continue',
  'debugger': 'debugger', 'default': 'default', 'do': 'do', 'else': 'else',
  'finally': 'finally', 'for': 'for', 'function': 'function', 'if': 'if',
  'return': 'return', 'switch': 'switch', 'throw': 'throw', 'try': 'try',
  'var': 'var', 'const': 'const', 'let': 'let', 'while': 'while', 'with': 'with',
  'new': 'new', 'this': 'this', 'super': 'super', 'class': 'class',
  'extends': 'extends', 'export': 'export', 'import': 'import',
  'null': 'null', 'true': 'true', 'false': 'false',
  'in': 'in', 'instanceof': 'instanceof', 'typeof': 'typeof',
  'void': 'void', 'delete': 'delete', 'yield': 'yield', 'await': 'await',
  'async': 'async', 'static': 'static', 'get': 'get', 'set': 'set'
};

// === INIT ===
function initTokenizer(code) {
  input = code;
  pos = 0;
  lineStart = 0;
  curLine = 1;
  tokStart = 0;
  tokEnd = 0;
  tokType = '';
  tokVal = null;
}

// === SKIP WHITESPACE & COMMENTS ===
function skipSpace() {
  while (pos < input.length) {
    const ch = input.charCodeAt(pos);
    if (ch === CH_SPACE || ch === CH_TAB) {
      pos++;
    } else if (ch === CH_LF) {
      pos++;
      curLine++;
      lineStart = pos;
    } else if (ch === CH_CR) {
      pos++;
      if (pos < input.length && input.charCodeAt(pos) === CH_LF) pos++;
      curLine++;
      lineStart = pos;
    } else if (ch === CH_SLASH) {
      const next = pos + 1 < input.length ? input.charCodeAt(pos + 1) : 0;
      if (next === CH_SLASH) {
        // Line comment
        pos += 2;
        while (pos < input.length) {
          const c = input.charCodeAt(pos);
          if (c === CH_LF || c === CH_CR) break;
          pos++;
        }
      } else if (next === CH_STAR) {
        // Block comment
        pos += 2;
        while (pos < input.length) {
          const c = input.charCodeAt(pos);
          if (c === CH_STAR && pos + 1 < input.length && input.charCodeAt(pos + 1) === CH_SLASH) {
            pos += 2;
            break;
          }
          if (c === CH_LF) {
            curLine++;
            lineStart = pos + 1;
          }
          pos++;
        }
      } else {
        break;
      }
    } else {
      break;
    }
  }
}

// === READ NUMBER ===
function readNumber() {
  tokStart = pos;
  
  // Check for hex/binary/octal
  if (input.charCodeAt(pos) === CH_0 && pos + 1 < input.length) {
    const next = input.charCodeAt(pos + 1);
    if (next === 120 || next === 88) { // x or X
      pos += 2;
      while (pos < input.length && isHexDigit(input.charCodeAt(pos))) pos++;
      tokEnd = pos;
      tokType = 'num';
      tokVal = parseInt(input.slice(tokStart, tokEnd), 16);
      return;
    }
    if (next === 98 || next === 66) { // b or B
      pos += 2;
      while (pos < input.length) {
        const c = input.charCodeAt(pos);
        if (c !== 48 && c !== 49) break;
        pos++;
      }
      tokEnd = pos;
      tokType = 'num';
      tokVal = parseInt(input.slice(tokStart + 2, tokEnd), 2);
      return;
    }
    if (next === 111 || next === 79) { // o or O
      pos += 2;
      while (pos < input.length) {
        const c = input.charCodeAt(pos);
        if (c < 48 || c > 55) break;
        pos++;
      }
      tokEnd = pos;
      tokType = 'num';
      tokVal = parseInt(input.slice(tokStart + 2, tokEnd), 8);
      return;
    }
  }
  
  // Decimal
  while (pos < input.length && isDigit(input.charCodeAt(pos))) pos++;
  
  // Decimal point
  if (pos < input.length && input.charCodeAt(pos) === CH_DOT) {
    pos++;
    while (pos < input.length && isDigit(input.charCodeAt(pos))) pos++;
  }
  
  // Exponent
  if (pos < input.length) {
    const e = input.charCodeAt(pos);
    if (e === 101 || e === 69) { // e or E
      pos++;
      const sign = input.charCodeAt(pos);
      if (sign === CH_PLUS || sign === CH_MINUS) pos++;
      while (pos < input.length && isDigit(input.charCodeAt(pos))) pos++;
    }
  }
  
  tokEnd = pos;
  tokType = 'num';
  tokVal = parseNumStr(input.slice(tokStart, tokEnd));
}

// === READ STRING ===
function readString(quote) {
  pos++; // skip opening quote
  let out = '';
  
  while (pos < input.length) {
    const ch = input.charCodeAt(pos);
    if (ch === quote) {
      pos++;
      break;
    }
    if (ch === CH_BACKSLASH) {
      pos++;
      if (pos >= input.length) break;
      const esc = input.charCodeAt(pos);
      pos++;
      if (esc === 110) out += '\n';
      else if (esc === 114) out += '\r';
      else if (esc === 116) out += '\t';
      else if (esc === 98) out += '\b';
      else if (esc === 102) out += '\f';
      else if (esc === 118) out += '\v';
      else if (esc === 48) out += '\0';
      else if (esc === CH_BACKSLASH) out += '\\';
      else if (esc === quote) out += String.fromCharCode(quote);
      else out += String.fromCharCode(esc);
    } else if (ch === CH_LF || ch === CH_CR) {
      break; // unterminated string
    } else {
      out += input[pos];
      pos++;
    }
  }
  
  tokType = 'string';
  tokVal = out;
}

// === READ IDENTIFIER ===
function readIdent() {
  tokStart = pos;
  while (pos < input.length && isIdentChar(input.charCodeAt(pos))) pos++;
  tokEnd = pos;
  
  const word = input.slice(tokStart, tokEnd);
  if (keywords[word]) {
    tokType = word;
    tokVal = word;
  } else {
    tokType = 'name';
    tokVal = word;
  }
}

// === READ OPERATOR ===
function readOp() {
  tokStart = pos;
  const ch = input.charCodeAt(pos);
  const next = pos + 1 < input.length ? input.charCodeAt(pos + 1) : 0;
  const third = pos + 2 < input.length ? input.charCodeAt(pos + 2) : 0;
  
  // Three-char operators
  if (ch === CH_DOT && next === CH_DOT && third === CH_DOT) {
    pos += 3; tokType = '...'; return;
  }
  if (ch === CH_EQ && next === CH_EQ && third === CH_EQ) {
    pos += 3; tokType = '==='; return;
  }
  if (ch === CH_BANG && next === CH_EQ && third === CH_EQ) {
    pos += 3; tokType = '!=='; return;
  }
  if (ch === CH_STAR && next === CH_STAR && third === CH_EQ) {
    pos += 3; tokType = '**='; return;
  }
  if (ch === CH_LT && next === CH_LT && third === CH_EQ) {
    pos += 3; tokType = '<<='; return;
  }
  if (ch === CH_GT && next === CH_GT && third === CH_EQ) {
    pos += 3; tokType = '>>='; return;
  }
  if (ch === CH_GT && next === CH_GT && third === CH_GT) {
    pos += 3; tokType = '>>>'; return;
  }
  if (ch === CH_AMP && next === CH_AMP && third === CH_EQ) {
    pos += 3; tokType = '&&='; return;
  }
  if (ch === CH_PIPE && next === CH_PIPE && third === CH_EQ) {
    pos += 3; tokType = '||='; return;
  }
  if (ch === CH_QUESTION && next === CH_QUESTION && third === CH_EQ) {
    pos += 3; tokType = '??='; return;
  }
  
  // Two-char operators
  if (ch === CH_EQ && next === CH_GT) { pos += 2; tokType = '=>'; return; }
  if (ch === CH_EQ && next === CH_EQ) { pos += 2; tokType = '=='; return; }
  if (ch === CH_BANG && next === CH_EQ) { pos += 2; tokType = '!='; return; }
  if (ch === CH_LT && next === CH_EQ) { pos += 2; tokType = '<='; return; }
  if (ch === CH_GT && next === CH_EQ) { pos += 2; tokType = '>='; return; }
  if (ch === CH_LT && next === CH_LT) { pos += 2; tokType = '<<'; return; }
  if (ch === CH_GT && next === CH_GT) { pos += 2; tokType = '>>'; return; }
  if (ch === CH_PLUS && next === CH_PLUS) { pos += 2; tokType = '++'; return; }
  if (ch === CH_MINUS && next === CH_MINUS) { pos += 2; tokType = '--'; return; }
  if (ch === CH_PLUS && next === CH_EQ) { pos += 2; tokType = '+='; return; }
  if (ch === CH_MINUS && next === CH_EQ) { pos += 2; tokType = '-='; return; }
  if (ch === CH_STAR && next === CH_EQ) { pos += 2; tokType = '*='; return; }
  if (ch === CH_SLASH && next === CH_EQ) { pos += 2; tokType = '/='; return; }
  if (ch === CH_PERCENT && next === CH_EQ) { pos += 2; tokType = '%='; return; }
  if (ch === CH_AMP && next === CH_EQ) { pos += 2; tokType = '&='; return; }
  if (ch === CH_PIPE && next === CH_EQ) { pos += 2; tokType = '|='; return; }
  if (ch === CH_CARET && next === CH_EQ) { pos += 2; tokType = '^='; return; }
  if (ch === CH_STAR && next === CH_STAR) { pos += 2; tokType = '**'; return; }
  if (ch === CH_AMP && next === CH_AMP) { pos += 2; tokType = '&&'; return; }
  if (ch === CH_PIPE && next === CH_PIPE) { pos += 2; tokType = '||'; return; }
  if (ch === CH_QUESTION && next === CH_QUESTION) { pos += 2; tokType = '??'; return; }
  if (ch === CH_QUESTION && next === CH_DOT) { pos += 2; tokType = '?.'; return; }
  
  // Single-char operators
  pos++;
  tokType = input[pos - 1];
}

// === NEXT TOKEN ===
function nextToken() {
  skipSpace();
  tokStart = pos;
  tokVal = null;
  
  if (pos >= input.length) {
    tokType = 'eof';
    return;
  }
  
  const ch = input.charCodeAt(pos);
  
  if (isDigit(ch)) {
    readNumber();
    return;
  }
  
  if (isIdentStart(ch)) {
    readIdent();
    return;
  }
  
  if (ch === CH_DQUOTE || ch === CH_SQUOTE) {
    readString(ch);
    return;
  }
  
  if (ch === CH_BACKTICK) {
    // Template literal - simplified, just read as string for now
    pos++;
    let out = '';
    while (pos < input.length && input.charCodeAt(pos) !== CH_BACKTICK) {
      out += input[pos];
      pos++;
    }
    if (pos < input.length) pos++;
    tokType = 'template';
    tokVal = out;
    return;
  }
  
  readOp();
}

// === EXPORTS FOR TESTING ===

// === TEST FRAMEWORK ===
const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function assertEquals(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error((msg || '') + ' Expected ' + expected + ', got ' + actual);
  }
}

function assertTokens(code, expectedTokens) {
  initTokenizer(code);
  for (let i = 0; i < expectedTokens.length; i++) {
    nextToken();
    const exp = expectedTokens[i];
    if (tokType !== exp.type) {
      throw new Error('Token ' + i + ': expected type "' + exp.type + '", got "' + tokType + '"');
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

// === BASIC TESTS ===
test('number integer', () => {
  assertTokens('42', [{ type: 'num', value: 42 }, { type: 'eof' }]);
});

test('number float', () => {
  assertTokens('3.14', [{ type: 'num', value: 3.14 }, { type: 'eof' }]);
});

test('number exponent', () => {
  assertTokens('1e10', [{ type: 'num', value: 1e10 }, { type: 'eof' }]);
});

test('number hex', () => {
  assertTokens('0xff', [{ type: 'num', value: 255 }, { type: 'eof' }]);
});

test('number binary', () => {
  assertTokens('0b1010', [{ type: 'num', value: 10 }, { type: 'eof' }]);
});

test('number octal', () => {
  assertTokens('0o17', [{ type: 'num', value: 15 }, { type: 'eof' }]);
});

// === STRING TESTS ===
test('string double quote', () => {
  assertTokens('"hello"', [{ type: 'string', value: 'hello' }, { type: 'eof' }]);
});

test('string single quote', () => {
  assertTokens("'world'", [{ type: 'string', value: 'world' }, { type: 'eof' }]);
});

test('string escape sequences', () => {
  assertTokens('"a\\nb"', [{ type: 'string', value: 'a\nb' }, { type: 'eof' }]);
});

test('string escaped quote', () => {
  assertTokens('"a\\"b"', [{ type: 'string', value: 'a"b' }, { type: 'eof' }]);
});

// === IDENTIFIER TESTS ===
test('identifier simple', () => {
  assertTokens('foo', [{ type: 'name', value: 'foo' }, { type: 'eof' }]);
});

test('identifier with underscore', () => {
  assertTokens('_private', [{ type: 'name', value: '_private' }, { type: 'eof' }]);
});

test('identifier with dollar', () => {
  assertTokens('$elem', [{ type: 'name', value: '$elem' }, { type: 'eof' }]);
});

test('identifier with numbers', () => {
  assertTokens('var1', [{ type: 'name', value: 'var1' }, { type: 'eof' }]);
});

// === KEYWORD TESTS ===
test('keyword let', () => {
  assertTokens('let', [{ type: 'let', value: 'let' }, { type: 'eof' }]);
});

test('keyword const', () => {
  assertTokens('const', [{ type: 'const', value: 'const' }, { type: 'eof' }]);
});

test('keyword function', () => {
  assertTokens('function', [{ type: 'function', value: 'function' }, { type: 'eof' }]);
});

test('keyword async', () => {
  assertTokens('async', [{ type: 'async', value: 'async' }, { type: 'eof' }]);
});

test('keyword await', () => {
  assertTokens('await', [{ type: 'await', value: 'await' }, { type: 'eof' }]);
});

// === OPERATOR TESTS ===
test('operator arrow', () => {
  assertTokens('=>', [{ type: '=>' }, { type: 'eof' }]);
});

test('operator spread', () => {
  assertTokens('...', [{ type: '...' }, { type: 'eof' }]);
});

test('operator strict equal', () => {
  assertTokens('===', [{ type: '===' }, { type: 'eof' }]);
});

test('operator strict not equal', () => {
  assertTokens('!==', [{ type: '!==' }, { type: 'eof' }]);
});

test('operator increment', () => {
  assertTokens('++', [{ type: '++' }, { type: 'eof' }]);
});

test('operator decrement', () => {
  assertTokens('--', [{ type: '--' }, { type: 'eof' }]);
});

test('operator logical and', () => {
  assertTokens('&&', [{ type: '&&' }, { type: 'eof' }]);
});

test('operator logical or', () => {
  assertTokens('||', [{ type: '||' }, { type: 'eof' }]);
});

test('operator nullish', () => {
  assertTokens('??', [{ type: '??' }, { type: 'eof' }]);
});

test('operator optional chain', () => {
  assertTokens('?.', [{ type: '?.' }, { type: 'eof' }]);
});

test('operator exponent', () => {
  assertTokens('**', [{ type: '**' }, { type: 'eof' }]);
});

test('operator shift left', () => {
  assertTokens('<<', [{ type: '<<' }, { type: 'eof' }]);
});

test('operator shift right', () => {
  assertTokens('>>', [{ type: '>>' }, { type: 'eof' }]);
});

test('operator unsigned shift', () => {
  assertTokens('>>>', [{ type: '>>>' }, { type: 'eof' }]);
});

// === COMPOUND ASSIGNMENT ===
test('operator plus assign', () => {
  assertTokens('+=', [{ type: '+=' }, { type: 'eof' }]);
});

test('operator and assign', () => {
  assertTokens('&&=', [{ type: '&&=' }, { type: 'eof' }]);
});

test('operator nullish assign', () => {
  assertTokens('??=', [{ type: '??=' }, { type: 'eof' }]);
});

// === COMMENT TESTS ===
test('line comment', () => {
  assertTokens('a // comment\nb', [
    { type: 'name', value: 'a' },
    { type: 'name', value: 'b' },
    { type: 'eof' }
  ]);
});

test('block comment', () => {
  assertTokens('a /* comment */ b', [
    { type: 'name', value: 'a' },
    { type: 'name', value: 'b' },
    { type: 'eof' }
  ]);
});

test('multiline block comment', () => {
  assertTokens('a /* line1\nline2 */ b', [
    { type: 'name', value: 'a' },
    { type: 'name', value: 'b' },
    { type: 'eof' }
  ]);
});

// === TEMPLATE LITERAL ===
test('template literal simple', () => {
  assertTokens('`hello`', [{ type: 'template', value: 'hello' }, { type: 'eof' }]);
});

// === COMPLEX EXPRESSIONS ===
test('arrow function', () => {
  assertTokens('x => x + 1', [
    { type: 'name', value: 'x' },
    { type: '=>' },
    { type: 'name', value: 'x' },
    { type: '+' },
    { type: 'num', value: 1 },
    { type: 'eof' }
  ]);
});

test('async arrow', () => {
  assertTokens('async () => {}', [
    { type: 'async', value: 'async' },
    { type: '(' },
    { type: ')' },
    { type: '=>' },
    { type: '{' },
    { type: '}' },
    { type: 'eof' }
  ]);
});

test('spread operator', () => {
  assertTokens('[...arr]', [
    { type: '[' },
    { type: '...' },
    { type: 'name', value: 'arr' },
    { type: ']' },
    { type: 'eof' }
  ]);
});

test('optional chaining', () => {
  assertTokens('a?.b?.c', [
    { type: 'name', value: 'a' },
    { type: '?.' },
    { type: 'name', value: 'b' },
    { type: '?.' },
    { type: 'name', value: 'c' },
    { type: 'eof' }
  ]);
});

test('nullish coalescing', () => {
  assertTokens('a ?? b', [
    { type: 'name', value: 'a' },
    { type: '??' },
    { type: 'name', value: 'b' },
    { type: 'eof' }
  ]);
});

test('class declaration', () => {
  assertTokens('class Foo extends Bar {}', [
    { type: 'class', value: 'class' },
    { type: 'name', value: 'Foo' },
    { type: 'extends', value: 'extends' },
    { type: 'name', value: 'Bar' },
    { type: '{' },
    { type: '}' },
    { type: 'eof' }
  ]);
});

test('destructuring', () => {
  assertTokens('const { a, b } = obj', [
    { type: 'const', value: 'const' },
    { type: '{' },
    { type: 'name', value: 'a' },
    { type: ',' },
    { type: 'name', value: 'b' },
    { type: '}' },
    { type: '=' },
    { type: 'name', value: 'obj' },
    { type: 'eof' }
  ]);
});

test('comparison chain', () => {
  assertTokens('a === b !== c', [
    { type: 'name', value: 'a' },
    { type: '===' },
    { type: 'name', value: 'b' },
    { type: '!==' },
    { type: 'name', value: 'c' },
    { type: 'eof' }
  ]);
});

test('exponentiation', () => {
  assertTokens('2 ** 10', [
    { type: 'num', value: 2 },
    { type: '**' },
    { type: 'num', value: 10 },
    { type: 'eof' }
  ]);
});

// Run all tests
runTests();
