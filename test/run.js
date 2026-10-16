'use strict';

// Deliberately use only legacy syntax and built-in modules (including assert).
var assert = require('assert');
var http = require('http');
var soap = require('..');
var SOAPClient = soap.SOAPClient;
var tests = [];

function test(name, fn) {
	tests.push({ name: name, fn: fn });
}

function withRequests(fn) {
	var original = http.request;
	var requests = [];
	http.request = function (options, callback) {
		var req = {
			options: options,
			callback: callback,
			writes: [],
			events: [],
			write: function (body) { this.writes.push(body); this.events.push('write'); },
			end: function () { this.events.push('end'); }
		};
		requests.push(req);
		return req;
	};
	try {
		fn(requests);
	} finally {
		http.request = original;
	}
}

function envelope(namespaces, methods) {
	return '<?xml version="1.0" encoding="utf-8"?>' +
		'<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" ' +
		'xmlns:xsi="http://www.w3.org/1999/XMLSchema-instance" ' +
		'xmlns:xsd="http://www.w3.org/1999/XMLSchema" ' + namespaces + '>' +
		'<SOAP-ENV:Body>' + methods + '</SOAP-ENV:Body></SOAP-ENV:Envelope>';
}

test('preserves the published constructor and repository named export', function () {
	assert.strictEqual(typeof soap, 'function');
	assert.strictEqual(soap.SOAPClient, soap);
});

test('supports construction, direct factory calls, and named factory calls', function () {
	withRequests(function (requests) {
		assert.ok(new SOAPClient() instanceof SOAPClient);
		assert.ok(soap() instanceof SOAPClient);
		assert.ok(soap.SOAPClient() instanceof SOAPClient);
		assert.strictEqual(requests.length, 3);
	});
});

test('sets independent defaults for omitted and null options', function () {
	withRequests(function () {
		var a = new SOAPClient();
		var b = new SOAPClient(null);
		assert.deepEqual(a.options, { port: 7878, method: 'POST' });
		assert.deepEqual(b.options, a.options);
		a.options.port = 1234;
		assert.strictEqual(b.options.port, 7878);
		assert.strictEqual(a.namespaces, '');
		assert.strictEqual(a.methods, '');
	});
});

test('merges options without mutation, including inherited enumerable values', function () {
	withRequests(function () {
		function Options() { this.hostname = 'example.test'; this.port = 80; }
		Options.prototype.method = 'PUT';
		var options = new Options();
		var client = new SOAPClient(options);
		assert.deepEqual(client.options, { hostname: 'example.test', port: 80, method: 'PUT' });
		assert.notStrictEqual(client.options, options);
		client.options.hostname = 'changed';
		assert.strictEqual(options.hostname, 'example.test');
	});
});

test('retains explicit undefined overrides and unknown options', function () {
	withRequests(function () {
		var client = new SOAPClient({ port: undefined, extra: true });
		assert.strictEqual(client.options.port, undefined);
		assert.strictEqual(client.options.extra, true);
	});
});

test('forwards HTTP options, credentials, and the response callback', function () {
	withRequests(function (requests) {
		var callback = function () {};
		var client = new SOAPClient({ hostname: 'localhost', username: 'user', password: 'pass' }, callback);
		assert.strictEqual(client.fn, callback);
		assert.strictEqual(client.req, requests[0]);
		assert.strictEqual(requests[0].callback, callback);
		assert.deepEqual(requests[0].options, {
			hostname: 'localhost', port: 7878, method: 'POST', auth: 'user:pass'
		});
	});
});

test('newRequest creates another request using current options and returns this', function () {
	withRequests(function (requests) {
		var client = new SOAPClient();
		client.options.port = 8080;
		assert.strictEqual(client.newRequest(), client);
		assert.strictEqual(client.req, requests[1]);
		assert.strictEqual(requests[1].options.port, 8080);
		assert.strictEqual(requests[1].options.auth, 'undefined:undefined');
	});
});

test('body generates the exact legacy SOAP envelope with supplied state', function () {
	withRequests(function () {
		var client = new SOAPClient();
		assert.strictEqual(client.body(client), envelope('', ''));
		assert.strictEqual(client.body({ namespaces: 'xmlns:n="urn:test" ', methods: '<n:ping />' }),
			envelope('xmlns:n="urn:test" ', '<n:ping />'));
	});
});

