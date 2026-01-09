// JavaScript Parser - Closure-free design for Porffor
// Builds AST compatible with ESTree/acorn format

// ============================================================
// TOKENIZER (copied from tokenizer.js for standalone operation)
// ============================================================

let input = '';
let pos = 0;
let lineStart = 0;
let curLine = 1;
let tokStart = 0;
let tokEnd = 0;
let tokType = '';
let tokVal = null;

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
const CH_BACKSLASH = 92;

function isDigit(ch) { return ch >= CH_0 && ch <= CH_9; }
function isHexDigit(ch) { return isDigit(ch) || (ch >= 97 && ch <= 102) || (ch >= 65 && ch <= 70); }
function isIdentStart(ch) {
  return (ch >= CH_a && ch <= CH_z) || (ch >= CH_A && ch <= CH_Z) ||
         ch === CH_UNDERSCORE || ch === CH_DOLLAR;
}
function isIdentChar(ch) { return isIdentStart(ch) || isDigit(ch); }

function parseNumStr(str) {
  const eIdx = str.indexOf('e');
  const EIdx = str.indexOf('E');
  const expIdx = eIdx >= 0 ? eIdx : EIdx;
  if (expIdx < 0) return parseFloat(str);
  const mantissa = parseFloat(str.slice(0, expIdx));
  const exp = parseInt(str.slice(expIdx + 1), 10);
  let result = mantissa;
  if (exp > 0) { for (let i = 0; i < exp; i++) result *= 10; }
  else { for (let i = 0; i < -exp; i++) result /= 10; }
  return result;
}

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

function initParser(code) {
  input = code;
  pos = 0;
  lineStart = 0;
  curLine = 1;
  nextToken();
}

function skipSpace() {
  while (pos < input.length) {
    const ch = input.charCodeAt(pos);
    if (ch === CH_SPACE || ch === CH_TAB) { pos++; }
    else if (ch === CH_LF) { pos++; curLine++; lineStart = pos; }
    else if (ch === CH_CR) {
      pos++;
      if (pos < input.length && input.charCodeAt(pos) === CH_LF) pos++;
      curLine++; lineStart = pos;
    } else if (ch === CH_SLASH) {
      const next = pos + 1 < input.length ? input.charCodeAt(pos + 1) : 0;
      if (next === CH_SLASH) {
        pos += 2;
        while (pos < input.length && input.charCodeAt(pos) !== CH_LF && input.charCodeAt(pos) !== CH_CR) pos++;
      } else if (next === CH_STAR) {
        pos += 2;
        while (pos < input.length) {
          if (input.charCodeAt(pos) === CH_STAR && input.charCodeAt(pos + 1) === CH_SLASH) { pos += 2; break; }
          if (input.charCodeAt(pos) === CH_LF) { curLine++; lineStart = pos + 1; }
          pos++;
        }
      } else break;
    } else break;
  }
}

function readNumber() {
  tokStart = pos;
  if (input.charCodeAt(pos) === CH_0 && pos + 1 < input.length) {
    const next = input.charCodeAt(pos + 1);
    if (next === 120 || next === 88) { // hex
      pos += 2;
      while (pos < input.length && isHexDigit(input.charCodeAt(pos))) pos++;
      tokEnd = pos; tokType = 'num';
      tokVal = parseInt(input.slice(tokStart, tokEnd), 16);
      return;
    }
    if (next === 98 || next === 66) { // binary
      pos += 2;
      while (pos < input.length && (input.charCodeAt(pos) === 48 || input.charCodeAt(pos) === 49)) pos++;
      tokEnd = pos; tokType = 'num';
      tokVal = parseInt(input.slice(tokStart + 2, tokEnd), 2);
      return;
    }
    if (next === 111 || next === 79) { // octal
      pos += 2;
      while (pos < input.length && input.charCodeAt(pos) >= 48 && input.charCodeAt(pos) <= 55) pos++;
      tokEnd = pos; tokType = 'num';
      tokVal = parseInt(input.slice(tokStart + 2, tokEnd), 8);
      return;
    }
  }
  while (pos < input.length && isDigit(input.charCodeAt(pos))) pos++;
  if (pos < input.length && input.charCodeAt(pos) === CH_DOT) {
    pos++;
    while (pos < input.length && isDigit(input.charCodeAt(pos))) pos++;
  }
  if (pos < input.length && (input.charCodeAt(pos) === 101 || input.charCodeAt(pos) === 69)) {
    pos++;
    if (input.charCodeAt(pos) === CH_PLUS || input.charCodeAt(pos) === CH_MINUS) pos++;
    while (pos < input.length && isDigit(input.charCodeAt(pos))) pos++;
  }
  tokEnd = pos; tokType = 'num';
  tokVal = parseNumStr(input.slice(tokStart, tokEnd));
}

