# Changelog

## 2.0.0

- Require Node.js 24+ and migrate to TypeScript 7, ES classes, and ECMAScript
  modules. Publish compiled JavaScript, generated declarations, and source maps.
- Export `SOAPClient` as both a default and named ESM export. Construction now
  requires `new`; the 1.x factory call is no longer supported.
- Reuse the initial HTTP request for the first method, avoiding the unused
  request in 1.x. Safely cancel unfinished requests on explicit replacement.
- Preserve SOAP envelope formatting, raw XML commands, inherited option merging,
  Basic authentication, public methods, and streamed response callbacks.
- Add a Node.js test suite with enforced 100% runtime coverage and Linux, macOS,
  and Windows CI on Node.js 24.

## 1.0.1

- Remove unused `assert` and `q` dependencies and replace the sole `underscore`
  use with a legacy-compatible shallow copy, including inherited properties.
- Preserve the published constructor export and the repository's `.SOAPClient`
  export. Support the documented factory call without `new`.
- Add TypeScript declarations, GitHub repository metadata, and dependency-free
  runtime tests, including real HTTP integration.
- Keep CommonJS, prototype methods, raw XML behavior, and legacy JavaScript syntax.
