import { Disposable, DisposedError } from "@aster-js/core";
import { Deferred } from "./deferred";

const NO_VALUE = Symbol();

export class AbortError extends Error { }

export type AbortListenerDelegate = (reason: any) => void;

export interface AbortToken {

    readonly aborted: boolean;

    readonly reason: any;

    readonly signal: AbortSignal | null;

    register(listener: AbortListenerDelegate | Deferred | AbortableToken): void;

    throwIfAborted(): void;
}

export namespace AbortToken {
    export const none = Object.freeze<AbortToken>({
        aborted: false,
        reason: null,
        signal: null,
        register: () => { },
        throwIfAborted: () => { }
    });
    /**
     * Create a new AbortableToken
     */
    export function create(parent?: AbortToken): AbortableToken {
        const token = new AbortableToken();
        if (parent) token.attach(parent);
        return token;
    }
    /**
     * Return whether or not the provided value is a valid token
     * @param token Token to validate
     */
    export function isValidToken(token: unknown): token is AbortToken {
        return token instanceof ReadOnlyAbortToken
            || token instanceof AbortableToken
            || token === none;
    }
}

class ReadOnlyAbortToken implements AbortToken {

    get aborted(): boolean { return this._source.aborted; }

    get reason(): any { return this._source.reason; }

    get signal(): AbortSignal | null { return this._source.signal; }

    constructor(
        private readonly _source: AbortableToken
    ) { }

    register(listener: AbortListenerDelegate | Deferred | AbortableToken): void {
        this._source.register(listener);
    }

    throwIfAborted(): void {
        this._source.throwIfAborted();
    }
}

export class AbortableToken extends Disposable implements AbortToken {
    private readonly _listeners: (AbortListenerDelegate | Deferred | AbortableToken)[] = [];
    private _controller?: AbortController = new AbortController();
    private _abortReason: any = NO_VALUE;
    private _readOnly?: AbortToken;

    get aborted(): boolean { return this._abortReason !== NO_VALUE; }

    get reason(): any { return this._abortReason !== NO_VALUE ? this._abortReason : null; }

    /** Gets a ReadOnly token that will not be able to abort him by itself */
    get readOnly(): AbortToken {
        if (!this._readOnly) {
            this.checkIfDisposed();
            this._readOnly = new ReadOnlyAbortToken(this);
        }
        return this._readOnly;
    }

    get signal(): AbortSignal | null {
        if (!this._controller) {
            this._controller = new AbortController();
        }
        return this._controller.signal;
    }

    register(listener: AbortListenerDelegate | Deferred<any> | AbortableToken): void {
        this.checkIfDisposed();
        if (listener !== AbortToken.none) {
            this._listeners.push(listener);
        }
    }

    throwIfAborted(): void {
        this.checkIfDisposed();

        if (this.aborted) throw new AbortError();
    }

    abort(reason: any): boolean {
        if (!this.disposed && !this.aborted) {
            this._abortReason = reason;
            this._controller?.abort();

            this._listeners.forEach(async l => {
                if (l instanceof Deferred) {
                    l.reject(reason);
                }
                else if (l instanceof Function) {
                    l(reason);
                }
                else {
                    l.abort(reason);
                }
            });

            return true;
        }
        return false;
    }

    /**
     * Attach the promise to abort current token if the promise itself is aborted too
     * @param promiseOrDeferred Promise of Deferred to listen
     */
    attach(abortable: Promise<any> | Deferred<any> | AbortToken): void {
        this.checkIfDisposed();

        if (abortable instanceof Promise || abortable instanceof Deferred) {
            abortable.then(null, err => this.abort(err));
        }
        else {
            abortable.register(reason => this.abort(reason));
        }
    }

    protected dispose(): void {
        if (this._listeners.length) {
            var reason = new DisposedError("Token disposed");
            this.abort(reason);
            this._listeners.splice(0);
        }
    }
}