function readString(quote) {
  pos++;
  let out = '';
  while (pos < input.length) {
    const ch = input.charCodeAt(pos);
    if (ch === quote) { pos++; break; }
    if (ch === CH_BACKSLASH) {
      pos++;
      const esc = input.charCodeAt(pos); pos++;
      if (esc === 110) out += '\n';
      else if (esc === 114) out += '\r';
      else if (esc === 116) out += '\t';
      else if (esc === 48) out += '\0';
      else out += String.fromCharCode(esc);
    } else { out += input[pos]; pos++; }
  }
  tokType = 'string'; tokVal = out;
}

function readIdent() {
  tokStart = pos;
  while (pos < input.length && isIdentChar(input.charCodeAt(pos))) pos++;
  tokEnd = pos;
  const word = input.slice(tokStart, tokEnd);
  tokType = keywords[word] || 'name';
  tokVal = word;
}

function readOp() {
  tokStart = pos;
  const ch = input.charCodeAt(pos);
  const next = pos + 1 < input.length ? input.charCodeAt(pos + 1) : 0;
  const third = pos + 2 < input.length ? input.charCodeAt(pos + 2) : 0;
  
  // Three-char
  if (ch === CH_DOT && next === CH_DOT && third === CH_DOT) { pos += 3; tokType = '...'; return; }
  if (ch === CH_EQ && next === CH_EQ && third === CH_EQ) { pos += 3; tokType = '==='; return; }
  if (ch === CH_BANG && next === CH_EQ && third === CH_EQ) { pos += 3; tokType = '!=='; return; }
  if (ch === CH_GT && next === CH_GT && third === CH_GT) { pos += 3; tokType = '>>>'; return; }
  
  // Two-char
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
  if (ch === CH_STAR && next === CH_STAR) { pos += 2; tokType = '**'; return; }
  if (ch === CH_AMP && next === CH_AMP) { pos += 2; tokType = '&&'; return; }
  if (ch === CH_PIPE && next === CH_PIPE) { pos += 2; tokType = '||'; return; }
  if (ch === CH_QUESTION && next === CH_QUESTION) { pos += 2; tokType = '??'; return; }
  if (ch === CH_QUESTION && next === CH_DOT) { pos += 2; tokType = '?.'; return; }
  
  // Single-char
  pos++; tokType = input[pos - 1];
}

function nextToken() {
  skipSpace();
  tokStart = pos; tokVal = null;
  if (pos >= input.length) { tokType = 'eof'; return; }
  const ch = input.charCodeAt(pos);
  if (isDigit(ch)) { readNumber(); return; }
  if (isIdentStart(ch)) { readIdent(); return; }
  if (ch === CH_DQUOTE || ch === CH_SQUOTE) { readString(ch); return; }
  if (ch === CH_BACKTICK) {
    pos++; let out = '';
    while (pos < input.length && input.charCodeAt(pos) !== CH_BACKTICK) { out += input[pos]; pos++; }
    if (pos < input.length) pos++;
    tokType = 'template'; tokVal = out; return;
  }
  readOp();
}

// ============================================================
// PARSER - Builds ESTree-compatible AST
// ============================================================

function eat(type) {
  if (tokType === type) { nextToken(); return true; }
  return false;
}

function expect(type) {
  if (tokType !== type) {
    throw new Error('Expected ' + type + ', got ' + tokType + ' at position ' + tokStart);
  }
  nextToken();
}

function node(type, start) {
  return { type: type, start: start, end: 0 };
}

function finishNode(n, end) {
  n.end = end;
  return n;
}

// === PRIMARY EXPRESSIONS ===
function parsePrimary() {
  const start = tokStart;
  
  if (tokType === 'num') {
    const n = node('Literal', start);
    n.value = tokVal;
    n.raw = input.slice(tokStart, tokEnd);
    nextToken();
    return finishNode(n, tokStart);
  }
  
  if (tokType === 'string') {
    const n = node('Literal', start);
    n.value = tokVal;
    nextToken();
    return finishNode(n, tokStart);
  }
  
  if (tokType === 'true' || tokType === 'false') {
    const n = node('Literal', start);
    n.value = tokType === 'true';
    n.raw = tokType;
    nextToken();
    return finishNode(n, tokStart);
  }
  
  if (tokType === 'null') {
    const n = node('Literal', start);
    n.value = null;
    n.raw = 'null';
    nextToken();
    return finishNode(n, tokStart);
  }
  
  if (tokType === 'name') {
    const n = node('Identifier', start);
    n.name = tokVal;
    nextToken();
    return finishNode(n, tokStart);
  }
  
  if (tokType === 'this') {
    const n = node('ThisExpression', start);
    nextToken();
    return finishNode(n, tokStart);
  }
  
  if (tokType === '(') {
    nextToken();
    const expr = parseExpression();
    expect(')');
    return expr;
  }
  
  if (tokType === '[') {
    return parseArrayLiteral();
  }
  
  if (tokType === '{') {
    return parseObjectLiteral();
  }
  
  if (tokType === 'function') {
    return parseFunctionExpr();
  }
  
  if (tokType === 'new') {
    return parseNew();
  }
  
  throw new Error('Unexpected token: ' + tokType);
}

