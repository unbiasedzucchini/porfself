# JS Features Analysis

## Features Used in Acorn

### By File (simplest first)

#### whitespace.js (22 lines)
- ✅ `export const`
- ✅ RegExp literals (`/\r\n?|\n|\u2028|\u2029/`)
- ✅ `new RegExp()`
- ✅ `function` declarations
- ✅ `===` comparison
- ✅ `||` logical or
- ✅ `for` loops
- ✅ `.charCodeAt()`
- ✅ Ternary operator
- ✅ Default parameters (`end = code.length`)

#### util.js (24 lines)
- ✅ Destructuring from `Object.prototype`
- ✅ `Object.hasOwn` (with fallback)
- ✅ `Array.isArray` (with fallback)
- ✅ `.call()` method
- ✅ `Object.create(null)`
- ✅ `.replace()` with regex
- ⚠️ Regex `u` flag (`/[\uD800-\uDFFF]/u`)

#### scopeflags.js (27 lines)
- ✅ `export const` (multiple)
- ✅ Bitwise operations (`|`)
- ✅ Ternary operator
- ✅ Simple function

#### locutil.js (38 lines)
- ❌ `import` from local module
- ✅ `class` with constructor
- ✅ Class methods
- ✅ `new` keyword
- ✅ `for` loop with `;;`
- ✅ `if` with `!==`

#### node.js (56 lines)
- ❌ `import` statements
- ✅ `class Node` with constructor
- ✅ Property access on `parser.options`
- ✅ `new SourceLocation()`
- ✅ Prototype modification (`Parser.prototype`)
- ✅ `.call()` on functions
- ✅ `for...in` loop

#### identifier.js (79 lines)
- ❌ `import` statements
- ✅ Object literals with computed keys
- ✅ `new RegExp("[" + str + "]")`
- ✅ Array iteration with `i += 2`
- ✅ `.test()` on regex
- ✅ `String.fromCharCode()`

#### tokentype.js (151 lines)
- ✅ `export class`
- ✅ Default parameters (`conf = {}`)
- ✅ `!!` coercion
- ✅ `|| null` fallback
- ✅ Object spread/shorthand (`{beforeExpr: true}`)
- ✅ Object property access

## Feature Status in Porffor

| Feature | Porffor Status | Notes |
|---------|---------------|-------|
| `export const` | ❌ | "no generation for ExportDeclaration" |
| `import x from 'y'` | ❌ | "no generation for ImportDeclaration" |
| `class` | ✅ | Working |
| Default parameters | ✅ | Working |
| Destructuring | ✅ | Working |
| RegExp | ✅ | Basic support |
| RegExp `u` flag | ❓ | Needs testing |
| `for...in` | ✅ | Working |
| `Object.create(null)` | ❓ | Needs testing |
| `Object.hasOwn` | ❓ | Needs testing |
| Prototype modification | ❓ | Needs testing |

## Critical Blockers

### 1. ES Modules (import/export)
Acorn uses ES modules throughout. Two options:
- **Option A**: Add ES module support to Porffor
- **Option B**: Transform acorn to use a different module pattern

### 2. Prototype Modification
Acorn extends `Parser.prototype` in multiple files:
```js
const pp = Parser.prototype
pp.startNode = function() { ... }
```

This pattern needs to work in Porffor.

## Test Plan

For each feature, create a minimal test case that can run under both Node and Porffor:

```js
// test-feature-export.js
export const x = 42;
// Expected: no error, x === 42

// test-feature-class.js  
class Point {
  constructor(x, y) { this.x = x; this.y = y; }
}
const p = new Point(1, 2);
console.log(p.x === 1 && p.y === 2); // true
```
