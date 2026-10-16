import soap = require('../..');
import { SOAPClient } from '../..';
import { ClientRequest } from 'http';

const direct = soap({ hostname: 'localhost', port: 7878 }, response => {
    response.setEncoding('utf8');
    response.on('data', (chunk: string) => chunk.toUpperCase());
});
const constructed = new soap({ username: 'user', password: 'secret' });
const named = new soap.SOAPClient(null);
const factory = SOAPClient();
const client: soap.SOAPClient = direct;
const request: ClientRequest = client.req;
client.addNamespace('ns1', 'urn:TC');
client.method('executeCommand', '.send items', 'ns1', 'command');
const body: string = client.body({ namespaces: '', methods: '' });
client.newRequest().end();
client.write();
constructed.end();
named.end();
factory.end();
void request;
void body;

// @ts-expect-error hostnames must be strings
soap({ hostname: 123 });
// @ts-expect-error commands must be strings
client.method('executeCommand', 123, 'ns1', 'command');