function parseNew() {
  const start = tokStart;
  nextToken(); // eat 'new'
  const n = node('NewExpression', start);
  n.callee = parseSubscripts(parsePrimary());
  n.arguments = [];
  if (tokType === '(') {
    n.arguments = parseArguments();
  }
  return finishNode(n, tokStart);
}

function parseArrayLiteral() {
  const start = tokStart;
  const n = node('ArrayExpression', start);
  n.elements = [];
  expect('[');
  while (tokType !== ']' && tokType !== 'eof') {
    if (tokType === ',') {
      n.elements.push(null);
      nextToken();
    } else if (tokType === '...') {
      nextToken();
      const spread = node('SpreadElement', tokStart);
      spread.argument = parseAssignment();
      n.elements.push(finishNode(spread, tokStart));
      if (tokType !== ']') expect(',');
    } else {
      n.elements.push(parseAssignment());
      if (tokType !== ']') expect(',');
    }
  }
  expect(']');
  return finishNode(n, tokStart);
}

function parseObjectLiteral() {
  const start = tokStart;
  const n = node('ObjectExpression', start);
  n.properties = [];
  expect('{');
  while (tokType !== '}' && tokType !== 'eof') {
    const prop = node('Property', tokStart);
    prop.method = false;
    prop.shorthand = false;
    prop.computed = false;
    prop.kind = 'init';
    
    if (tokType === '...') {
      nextToken();
      const spread = node('SpreadElement', tokStart);
      spread.argument = parseAssignment();
      n.properties.push(finishNode(spread, tokStart));
    } else {
      // Property key
      if (tokType === '[') {
        prop.computed = true;
        nextToken();
        prop.key = parseAssignment();
        expect(']');
      } else if (tokType === 'name' || tokType === 'string' || tokType === 'num') {
        if (tokType === 'name') {
          prop.key = node('Identifier', tokStart);
          prop.key.name = tokVal;
        } else {
          prop.key = node('Literal', tokStart);
          prop.key.value = tokVal;
        }
        finishNode(prop.key, tokEnd);
        nextToken();
      }
      
      if (tokType === ':') {
        nextToken();
        prop.value = parseAssignment();
      } else {
        // Shorthand
        prop.shorthand = true;
        prop.value = node('Identifier', prop.key.start);
        prop.value.name = prop.key.name;
        finishNode(prop.value, prop.key.end);
      }
      
      n.properties.push(finishNode(prop, tokStart));
    }
    
    if (tokType !== '}') eat(',');
  }
  expect('}');
  return finishNode(n, tokStart);
}

// === MEMBER/CALL EXPRESSIONS ===
function parseSubscripts(base) {
  while (true) {
    if (tokType === '.') {
      nextToken();
      const n = node('MemberExpression', base.start);
      n.object = base;
      n.property = node('Identifier', tokStart);
      n.property.name = tokVal;
      finishNode(n.property, tokEnd);
      nextToken();
      n.computed = false;
      n.optional = false;
      base = finishNode(n, tokStart);
    } else if (tokType === '?.') {
      nextToken();
      const n = node('MemberExpression', base.start);
      n.object = base;
      n.property = node('Identifier', tokStart);
      n.property.name = tokVal;
      finishNode(n.property, tokEnd);
      nextToken();
      n.computed = false;
      n.optional = true;
      base = finishNode(n, tokStart);
    } else if (tokType === '[') {
      nextToken();
      const n = node('MemberExpression', base.start);
      n.object = base;
      n.property = parseExpression();
      expect(']');
      n.computed = true;
      n.optional = false;
      base = finishNode(n, tokStart);
    } else if (tokType === '(') {
      const n = node('CallExpression', base.start);
      n.callee = base;
      n.arguments = parseArguments();
      n.optional = false;
      base = finishNode(n, tokStart);
    } else {
      break;
    }
  }
  return base;
}

function parseArguments() {
  const args = [];
  expect('(');
  while (tokType !== ')' && tokType !== 'eof') {
    if (tokType === '...') {
      nextToken();
      const spread = node('SpreadElement', tokStart);
      spread.argument = parseAssignment();
      args.push(finishNode(spread, tokStart));
    } else {
      args.push(parseAssignment());
    }
    if (tokType !== ')') expect(',');
  }
  expect(')');
  return args;
}

// === UNARY EXPRESSIONS ===
function parseUnary() {
  const start = tokStart;
  
  if (tokType === '!' || tokType === '~' || tokType === '-' || tokType === '+' ||
      tokType === 'typeof' || tokType === 'void' || tokType === 'delete') {
    const op = tokType;
    nextToken();
    const n = node('UnaryExpression', start);
    n.operator = op;
    n.prefix = true;
    n.argument = parseUnary();
    return finishNode(n, tokStart);
  }
  
  if (tokType === '++' || tokType === '--') {
    const op = tokType;
    nextToken();
    const n = node('UpdateExpression', start);
    n.operator = op;
    n.prefix = true;
    n.argument = parseUnary();
    return finishNode(n, tokStart);
  }
  
  let expr = parsePrimary();
  expr = parseSubscripts(expr);
  
  // Postfix ++/--
  if (tokType === '++' || tokType === '--') {
    const n = node('UpdateExpression', expr.start);
    n.operator = tokType;
    n.prefix = false;
    n.argument = expr;
    nextToken();
    return finishNode(n, tokStart);
  }
  
  return expr;
}

