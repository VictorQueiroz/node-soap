import { ClientRequest, IncomingMessage } from 'http';

declare namespace soap {
    interface Options {
        hostname?: string;
        port?: number | string;
        method?: string;
        username?: string;
        password?: string;
    }

    interface BodyOptions {
        namespaces: string;
        methods: string;
    }

    type ResponseListener = (response: IncomingMessage) => void;

    interface SOAPClient {
        options: Options;
        fn: ResponseListener | undefined;
        namespaces: string;
        methods: string;
        req: ClientRequest;
        body(options: BodyOptions): string;
        newRequest(): this;
        method(methodName: string, command: string, namespace: string, param: string): void;
        addNamespace(namespace: string, value: string): void;
        write(): void;
        end(): void;
    }

    interface Constructor {
        (options?: Options | null, callback?: ResponseListener): SOAPClient;
        new (options?: Options | null, callback?: ResponseListener): SOAPClient;
        prototype: SOAPClient;
    }
}

declare const soap: soap.Constructor & { SOAPClient: soap.Constructor };
export = soap;
