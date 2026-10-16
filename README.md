# node-soap

A small HTTP SOAP client with Basic authentication and no runtime dependencies.
Version 2 requires Node.js 24 or later and ships ECMAScript modules compiled
from TypeScript 7, with generated declarations and source maps.

```sh
npm install node-soap
```

```js
import { SOAPClient } from 'node-soap';
// A default import is also supported: import SOAPClient from 'node-soap';

const client = new SOAPClient({
    hostname: 'localhost',
    port: 7878,
    username: 'myusername',
    password: '123456'
}, response => {
    response.setEncoding('utf8');
    response.on('data', data => console.log(data));
});

client.req.on('error', error => console.error(error));
client.addNamespace('ns1', 'urn:TC');
client.method('executeCommand', '.send items', 'ns1', 'command');
```

Options are `hostname`, `port` (default `7878`), `method` (default `POST`),
`username`, and `password`. Requests go to `/` over HTTP. The optional callback
receives Node's HTTP response stream, including non-200 responses; the library
does not parse SOAP responses or faults.

- `addNamespace(prefix, uri)` appends a namespace declaration.
- `method(name, command, prefix, parameter)` replaces the current method and sends
  the SOAP envelope. Commands are inserted as raw XML, preserving 1.x behavior.
- `body({ namespaces, methods })` returns an envelope without sending it.
- `write()` writes the current envelope; `end()` writes it and ends the request.
- `newRequest()` creates a request and returns the client. It destroys an
  unfinished previous request; errors caused by that intentional cancellation
  are handled internally and still reach any listeners attached by the caller.

The current request is available as `req`. Attach an `error` listener for each
new request. `method()` uses the initial request for its first call and creates
another after a request has ended or been destroyed, avoiding the unused initial
request in 1.x. If you update `options` or `fn` directly, call `newRequest()` to
apply the changes to the next request.

TypeScript users can import `SOAPClientOptions`, `BodyOptions`, and
`ResponseListener` as types. TypeScript consumers also need `@types/node`.

To migrate from 1.x, replace CommonJS imports with ESM imports and construct the
client with `new`. Version 2 requires Node.js 24+, uses an ES class, and ships no
separate CommonJS build. Applications that need Node.js 0.x or the old factory
call can install the legacy patch:

```sh
npm install node-soap@1.0.1
```

Version 1.0.1 retains raw JavaScript, CommonJS, prototype methods, both historical
exports, and support verified on Node.js 0.8.28, 0.10.48, and 0.12.18. It is
preserved in the Git tag `v1.0.1`.

For development on Node.js 24, run `npm ci`, `npm run test:coverage`, and
`npm run test:types`. `npm run build` emits JavaScript, declarations, and source
maps into `dist`; `npm pack` builds them before packaging.

See [CHANGELOG.md](CHANGELOG.md) and [RELEASES.md](RELEASES.md) for changes and
release evidence.