// === BINARY EXPRESSIONS ===
// Precedence climbing
const PREC = {
  '||': 1, '??': 1,
  '&&': 2,
  '|': 3,
  '^': 4,
  '&': 5,
  '==': 6, '!=': 6, '===': 6, '!==': 6,
  '<': 7, '>': 7, '<=': 7, '>=': 7, 'in': 7, 'instanceof': 7,
  '<<': 8, '>>': 8, '>>>': 8,
  '+': 9, '-': 9,
  '*': 10, '/': 10, '%': 10,
  '**': 11
};

function parseBinary(minPrec) {
  let left = parseUnary();
  
  while (true) {
    const prec = PREC[tokType];
    if (prec === undefined || prec < minPrec) break;
    
    const op = tokType;
    const start = left.start;
    nextToken();
    
    // Right associative for **
    const nextPrec = op === '**' ? prec : prec + 1;
    const right = parseBinary(nextPrec);
    
    const n = op === '&&' || op === '||' || op === '??'
      ? node('LogicalExpression', start)
      : node('BinaryExpression', start);
    n.left = left;
    n.operator = op;
    n.right = right;
    left = finishNode(n, tokStart);
  }
  
  return left;
}

// === CONDITIONAL EXPRESSION ===
function parseConditional() {
  const start = tokStart;
  let expr = parseBinary(1);
  
  if (tokType === '?') {
    nextToken();
    const n = node('ConditionalExpression', start);
    n.test = expr;
    n.consequent = parseAssignment();
    expect(':');
    n.alternate = parseAssignment();
    return finishNode(n, tokStart);
  }
  
  return expr;
}

// === ASSIGNMENT EXPRESSION ===
function parseAssignment() {
  const start = tokStart;
  
  // Check for arrow function: x => or (x) => or (x, y) =>
  if (tokType === 'name') {
    const savedPos = pos;
    const savedTokStart = tokStart;
    const savedTokType = tokType;
    const savedTokVal = tokVal;
    const paramName = tokVal;
    nextToken();
    if (tokType === '=>') {
      return parseArrowFunction(start, [paramName]);
    }
    // Restore state
    pos = savedPos;
    tokStart = savedTokStart;
    tokType = savedTokType;
    tokVal = savedTokVal;
  }
  
  if (tokType === '(') {
    // Could be arrow function or grouped expression
    const savedPos = pos;
    const savedTokStart = tokStart;
    nextToken();
    const params = [];
    while (tokType !== ')' && tokType !== 'eof') {
      if (tokType === 'name') {
        params.push(tokVal);
        nextToken();
        if (tokType === ',') nextToken();
      } else if (tokType === '...') {
        // rest param - it's an arrow
        break;
      } else {
        break;
      }
    }
    if (tokType === ')') {
      nextToken();
      if (tokType === '=>') {
        return parseArrowFunction(start, params);
      }
    }
    // Restore state and parse as grouped expression
    pos = savedPos;
    tokStart = savedTokStart;
    tokType = '(';
    tokVal = null;
  }
  
  let left = parseConditional();
  
  if (tokType === '=' || tokType === '+=' || tokType === '-=' ||
      tokType === '*=' || tokType === '/=' || tokType === '%=' ||
      tokType === '**=' || tokType === '<<=' || tokType === '>>=' ||
      tokType === '&=' || tokType === '|=' || tokType === '^=' ||
      tokType === '&&=' || tokType === '||=' || tokType === '??=') {
    const op = tokType;
    nextToken();
    const n = node('AssignmentExpression', start);
    n.operator = op;
    n.left = left;
    n.right = parseAssignment();
    return finishNode(n, tokStart);
  }
  
  return left;
}

function parseArrowFunction(start, paramNames) {
  nextToken(); // eat '=>'
  const n = node('ArrowFunctionExpression', start);
  n.id = null;
  n.generator = false;
  n.async = false;
  n.expression = tokType !== '{';
  
  n.params = [];
  for (let i = 0; i < paramNames.length; i++) {
    const p = node('Identifier', start);
    p.name = paramNames[i];
    n.params.push(finishNode(p, start));
  }
  
  if (tokType === '{') {
    n.body = parseBlock();
  } else {
    n.body = parseAssignment();
  }
  
  return finishNode(n, tokStart);
}

// === SEQUENCE EXPRESSION ===
function parseExpression() {
  const start = tokStart;
  let expr = parseAssignment();
  
  if (tokType === ',') {
    const exprs = [expr];
    while (eat(',')) {
      exprs.push(parseAssignment());
    }
    const n = node('SequenceExpression', start);
    n.expressions = exprs;
    return finishNode(n, tokStart);
  }
  
  return expr;
}

