import http, { type ClientRequest, type IncomingMessage } from 'node:http';

export interface SOAPClientOptions {
    hostname?: string;
    port?: number | string;
    method?: string;
    username?: string;
    password?: string;
    [key: string]: unknown;
}

export interface BodyOptions {
    namespaces: string;
    methods: string;
}

export type ResponseListener = (response: IncomingMessage) => void;

/** A small HTTP SOAP client. Commands are inserted as raw XML. */
export class SOAPClient {
    options: SOAPClientOptions;
    fn: ResponseListener | undefined;
    namespaces = '';
    methods = '';
    req!: ClientRequest;

    constructor(options?: SOAPClientOptions | null, callback?: ResponseListener) {
        this.options = { port: 7878, method: 'POST' };
        // Preserve 1.x option merging, including inherited enumerable properties.
        for (const key in options) {
            this.options[key] = options[key];
        }
        this.fn = callback;
        this.newRequest();
    }

    body(options: BodyOptions): string {
        return '<?xml version="1.0" encoding="utf-8"?>' +
            '<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" ' +
            'xmlns:xsi="http://www.w3.org/1999/XMLSchema-instance" ' +
            'xmlns:xsd="http://www.w3.org/1999/XMLSchema" ' + options.namespaces + '>' +
            '<SOAP-ENV:Body>' + options.methods + '</SOAP-ENV:Body></SOAP-ENV:Envelope>';
    }

    /** Replace the current request, closing an unfinished request first. */
    newRequest(): this {
        if (this.req && !this.req.writableEnded) {
            // This cancellation is intentional; user error listeners still run.
            this.req.once('error', () => {});
            this.req.destroy();
        }
        const options = this.options;
        this.req = http.request({
            hostname: options.hostname,
            port: options.port,
            method: options.method,
            auth: `${options.username}:${options.password}`
        }, this.fn);
        return this;
    }

    /** Send one method. A command may contain XML markup. */
    method(methodName: string, command: string, namespace: string, param: string): void {
        this.methods = `<${namespace}:${methodName} ><${param}>${command}</${param}></${namespace}:${methodName}>`;
        if (this.req.writableEnded || this.req.destroyed) {
            this.newRequest();
        }
        this.end();
    }

    addNamespace(namespace: string, value: string): void {
        this.namespaces += `xmlns:${namespace}="${value}" `;
    }

    write(): void {
        this.req.write(this.body(this));
    }

    end(): void {
        this.write();
        this.req.end();
    }
}

export default SOAPClient;
