import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { test } from 'node:test';
import SOAPClient, { SOAPClient as NamedClient } from 'node-soap';

function mockRequests(t) {
    const requests = [];
    t.mock.method(http, 'request', (options, callback) => {
        const req = {
            options, callback, writes: [], events: [], writableEnded: false, destroyed: false,
            write(body) { this.writes.push(body); this.events.push('write'); },
            end() { this.writableEnded = true; this.events.push('end'); },
            once() { return this; },
            destroy() { this.destroyed = true; this.events.push('destroy'); return this; }
        };
        requests.push(req);
        return req;
    });
    return requests;
}

function envelope(namespaces = '', methods = '') {
    return '<?xml version="1.0" encoding="utf-8"?>' +
        '<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" ' +
        'xmlns:xsi="http://www.w3.org/1999/XMLSchema-instance" ' +
        'xmlns:xsd="http://www.w3.org/1999/XMLSchema" ' + namespaces + '>' +
        '<SOAP-ENV:Body>' + methods + '</SOAP-ENV:Body></SOAP-ENV:Envelope>';
}

async function listen(t, handler) {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(async () => {
        server.closeAllConnections();
        await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    });
    return { server, options: { hostname: '127.0.0.1', port: server.address().port } };
}

function read(stream) {
    stream.setEncoding('utf8');
    return new Promise((resolve, reject) => {
        let body = '';
        stream.on('data', chunk => { body += chunk; });
        stream.on('end', () => resolve(body));
        stream.on('error', reject);
    });
}

test('default and named ESM exports are the same class; construction requires new', t => {
    const requests = mockRequests(t);
    assert.equal(SOAPClient, NamedClient);
    assert.ok(new SOAPClient() instanceof NamedClient);
    assert.throws(() => SOAPClient(), TypeError);
    assert.equal(requests.length, 1);
});

test('omitted and null options use independent legacy defaults', t => {
    mockRequests(t);
    const a = new SOAPClient();
    const b = new SOAPClient(null);
    assert.deepEqual(a.options, { port: 7878, method: 'POST' });
    assert.deepEqual(a.options, b.options);
    a.options.port = 80;
    assert.equal(b.options.port, 7878);
    assert.equal(a.namespaces, '');
    assert.equal(a.methods, '');
});

test('merges inherited enumerable options without mutating the input', t => {
    mockRequests(t);
    const options = Object.assign(Object.create({ method: 'PUT' }), { hostname: 'example.test', port: 80 });
    const client = new SOAPClient(options);
    assert.deepEqual(client.options, { hostname: 'example.test', port: 80, method: 'PUT' });
    assert.notEqual(client.options, options);
    client.options.hostname = 'changed';
    assert.equal(options.hostname, 'example.test');
});

test('retains explicit undefined overrides and unknown options', t => {
    mockRequests(t);
    const client = new SOAPClient({ port: undefined, extra: true });
    assert.equal(client.options.port, undefined);
    assert.equal(client.options.extra, true);
});

test('forwards HTTP options, Basic credentials, and response callback', t => {
    const requests = mockRequests(t);
    const callback = () => {};
    const client = new SOAPClient({ hostname: 'localhost', port: '8080', method: 'PUT', username: 'user', password: 'pass' }, callback);
    assert.equal(client.fn, callback);
    assert.equal(client.req, requests[0]);
    assert.equal(requests[0].callback, callback);
    assert.deepEqual(requests[0].options, { hostname: 'localhost', port: '8080', method: 'PUT', auth: 'user:pass' });
});

test('newRequest destroys an unfinished request and uses updated options', t => {
    const requests = mockRequests(t);
    const client = new SOAPClient();
    client.options.port = 8080;
    assert.equal(client.newRequest(), client);
    assert.equal(requests[0].destroyed, true);
    assert.equal(client.req, requests[1]);
    assert.equal(client.req.options.port, 8080);
    assert.equal(client.req.options.auth, 'undefined:undefined');
});

test('newRequest leaves completed requests alone', t => {
    const requests = mockRequests(t);
    const client = new SOAPClient();
    client.end();
    client.newRequest();
    assert.equal(requests[0].destroyed, false);
    assert.equal(client.req, requests[1]);
});

test('body preserves exact empty and populated legacy SOAP envelopes', t => {
    mockRequests(t);
    const client = new SOAPClient();
    assert.equal(client.body(client), envelope());
    assert.equal(client.body({ namespaces: 'xmlns:n="urn:test" ', methods: '<n:ping />' }),
        envelope('xmlns:n="urn:test" ', '<n:ping />'));
});

test('namespace declarations append without sharing state between clients', t => {
    mockRequests(t);
    const a = new SOAPClient();
    const b = new SOAPClient();
    assert.equal(a.addNamespace('n', 'urn:test'), undefined);
    a.addNamespace('other', 'urn:other');
    assert.equal(a.namespaces, 'xmlns:n="urn:test" xmlns:other="urn:other" ');
    assert.equal(b.namespaces, '');
});

test('method reuses the initial request, then replaces completed requests', t => {
    const requests = mockRequests(t);
    const client = new SOAPClient();
    client.addNamespace('n', 'urn:test');
    assert.equal(client.method('run', 'hello', 'n', 'command'), undefined);
    assert.equal(requests.length, 1);
    assert.equal(client.methods, '<n:run ><command>hello</command></n:run>');
    assert.deepEqual(requests[0].events, ['write', 'end']);
    assert.deepEqual(requests[0].writes, [envelope(client.namespaces, client.methods)]);
    client.method('stop', '', 'n', 'value');
    assert.equal(requests.length, 2);
    assert.equal(client.methods, '<n:stop ><value></value></n:stop>');
    assert.deepEqual(requests[1].writes, [envelope(client.namespaces, client.methods)]);
    assert.equal(requests[0].destroyed, false);
});