// === STATEMENTS ===
function parseStatement() {
  const start = tokStart;
  
  if (tokType === '{') return parseBlock();
  if (tokType === 'var' || tokType === 'let' || tokType === 'const') return parseVarDecl();
  if (tokType === 'if') return parseIf();
  if (tokType === 'while') return parseWhile();
  if (tokType === 'for') return parseFor();
  if (tokType === 'return') return parseReturn();
  if (tokType === 'throw') return parseThrow();
  if (tokType === 'try') return parseTry();
  if (tokType === 'function') return parseFunctionDecl();
  if (tokType === 'class') return parseClass();
  if (tokType === ';') {
    nextToken();
    const n = node('EmptyStatement', start);
    return finishNode(n, tokStart);
  }
  
  // Expression statement
  const expr = parseExpression();
  const n = node('ExpressionStatement', start);
  n.expression = expr;
  eat(';');
  return finishNode(n, tokStart);
}

function parseBlock() {
  const start = tokStart;
  const n = node('BlockStatement', start);
  n.body = [];
  expect('{');
  while (tokType !== '}' && tokType !== 'eof') {
    n.body.push(parseStatement());
  }
  expect('}');
  return finishNode(n, tokStart);
}

function parseVarDecl() {
  const start = tokStart;
  const kind = tokType;
  nextToken();
  const n = node('VariableDeclaration', start);
  n.kind = kind;
  n.declarations = [];
  
  do {
    const decl = node('VariableDeclarator', tokStart);
    decl.id = parseBindingPattern();
    decl.init = null;
    if (eat('=')) {
      decl.init = parseAssignment();
    }
    n.declarations.push(finishNode(decl, tokStart));
  } while (eat(','));
  
  eat(';');
  return finishNode(n, tokStart);
}

function parseBindingPattern() {
  if (tokType === 'name') {
    const n = node('Identifier', tokStart);
    n.name = tokVal;
    nextToken();
    return finishNode(n, tokStart);
  }
  if (tokType === '{') {
    return parseObjectPattern();
  }
  if (tokType === '[') {
    return parseArrayPattern();
  }
  throw new Error('Expected binding pattern');
}

function parseObjectPattern() {
  const start = tokStart;
  const n = node('ObjectPattern', start);
  n.properties = [];
  expect('{');
  while (tokType !== '}' && tokType !== 'eof') {
    const prop = node('Property', tokStart);
    prop.method = false;
    prop.shorthand = false;
    prop.computed = false;
    prop.kind = 'init';
    
    if (tokType === '...') {
      nextToken();
      const rest = node('RestElement', tokStart);
      rest.argument = parseBindingPattern();
      n.properties.push(finishNode(rest, tokStart));
    } else {
      prop.key = node('Identifier', tokStart);
      prop.key.name = tokVal;
      finishNode(prop.key, tokEnd);
      nextToken();
      
      if (tokType === ':') {
        nextToken();
        prop.value = parseBindingPattern();
      } else if (tokType === '=') {
        prop.shorthand = true;
        prop.value = node('AssignmentPattern', prop.key.start);
        prop.value.left = node('Identifier', prop.key.start);
        prop.value.left.name = prop.key.name;
        finishNode(prop.value.left, prop.key.end);
        nextToken();
        prop.value.right = parseAssignment();
        finishNode(prop.value, tokStart);
      } else {
        prop.shorthand = true;
        prop.value = node('Identifier', prop.key.start);
        prop.value.name = prop.key.name;
        finishNode(prop.value, prop.key.end);
      }
      n.properties.push(finishNode(prop, tokStart));
    }
    if (tokType !== '}') eat(',');
  }
  expect('}');
  return finishNode(n, tokStart);
}

function parseArrayPattern() {
  const start = tokStart;
  const n = node('ArrayPattern', start);
  n.elements = [];
  expect('[');
  while (tokType !== ']' && tokType !== 'eof') {
    if (tokType === ',') {
      n.elements.push(null);
      nextToken();
    } else if (tokType === '...') {
      nextToken();
      const rest = node('RestElement', tokStart);
      rest.argument = parseBindingPattern();
      n.elements.push(finishNode(rest, tokStart));
    } else {
      let elem = parseBindingPattern();
      if (tokType === '=') {
        const ap = node('AssignmentPattern', elem.start);
        ap.left = elem;
        nextToken();
        ap.right = parseAssignment();
        elem = finishNode(ap, tokStart);
      }
      n.elements.push(elem);
      if (tokType !== ']') eat(',');
    }
  }
  expect(']');
  return finishNode(n, tokStart);
}

function parseIf() {
  const start = tokStart;
  nextToken(); // eat 'if'
  const n = node('IfStatement', start);
  expect('(');
  n.test = parseExpression();
  expect(')');
  n.consequent = parseStatement();
  n.alternate = null;
  if (eat('else')) {
    n.alternate = parseStatement();
  }
  return finishNode(n, tokStart);
}

