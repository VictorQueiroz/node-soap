# Release evidence

## Published 1.0.0 baseline

Compared on 2026-10-16 against the actual npm tarball, rather than only registry
metadata:

- Package: `node-soap@1.0.0`.
- npm `gitHead`: `377a8429184b4b98a5eadbd236a411f55f250a5c` (the initial commit).
- Tarball SHA-1: `cb356354d8aac2e4509f7ef1ff4b75bc9ab2825c`.
- Tarball SHA-512 integrity:
  `sha512-HNAQ6aQc4gdIRp7nh5g2fdSvghzmfsIrOK9SUp8xajwPcuYDZkXZRyZlVdu1PnKrJYA2zRbEUiaQNONj/1OghQ==`.
- Original default-branch HEAD: `ad5e9bd375bd12cc962823e9c4d6e2f1bdf3eb39`.

The tarball's `client.js` matches the initial commit byte for byte. The only
runtime change between the published code and the original default-branch HEAD
is commit `aa7b08d6598c306adead5264bd1471b2c3daf709`, changing
`module.exports = SOAPClient` to `exports.SOAPClient = SOAPClient`. Commit
`ad5e9bd375bd12cc962823e9c4d6e2f1bdf3eb39` updates the README for that named
export. No npm-only runtime changes need recovering. Version 1.0.1 supports both
exports and retains both commits in history.

## 1.0.1 validation

- Dependency-free tests cover construction/factory calls, defaults and inherited
  options, both exports, all prototype methods, exact SOAP envelopes, raw XML,
  Basic authentication, real HTTP response streaming, and connection errors.
- TypeScript consumer tests check direct and named imports, calls and
  construction, public members, and rejection of invalid arguments.
- All 15 runtime tests pass locally on Node.js 24.21.0. V8 coverage reports 100%
  statements, branches, functions, and lines for `client.js`. Both runtime source
  and the test runner also pass an ECMAScript 3 syntax parse.
- CI runs runtime tests on Node.js 0.8.28, 0.10.48, 0.12.18, and 24.x; declaration
  checks use Node.js 24. Old x64 binaries cannot execute on the development ARM
  Mac, so native legacy runtime results come from Linux CI.
- Release artifacts use an explicit package file allowlist and are inspected for
  confidential content before publication.
