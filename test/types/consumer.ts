import SOAPClient, { SOAPClient as NamedClient, type SOAPClientOptions, type BodyOptions } from 'node-soap';
import type { ClientRequest } from 'node:http';

const options: SOAPClientOptions = { hostname: 'localhost', port: 7878 };
const direct = new SOAPClient(options, response => {
    response.setEncoding('utf8');
    response.on('data', (chunk: string) => chunk.toUpperCase());
});
const constructed = new SOAPClient({ username: 'user', password: 'secret' });
const named = new NamedClient(null);
const client: SOAPClient = direct;
const request: ClientRequest = client.req;
client.addNamespace('ns1', 'urn:TC');
client.method('executeCommand', '.send items', 'ns1', 'command');
const state: BodyOptions = { namespaces: '', methods: '' };
const body: string = client.body(state);
client.newRequest().end();
client.write();
constructed.end();
named.end();
void request;
void body;

// @ts-expect-error hostnames must be strings
new SOAPClient({ hostname: 123 });
// @ts-expect-error commands must be strings
client.method('executeCommand', 123, 'ns1', 'command');
// @ts-expect-error version 2 requires construction with new
SOAPClient();