function parseWhile() {
  const start = tokStart;
  nextToken();
  const n = node('WhileStatement', start);
  expect('(');
  n.test = parseExpression();
  expect(')');
  n.body = parseStatement();
  return finishNode(n, tokStart);
}

function parseFor() {
  const start = tokStart;
  nextToken();
  expect('(');
  
  let init = null;
  if (tokType === 'var' || tokType === 'let' || tokType === 'const') {
    init = parseVarDecl();
  } else if (tokType !== ';') {
    init = parseExpression();
    eat(';');
  } else {
    nextToken();
  }
  
  // Check for for-in/for-of
  if (tokType === 'in' || (tokType === 'name' && tokVal === 'of')) {
    const isOf = tokType === 'name';
    nextToken();
    const n = node(isOf ? 'ForOfStatement' : 'ForInStatement', start);
    n.left = init.type === 'VariableDeclaration' ? init : init;
    n.right = parseExpression();
    expect(')');
    n.body = parseStatement();
    return finishNode(n, tokStart);
  }
  
  const n = node('ForStatement', start);
  n.init = init && init.type === 'VariableDeclaration' ? init : 
           init ? { type: 'ExpressionStatement', expression: init } : null;
  if (n.init && n.init.type === 'ExpressionStatement') n.init = init;
  
  n.test = tokType !== ';' ? parseExpression() : null;
  expect(';');
  n.update = tokType !== ')' ? parseExpression() : null;
  expect(')');
  n.body = parseStatement();
  return finishNode(n, tokStart);
}

function parseReturn() {
  const start = tokStart;
  nextToken();
  const n = node('ReturnStatement', start);
  n.argument = null;
  if (tokType !== ';' && tokType !== '}' && tokType !== 'eof') {
    n.argument = parseExpression();
  }
  eat(';');
  return finishNode(n, tokStart);
}

function parseThrow() {
  const start = tokStart;
  nextToken();
  const n = node('ThrowStatement', start);
  n.argument = parseExpression();
  eat(';');
  return finishNode(n, tokStart);
}

function parseTry() {
  const start = tokStart;
  nextToken();
  const n = node('TryStatement', start);
  n.block = parseBlock();
  n.handler = null;
  n.finalizer = null;
  
  if (eat('catch')) {
    n.handler = node('CatchClause', tokStart);
    if (eat('(')) {
      n.handler.param = parseBindingPattern();
      expect(')');
    } else {
      n.handler.param = null;
    }
    n.handler.body = parseBlock();
    finishNode(n.handler, tokStart);
  }
  
  if (eat('finally')) {
    n.finalizer = parseBlock();
  }
  
  return finishNode(n, tokStart);
}

// === FUNCTIONS & CLASSES ===
function parseFunctionDecl() {
  const start = tokStart;
  nextToken();
  const n = node('FunctionDeclaration', start);
  n.id = null;
  n.generator = false;
  n.async = false;
  
  if (tokType === 'name') {
    n.id = node('Identifier', tokStart);
    n.id.name = tokVal;
    finishNode(n.id, tokEnd);
    nextToken();
  }
  
  n.params = parseFunctionParams();
  n.body = parseBlock();
  return finishNode(n, tokStart);
}

function parseFunctionExpr() {
  const start = tokStart;
  nextToken();
  const n = node('FunctionExpression', start);
  n.id = null;
  n.generator = false;
  n.async = false;
  
  if (tokType === 'name') {
    n.id = node('Identifier', tokStart);
    n.id.name = tokVal;
    finishNode(n.id, tokEnd);
    nextToken();
  }
  
  n.params = parseFunctionParams();
  n.body = parseBlock();
  return finishNode(n, tokStart);
}

function parseFunctionParams() {
  const params = [];
  expect('(');
  while (tokType !== ')' && tokType !== 'eof') {
    if (tokType === '...') {
      nextToken();
      const rest = node('RestElement', tokStart);
      rest.argument = parseBindingPattern();
      params.push(finishNode(rest, tokStart));
      break;
    }
    let param = parseBindingPattern();
    if (tokType === '=') {
      const ap = node('AssignmentPattern', param.start);
      ap.left = param;
      nextToken();
      ap.right = parseAssignment();
      param = finishNode(ap, tokStart);
    }
    params.push(param);
    if (tokType !== ')') expect(',');
  }
  expect(')');
  return params;
}

function parseClass() {
  const start = tokStart;
  nextToken();
  const n = node('ClassDeclaration', start);
  n.id = null;
  n.superClass = null;
  
  if (tokType === 'name') {
    n.id = node('Identifier', tokStart);
    n.id.name = tokVal;
    finishNode(n.id, tokEnd);
    nextToken();
  }
  
  if (eat('extends')) {
    n.superClass = parseSubscripts(parsePrimary());
  }
  
  n.body = parseClassBody();
  return finishNode(n, tokStart);
}