test('method replaces an aborted request', t => {
    const requests = mockRequests(t);
    const client = new SOAPClient();
    client.req.destroy();
    client.method('run', 'hello', 'n', 'command');
    assert.equal(client.req, requests[1]);
    assert.deepEqual(client.req.events, ['write', 'end']);
});

test('preserves raw XML commands', t => {
    mockRequests(t);
    const client = new SOAPClient();
    client.method('run', '<item id="1">a &amp; b</item>', 'n', 'command');
    assert.equal(client.methods, '<n:run ><command><item id="1">a &amp; b</item></command></n:run>');
});

test('write uses the overridable body function without ending the request', t => {
    const requests = mockRequests(t);
    const client = new SOAPClient();
    client.body = state => { assert.equal(state, client); return 'custom XML'; };
    assert.equal(client.write(), undefined);
    assert.deepEqual(requests[0].writes, ['custom XML']);
    assert.deepEqual(requests[0].events, ['write']);
});

test('end writes the envelope before ending the request', t => {
    const requests = mockRequests(t);
    const client = new SOAPClient();
    assert.equal(client.end(), undefined);
    assert.deepEqual(requests[0].events, ['write', 'end']);
    assert.deepEqual(requests[0].writes, [envelope()]);
});

test('subclasses retain chaining and can override body', t => {
    mockRequests(t);
    class CustomClient extends SOAPClient {
        body() { return '<custom />'; }
    }
    const client = new CustomClient();
    assert.equal(client.newRequest(), client);
    assert.ok(client instanceof SOAPClient);
    client.end();
    assert.deepEqual(client.req.writes, ['<custom />']);
});

test('sends authenticated raw XML over HTTP and streams a non-200 response', { timeout: 10000 }, async t => {
    let incoming;
    const { options } = await listen(t, async (req, res) => {
        incoming = { method: req.method, url: req.url, auth: req.headers.authorization, body: await read(req) };
        res.writeHead(500, { 'Content-Type': 'text/xml' });
        res.write('<fault>');
        res.end('example</fault>');
    });
    let client;
    const result = await new Promise((resolve, reject) => {
        client = new SOAPClient({ ...options, username: 'user', password: 'pass' }, async response => {
            try { resolve({ status: response.statusCode, body: await read(response) }); } catch (error) { reject(error); }
        });
        client.req.on('error', reject);
        const initial = client.req;
        client.addNamespace('n', 'urn:test');
        client.method('run', '<item>hello &amp; goodbye</item>', 'n', 'command');
        assert.equal(client.req, initial);
    });
    assert.deepEqual(result, { status: 500, body: '<fault>example</fault>' });
    assert.deepEqual(incoming, {
        method: 'POST', url: '/', auth: 'Basic dXNlcjpwYXNz',
        body: envelope('xmlns:n="urn:test" ', '<n:run ><command><item>hello &amp; goodbye</item></command></n:run>')
    });
});

test('successive real HTTP methods complete without orphan requests', { timeout: 10000 }, async t => {
    const received = [];
    const { options } = await listen(t, async (req, res) => {
        received.push(await read(req));
        res.end('ok');
    });
    let resolveResponse;
    let rejectResponse;
    const client = new SOAPClient(options, response => { read(response).then(resolveResponse, rejectResponse); });
    t.after(() => client.req.destroy());
    const send = command => new Promise((resolve, reject) => {
        resolveResponse = resolve;
        rejectResponse = reject;
        client.method('run', command, 'n', 'command');
        client.req.on('error', reject);
    });
    assert.equal(await send('first'), 'ok');
    assert.equal(await send('second'), 'ok');
    assert.deepEqual(received, [
        envelope('', '<n:run ><command>first</command></n:run>'),
        envelope('', '<n:run ><command>second</command></n:run>')
    ]);
});

test('newRequest safely cancels a real unfinished request without an unhandled error', { timeout: 10000 }, async t => {
    let received = 0;
    const { options } = await listen(t, async (req, res) => {
        await read(req);
        received++;
        res.end('ok');
    });
    const result = await new Promise((resolve, reject) => {
        const client = new SOAPClient(options, response => { read(response).then(resolve, reject); });
        const initial = client.req;
        client.newRequest();
        assert.equal(initial.destroyed, true);
        client.req.on('error', reject);
        client.end();
    });
    assert.equal(result, 'ok');
    assert.equal(received, 1);
});

test('end sends an empty envelope using the requested HTTP method', { timeout: 10000 }, async t => {
    let incoming;
    const { options } = await listen(t, async (req, res) => {
        incoming = { method: req.method, auth: req.headers.authorization, body: await read(req) };
        res.end('ok');
    });
    await new Promise((resolve, reject) => {
        const client = new SOAPClient({ ...options, method: 'PUT' }, response => { read(response).then(resolve, reject); });
        client.req.on('error', reject);
        client.end();
    });
    assert.deepEqual(incoming, { method: 'PUT', auth: 'Basic ' + Buffer.from('undefined:undefined').toString('base64'), body: envelope() });
});

test('exposes real transport errors on req', { timeout: 10000 }, async () => {
    const server = http.createServer();
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const port = server.address().port;
    await new Promise(resolve => server.close(resolve));
    const client = new SOAPClient({ hostname: '127.0.0.1', port });
    const error = new Promise(resolve => client.req.on('error', resolve));
    client.end();
    assert.equal((await error).code, 'ECONNREFUSED');
});
