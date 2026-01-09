# Porfself: Making Porffor Self-Hosting

This project aims to make the [Porffor](https://github.com/CanadaHonk/porffor) JavaScript compiler self-hosting.

## Strategy

**Test-driven, thorny-first approach:**

1. Start with acorn (the parser) - the thorniest dependency
2. Identify tests for each module before porting
3. Port bottom-up, verifying tests pass at each stage

## Directory Structure

```
porfself/
├── acorn-upstream/     # Original acorn for reference/tests
├── acorn-porf/         # Acorn ported to Porffor-compatible JS
├── porffor-upstream/   # Symlink to ../porffor
├── tests/              # Test harnesses and results
│   ├── acorn/          # Acorn test runner adaptations
│   └── compiler/       # Porffor compiler module tests
├── docs/               # Documentation and analysis
│   ├── FEATURES.md     # JS features needed vs supported
│   ├── MODULES.md      # Module dependency analysis
│   └── PROGRESS.md     # Porting progress tracker
└── ported/             # Successfully ported modules
```

## Module Porting Order

### Phase 1: Acorn Parser (~6300 lines)
Acorn is split into focused modules. Port order by dependency:

| Module | Lines | Deps | Tests | Status |
|--------|-------|------|-------|--------|
| whitespace.js | 22 | none | tokenize tests | ⬜ |
| util.js | 24 | none | unit tests | ⬜ |
| scopeflags.js | 27 | none | unit tests | ⬜ |
| locutil.js | 38 | none | location tests | ⬜ |
| node.js | 56 | locutil | node tests | ⬜ |
| identifier.js | 79 | util | identifier tests | ⬜ |
| tokentype.js | 151 | none | token tests | ⬜ |
| tokencontext.js | 167 | tokentype | context tests | ⬜ |
| options.js | 160 | none | option tests | ⬜ |
| state.js | 177 | options, tokentype, whitespace | state tests | ⬜ |
| parseutil.js | 154 | state | parse util tests | ⬜ |
| scope.js | 99 | scopeflags, parseutil | scope tests | ⬜ |
| location.js | 29 | state, locutil | location tests | ⬜ |
| lval.js | 325 | parseutil, scope | lval tests | ⬜ |
| tokenize.js | 812 | state, identifier, tokentype, context | tokenize tests | ⬜ |
| expression.js | 1148 | tokenize, lval, scope | expression tests | ⬜ |
| statement.js | 1235 | expression, lval, scope | statement tests | ⬜ |
| regexp.js | 1387 | state | regexp tests | ⬜ |
| index.js | 99 | all | full parser tests | ⬜ |

### Phase 2: Porffor Compiler Modules
(After acorn is working)

## Test Strategy

### Acorn Tests
- 13,507 existing tests in `acorn-upstream/test/`
- Organized by feature (async, classes, regexp, etc.)
- Test driver compares AST output

### Approach
1. Create isolated test runner that can run under both Node and Porffor
2. Start with simplest test file, get it passing
3. Track: `tests passing under Node` vs `tests passing under Porffor`

## Current Status

- [ ] Repository setup
- [ ] Feature gap analysis complete
- [ ] First acorn module ported
- [ ] Acorn tokenizer working
- [ ] Acorn parser working
- [ ] First Porffor module self-compiled
- [ ] Full self-hosting achieved