function parseClassBody() {
  const start = tokStart;
  const n = node('ClassBody', start);
  n.body = [];
  expect('{');
  
  while (tokType !== '}' && tokType !== 'eof') {
    if (tokType === ';') { nextToken(); continue; }
    
    const method = node('MethodDefinition', tokStart);
    method.static = false;
    method.computed = false;
    method.kind = 'method';
    
    if (tokType === 'static') {
      method.static = true;
      nextToken();
    }
    
    if (tokType === 'get' || tokType === 'set') {
      method.kind = tokType;
      nextToken();
    }
    
    // Method name
    if (tokType === '[') {
      method.computed = true;
      nextToken();
      method.key = parseExpression();
      expect(']');
    } else {
      method.key = node('Identifier', tokStart);
      method.key.name = tokVal;
      finishNode(method.key, tokEnd);
      nextToken();
    }
    
    if (method.key.name === 'constructor') method.kind = 'constructor';
    
    // Method value
    const fn = node('FunctionExpression', tokStart);
    fn.id = null;
    fn.generator = false;
    fn.async = false;
    fn.params = parseFunctionParams();
    fn.body = parseBlock();
    method.value = finishNode(fn, tokStart);
    
    n.body.push(finishNode(method, tokStart));
  }
  
  expect('}');
  return finishNode(n, tokStart);
}

// === PROGRAM ===
function parseProgram() {
  const start = 0;
  const n = node('Program', start);
  n.body = [];
  n.sourceType = 'script';
  
  while (tokType !== 'eof') {
    n.body.push(parseStatement());
  }
  
  return finishNode(n, pos);
}

function parse(code) {
  initParser(code);
  return parseProgram();
}

