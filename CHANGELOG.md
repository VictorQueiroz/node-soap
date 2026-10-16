# Changelog

## 1.0.1

- Remove unused `assert` and `q` dependencies and replace the sole `underscore`
  use with a legacy-compatible shallow copy, including inherited properties.
- Preserve the published constructor export and the repository's `.SOAPClient`
  export. Support the documented factory call without `new`.
- Add TypeScript declarations, GitHub repository metadata, and dependency-free
  runtime tests, including real HTTP integration.
- Keep CommonJS, prototype methods, raw XML behavior, and legacy JavaScript syntax.
