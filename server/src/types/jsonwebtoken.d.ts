declare module 'jsonwebtoken' {
    export function sign(payload: string | Buffer | object, secretOrPrivateKey: string, options?: any): string;
    export function verify(token: string, secretOrPublicKey: string, options?: any): string | object;
    export function decode(token: string, options?: any): null | { [key: string]: any } | string;
}