// ============================================================
// TESTS
// ============================================================

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) { tests.push({ name, fn }); }
function assertEquals(a, b, msg) {
  if (a !== b) throw new Error((msg || '') + ' Expected ' + b + ', got ' + a);
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

// === EXPRESSION TESTS ===
test('parse number literal', () => {
  const ast = parse('42');
  assertEquals(ast.body[0].expression.type, 'Literal');
  assertEquals(ast.body[0].expression.value, 42);
});

test('parse string literal', () => {
  const ast = parse('"hello"');
  assertEquals(ast.body[0].expression.type, 'Literal');
  assertEquals(ast.body[0].expression.value, 'hello');
});

test('parse identifier', () => {
  const ast = parse('foo');
  assertEquals(ast.body[0].expression.type, 'Identifier');
  assertEquals(ast.body[0].expression.name, 'foo');
});

test('parse binary expression', () => {
  const ast = parse('1 + 2');
  assertEquals(ast.body[0].expression.type, 'BinaryExpression');
  assertEquals(ast.body[0].expression.operator, '+');
});

test('parse comparison', () => {
  const ast = parse('a === b');
  assertEquals(ast.body[0].expression.type, 'BinaryExpression');
  assertEquals(ast.body[0].expression.operator, '===');
});

test('parse logical and', () => {
  const ast = parse('a && b');
  assertEquals(ast.body[0].expression.type, 'LogicalExpression');
  assertEquals(ast.body[0].expression.operator, '&&');
});

test('parse ternary', () => {
  const ast = parse('a ? b : c');
  assertEquals(ast.body[0].expression.type, 'ConditionalExpression');
});

test('parse assignment', () => {
  const ast = parse('x = 5');
  assertEquals(ast.body[0].expression.type, 'AssignmentExpression');
  assertEquals(ast.body[0].expression.operator, '=');
});

test('parse member expression', () => {
  const ast = parse('a.b.c');
  assertEquals(ast.body[0].expression.type, 'MemberExpression');
});

test('parse call expression', () => {
  const ast = parse('foo(1, 2)');
  assertEquals(ast.body[0].expression.type, 'CallExpression');
  assertEquals(ast.body[0].expression.arguments.length, 2);
});

test('parse array literal', () => {
  const ast = parse('[1, 2, 3]');
  assertEquals(ast.body[0].expression.type, 'ArrayExpression');
  assertEquals(ast.body[0].expression.elements.length, 3);
});

test('parse object literal', () => {
  const ast = parse('({ a: 1, b: 2 })');
  assertEquals(ast.body[0].expression.type, 'ObjectExpression');
  assertEquals(ast.body[0].expression.properties.length, 2);
});

test('parse unary expression', () => {
  const ast = parse('!x');
  assertEquals(ast.body[0].expression.type, 'UnaryExpression');
  assertEquals(ast.body[0].expression.operator, '!');
});

test('parse update expression prefix', () => {
  const ast = parse('++x');
  assertEquals(ast.body[0].expression.type, 'UpdateExpression');
  assertEquals(ast.body[0].expression.prefix, true);
});

test('parse update expression postfix', () => {
  const ast = parse('x++');
  assertEquals(ast.body[0].expression.type, 'UpdateExpression');
  assertEquals(ast.body[0].expression.prefix, false);
});

// === STATEMENT TESTS ===
test('parse var declaration', () => {
  const ast = parse('var x = 5');
  assertEquals(ast.body[0].type, 'VariableDeclaration');
  assertEquals(ast.body[0].kind, 'var');
});

test('parse let declaration', () => {
  const ast = parse('let x = 5');
  assertEquals(ast.body[0].type, 'VariableDeclaration');
  assertEquals(ast.body[0].kind, 'let');
});

test('parse const declaration', () => {
  const ast = parse('const x = 5');
  assertEquals(ast.body[0].type, 'VariableDeclaration');
  assertEquals(ast.body[0].kind, 'const');
});

test('parse if statement', () => {
  const ast = parse('if (x) { y }');
  assertEquals(ast.body[0].type, 'IfStatement');
});

test('parse if-else statement', () => {
  const ast = parse('if (x) { y } else { z }');
  assertEquals(ast.body[0].type, 'IfStatement');
  assertEquals(ast.body[0].alternate.type, 'BlockStatement');
});

test('parse while statement', () => {
  const ast = parse('while (x) { y }');
  assertEquals(ast.body[0].type, 'WhileStatement');
});

test('parse for statement', () => {
  const ast = parse('for (let i = 0; i < 10; i++) { x }');
  assertEquals(ast.body[0].type, 'ForStatement');
});

test('parse for-of statement', () => {
  const ast = parse('for (const x of arr) { y }');
  assertEquals(ast.body[0].type, 'ForOfStatement');
});

test('parse return statement', () => {
  const ast = parse('return 42');
  assertEquals(ast.body[0].type, 'ReturnStatement');
});

test('parse throw statement', () => {
  const ast = parse('throw new Error()');
  assertEquals(ast.body[0].type, 'ThrowStatement');
});

test('parse try-catch', () => {
  const ast = parse('try { x } catch (e) { y }');
  assertEquals(ast.body[0].type, 'TryStatement');
  assertEquals(ast.body[0].handler.type, 'CatchClause');
});

test('parse function declaration', () => {
  const ast = parse('function foo(a, b) { return a + b }');
  assertEquals(ast.body[0].type, 'FunctionDeclaration');
  assertEquals(ast.body[0].id.name, 'foo');
  assertEquals(ast.body[0].params.length, 2);
});

test('parse function expression', () => {
  const ast = parse('const f = function(x) { return x }');
  assertEquals(ast.body[0].declarations[0].init.type, 'FunctionExpression');
});

test('parse class declaration', () => {
  const ast = parse('class Foo { constructor() {} }');
  assertEquals(ast.body[0].type, 'ClassDeclaration');
  assertEquals(ast.body[0].id.name, 'Foo');
});

test('parse class with extends', () => {
  const ast = parse('class Foo extends Bar { }');
  assertEquals(ast.body[0].type, 'ClassDeclaration');
  assertEquals(ast.body[0].superClass.name, 'Bar');
});

test('parse destructuring object', () => {
  const ast = parse('const { a, b } = obj');
  assertEquals(ast.body[0].declarations[0].id.type, 'ObjectPattern');
});

test('parse destructuring array', () => {
  const ast = parse('const [a, b] = arr');
  assertEquals(ast.body[0].declarations[0].id.type, 'ArrayPattern');
});

test('parse spread in array', () => {
  const ast = parse('[...arr]');
  assertEquals(ast.body[0].expression.elements[0].type, 'SpreadElement');
});

test('parse spread in call', () => {
  const ast = parse('foo(...args)');
  assertEquals(ast.body[0].expression.arguments[0].type, 'SpreadElement');
});

test('parse default parameter', () => {
  const ast = parse('function f(x = 5) {}');
  assertEquals(ast.body[0].params[0].type, 'AssignmentPattern');
});

test('parse rest parameter', () => {
  const ast = parse('function f(...args) {}');
  assertEquals(ast.body[0].params[0].type, 'RestElement');
});

// === ARROW FUNCTION TESTS ===
test('parse arrow function single param', () => {
  const ast = parse('x => x + 1');
  assertEquals(ast.body[0].expression.type, 'ArrowFunctionExpression');
  assertEquals(ast.body[0].expression.params.length, 1);
  assertEquals(ast.body[0].expression.expression, true);
});

test('parse arrow function multiple params', () => {
  const ast = parse('(a, b) => a + b');
  assertEquals(ast.body[0].expression.type, 'ArrowFunctionExpression');
  assertEquals(ast.body[0].expression.params.length, 2);
});

test('parse arrow function with block', () => {
  const ast = parse('x => { return x }');
  assertEquals(ast.body[0].expression.type, 'ArrowFunctionExpression');
  assertEquals(ast.body[0].expression.expression, false);
  assertEquals(ast.body[0].expression.body.type, 'BlockStatement');
});

test('parse arrow function no params', () => {
  const ast = parse('() => 42');
  assertEquals(ast.body[0].expression.type, 'ArrowFunctionExpression');
  assertEquals(ast.body[0].expression.params.length, 0);
});

runTests();
