# Module Analysis and Test Mapping

## Acorn Modules

### Dependency Graph
```
                    ┌─────────────┐
                    │   index.js  │
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           │               │               │
           v               v               v
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │statement │    │expression│    │  regexp  │
    └────┬─────┘    └────┬─────┘    └──────────┘
         │               │
         └───────┬───────┘
                 v
          ┌──────────┐
          │ tokenize │
          └────┬─────┘
               │
    ┌──────────┼──────────┐
    │          │          │
    v          v          v
┌───────┐ ┌───────┐ ┌───────────┐
│ lval  │ │ scope │ │parseutil  │
└───────┘ └───────┘ └─────┬─────┘
                          v
                    ┌──────────┐
                    │  state   │
                    └────┬─────┘
         ┌───────────────┼───────────────┐
         │               │               │
         v               v               v
  ┌──────────┐    ┌──────────┐    ┌────────────┐
  │ options  │    │tokentype │    │whitespace  │
  └──────────┘    └────┬─────┘    └────────────┘
                       v
               ┌─────────────┐
               │tokencontext │
               └─────────────┘

Other deps:
- identifier.js <- util.js, generated/*
- node.js <- state.js, locutil.js
- locutil.js <- whitespace.js
- scope.js <- scopeflags.js
```

### Module Details with Tests

#### Layer 0: No Dependencies

| Module | Lines | Description | Acorn Tests | Porffor-Compatible |
|--------|-------|-------------|-------------|-------------------|
| whitespace.js | 22 | Line break detection | tokenize tests | ⚠️ Regex only |
| scopeflags.js | 27 | Scope flag constants | scope tests | ✅ Yes |
| util.js | 24 | hasOwn, isArray, wordsRegexp | unit tests | ⚠️ Needs .call() |

#### Layer 1: Single Dependency

| Module | Lines | Deps | Tests | Porffor-Compatible |
|--------|-------|------|-------|-------------------|
| locutil.js | 38 | whitespace | location tests | ✅ Probably |
| tokentype.js | 151 | (none, but uses classes) | token tests | ✅ Yes |
| options.js | 160 | (none) | option tests | ✅ Probably |

#### Layer 2: Multiple Dependencies

| Module | Lines | Deps | Tests | Porffor-Compatible |
|--------|-------|------|-------|-------------------|
| tokencontext.js | 167 | tokentype | context tests | ✅ Probably |
| identifier.js | 79 | util, generated | identifier tests | ⚠️ Needs workaround |
| node.js | 56 | state, locutil | node tests | ❌ Uses closures |

#### Layer 3: Parser Core

| Module | Lines | Deps | Tests | Porffor-Compatible |
|--------|-------|------|-------|-------------------|
| state.js | 177 | options, tokentype, whitespace | state tests | ❌ Closures |
| parseutil.js | 154 | state | parse util tests | ❌ Closures |
| scope.js | 99 | scopeflags, parseutil | scope tests | ❌ Closures |

#### Layer 4: The Big Ones

| Module | Lines | Deps | Tests | Porffor-Compatible |
|--------|-------|------|-------|-------------------|
| tokenize.js | 812 | state, identifier, etc | tokenize tests | ❌ Closures |
| lval.js | 325 | parseutil, scope | lval tests | ❌ Closures |
| expression.js | 1148 | tokenize, lval, scope | expression tests | ❌ Closures |
| statement.js | 1235 | expression, lval, scope | statement tests | ❌ Closures |
| regexp.js | 1387 | state | regexp tests | ❌ Closures |

## Test Mapping

### Acorn's Test Organization

```
test/
├── driver.js          # Test harness
├── run.js             # Test runner
├── tests.js           # Core syntax tests (29970 lines!)
├── tests-harmony.js   # ES6+ features (16978 lines)
├── tests-asyncawait.js # Async/await (3553 lines)
├── tests-class-features-2022.js # Class features (6395 lines)
├── tests-regexp*.js   # Regex tests
└── tests-*.js         # Other feature tests
```

### Running Acorn Tests

```bash
cd acorn-upstream
npm test  # Runs all 13507 tests

# Or run specific test files
node -e "
  require('./test/driver.js');
  require('./test/tests.js');
  // run subset
"
```

### Creating Porffor-Compatible Test Subsets

Since closures don't work, we need to:
1. Extract individual test cases from acorn's test files
2. Rewrite them to avoid closures
3. Run under both Node and Porffor

## Strategy Update

Given the closure limitation, we have two paths:

### Path A: Fix Closures in Porffor
- Requires modifying codegen.js
- Closures need to capture variables at function creation time
- WebAssembly doesn't have native closures - need to use function tables + environment objects

### Path B: Rewrite Acorn Without Closures
- Transform acorn to pass all state explicitly
- Use a single global/module-level parser state
- Significant rewrite but avoids core Porffor changes

### Path C: Write a Simpler Parser
- Write a new parser specifically designed for Porffor's limitations
- Only support the JS subset that Porffor's codegen uses
- Much smaller scope but more work

## Recommended Approach

**Start with Path A** - fixing closures in Porffor:
1. It's the most general fix
2. Benefits all Porffor users
3. Required for any serious JS compatibility

If that proves too difficult, fall back to Path C - a custom minimal parser.
