# Critical Blockers for Self-Hosting

## 1. ES Modules (import/export)
**Status:** ❌ Not supported
**Error:** "no generation for ImportDeclaration"

Acorn uses ES modules throughout. Every file uses `import` and `export`.

**Workaround options:**
- Bundle acorn into a single file
- Transform to IIFE/CommonJS pattern
- Add ES module support to Porffor

## 2. Closures Over Local Variables
**Status:** ❌ Broken
**Error:** "ReferenceError: X is not defined"

```js
function outer() {
  const Y = 20;  // local variable
  function inner() {
    return Y;    // closure - FAILS
  }
  return inner();
}
```

This is **critical** - acorn uses nested functions extensively.

**Examples in acorn:**
- Parser methods defined inside other methods
- Callbacks that capture local state
- Helper functions that close over options

## 3. Function.prototype.call
**Status:** ❌ Not implemented
**Error:** "undefined is not a function"

```js
const hasOwnProperty = Object.prototype.hasOwnProperty;
hasOwnProperty.call(obj, 'prop');  // FAILS
```

Used in acorn's `util.js` for `hasOwn` implementation.

## 4. String.prototype.replace with regex (partial)
**Status:** ⚠️ Partial support
**Error:** "undefined is not a function" in some cases

```js
'a b c'.replace(/ /g, '|');  // may fail
```

## Priority Order

1. **Closures** - Most blocking, affects everything
2. **ES Modules** - Can work around with bundling
3. **Function.call** - Can rewrite affected code
4. **String.replace** - Can work around

## Test Commands

```bash
# Run feature tests under Porffor
node ../porffor/runtime/index.js tests/features/run-all.js

# Run acorn-specific tests
node ../porffor/runtime/index.js tests/features/acorn-specific.js
```
