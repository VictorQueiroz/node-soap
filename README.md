# node-soap

A small HTTP SOAP client with Basic authentication. Version 1.x keeps the
original CommonJS, prototype-based JavaScript implementation and has no runtime
dependencies. Both historical import forms are supported:

```js
var SOAPClient = require('node-soap');
// Also supported: require('node-soap').SOAPClient
```

```js
var SOAPClient = require('node-soap').SOAPClient;

var client = new SOAPClient({
	hostname: 'localhost',
	port: 7878,
	username: 'myusername',
	password: '123456'
}, function (response) {
	response.setEncoding('utf-8');
	response.on('data', function(data) {
		console.log(data);
	});
});

client.addNamespace('ns1', 'urn:TC');

client.method('executeCommand', '.send items', 'ns1', 'command');
```

`SOAPClient(options, callback)` also works without `new`. Options are `hostname`,
`port` (default `7878`), `method` (default `POST`), `username`, and `password`.
The callback receives Node's HTTP response stream. Requests go to `/` over HTTP.

- `addNamespace(prefix, uri)` appends a namespace declaration.
- `method(name, command, prefix, parameter)` replaces the current method and sends
  the SOAP envelope. Commands are inserted as raw XML, preserving 1.0.0 behavior.
- `body({ namespaces, methods })` returns an envelope without sending it.
- `write()` writes the current envelope; `end()` writes it and ends the request.
- `newRequest()` creates a request and returns the client. The current request is
  available as `req`; attach an `error` listener to handle transport errors.

As in 1.0.0, the constructor creates a request immediately, and `method()` creates
another. Finish or abort an outstanding request before replacing it when managing
request lifetimes explicitly.

TypeScript declarations ship with the package. TypeScript consumers also need
`@types/node`. Runtime code and the test runner use legacy JavaScript syntax.
Run `node test/run.js` to test the library on old Node releases. `npm ci` and
`npm run test:types` use the development toolchain on Node.js 24.

See [RELEASES.md](RELEASES.md) for the published 1.0.0 comparison and release checks.