test('addNamespace appends declarations and keeps instances independent', function () {
	withRequests(function () {
		var a = new SOAPClient();
		var b = new SOAPClient();
		assert.strictEqual(a.addNamespace('n', 'urn:test'), undefined);
		a.addNamespace('other', 'urn:other');
		assert.strictEqual(a.namespaces, 'xmlns:n="urn:test" xmlns:other="urn:other" ');
		assert.strictEqual(b.namespaces, '');
	});
});

test('method sends an envelope and replaces the prior method on subsequent calls', function () {
	withRequests(function (requests) {
		var client = new SOAPClient();
		client.addNamespace('n', 'urn:test');
		assert.strictEqual(client.method('run', 'hello', 'n', 'command'), undefined);
		assert.strictEqual(client.methods, '<n:run ><command>hello</command></n:run>');
		assert.deepEqual(requests[1].events, ['write', 'end']);
		assert.deepEqual(requests[1].writes, [envelope(client.namespaces, client.methods)]);
		client.method('stop', '', 'n', 'value');
		assert.strictEqual(client.methods, '<n:stop ><value></value></n:stop>');
		assert.deepEqual(requests[2].writes, [envelope(client.namespaces, client.methods)]);
	});
});

test('preserves raw XML payloads in the legacy release', function () {
	withRequests(function () {
		var client = new SOAPClient();
		client.method('run', '<item id="1">a &amp; b</item>', 'n', 'command');
		assert.strictEqual(client.methods,
			'<n:run ><command><item id="1">a &amp; b</item></command></n:run>');
	});
});

test('write uses the overridable body function without ending the request', function () {
	withRequests(function (requests) {
		var client = new SOAPClient();
		client.body = function (state) { assert.strictEqual(state, client); return 'custom XML'; };
		assert.strictEqual(client.write(), undefined);
		assert.deepEqual(requests[0].writes, ['custom XML']);
		assert.deepEqual(requests[0].events, ['write']);
	});
});

test('end writes the body before ending the request', function () {
	withRequests(function (requests) {
		var client = new SOAPClient();
		assert.strictEqual(client.end(), undefined);
		assert.deepEqual(requests[0].events, ['write', 'end']);
		assert.deepEqual(requests[0].writes, [envelope('', '')]);
	});
});

test('sends an authenticated SOAP method over real HTTP and streams its response', function (done) {
	var server = http.createServer(function (req, res) {
		var body = '';
		req.setEncoding('utf8');
		req.on('data', function (chunk) { body += chunk; });
		req.on('end', function () {
			assert.strictEqual(req.method, 'POST');
			assert.strictEqual(req.url, '/');
			assert.strictEqual(req.headers.authorization, 'Basic dXNlcjpwYXNz');
			assert.strictEqual(body, envelope('xmlns:n="urn:test" ', '<n:run ><command>hello</command></n:run>'));
			res.writeHead(200, { 'Content-Type': 'text/xml' });
			res.write('<response>');
			res.end('ok</response>');
		});
	});
	server.listen(0, '127.0.0.1', function () {
		var client = new SOAPClient({ hostname: '127.0.0.1', port: server.address().port, username: 'user', password: 'pass' }, function (res) {
			var body = '';
			res.setEncoding('utf8');
			res.on('data', function (chunk) { body += chunk; });
			res.on('end', function () {
				assert.strictEqual(res.statusCode, 200);
				assert.strictEqual(body, '<response>ok</response>');
				server.close(done);
			});
		});
		// 1.x creates a request in the constructor and another in method().
		// Close the first explicitly so this integration test leaves no socket.
		client.req.on('error', function () {});
		client.req.abort();
		client.addNamespace('n', 'urn:test');
		client.method('run', 'hello', 'n', 'command');
		client.req.on('error', done);
	});
});

test('exposes transport errors on the request', function (done) {
	var server = http.createServer();
	server.listen(0, '127.0.0.1', function () {
		var port = server.address().port;
		server.close(function () {
			var client = new SOAPClient({ hostname: '127.0.0.1', port: port });
			client.req.on('error', function (err) {
				assert.strictEqual(err.code, 'ECONNREFUSED');
				done();
			});
			client.end();
		});
	});
});

var index = 0;
function next(err) {
	if (err) { throw err; }
	if (index === tests.length) {
		console.log('Passed ' + index + ' tests on ' + process.version);
		return;
	}
	var entry = tests[index++];
	var timeout = setTimeout(function () { throw new Error('Timed out: ' + entry.name); }, 10000);
	function done(error) {
		clearTimeout(timeout);
		if (error) { throw error; }
		console.log('ok - ' + entry.name);
		next();
	}
	if (entry.fn.length) { entry.fn(done); } else { entry.fn(); done(); }
}
next();
