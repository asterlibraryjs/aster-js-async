import { DisposedError, IDisposable } from "@aster-js/core";

export class DeferredError extends Error { }

const enum DeferredState {
    idle = 0,
    completed = 0x1,
    faulted = 0x2,
    succeed = 0x4,
    disposed = 0x8
}

export class Deferred<T = void> implements PromiseLike<T>, IDisposable {
    private _state: DeferredState = 0;
    private _promiseOrResult?: T | Promise<T> | Error;
    private _resolveCallback?: (value: T | PromiseLike<T>) => void;
    private _rejectCallback?: (reason?: any) => void;

    get idle() { return this._state === 0; }

    get completed() { return Boolean(this._state & DeferredState.completed); }

    get succeed() { return Boolean(this._state & DeferredState.succeed); }

    get faulted() { return Boolean(this._state & DeferredState.faulted); }

    get disposed() { return Boolean(this._state & DeferredState.disposed); }

    resolve(value: T): boolean {
        if (!this._state) {
            this._state = DeferredState.completed | DeferredState.succeed;
            this._promiseOrResult = value;
            this._resolveCallback && this._resolveCallback(value);
            return true;
        }
        return false;
    }

    reject(reason?: any): boolean {
        if (!this._state) {
            this._state = DeferredState.completed | DeferredState.faulted;
            const error = reason instanceof Error ? reason : new DeferredError(reason);
            this._promiseOrResult = error;
            this._rejectCallback && this._rejectCallback(error);
            return true;
        }
        return false;
    }

    reset(force?: boolean): void {
        if (force || this._state & DeferredState.completed) {
            IDisposable.checkDisposed(this);

            if (!this._state && this._rejectCallback) {
                const err = new DeferredError("Operation cancelled");
                this._rejectCallback(err);
            }
            this._state = 0;

            delete this._promiseOrResult;
            delete this._resolveCallback;
            delete this._rejectCallback;
        }
    }

    async then<TFulfill = T, TReject = never>(
        onfulfilled?: ((value: T) => TFulfill | PromiseLike<TFulfill>) | undefined | null,
        onrejected?: ((reason: any) => TReject | PromiseLike<TReject>) | undefined | null
    ): Promise<TFulfill | TReject> {
        if (this._promiseOrResult instanceof Promise) {
            return this._promiseOrResult.then(onfulfilled, onrejected);
        }
        if (this._state & DeferredState.succeed) {
            if (onfulfilled) return onfulfilled(this._promiseOrResult as T);
        }
        if (this._state & DeferredState.faulted) {
            if (onrejected) return onrejected(this._promiseOrResult);
        }

        return this.initAwaiter().then(onfulfilled, onrejected);
    }

    /**
     * Transform current instance into a native promise
     * > This method should be used carefully
     */
    getAwaiter(): Promise<T> {
        if (this._promiseOrResult instanceof Promise) {
            return this._promiseOrResult;
        }
        if (this._state & DeferredState.succeed) {
            return Promise.resolve(this._promiseOrResult as T);
        }
        if (this._state & DeferredState.faulted) {
            return Promise.reject(this._promiseOrResult);
        }
        return this.initAwaiter();
    }

    private initAwaiter(): Promise<T> {
        const promise = new Promise<T>((resolve, reject) => {
            this._resolveCallback = resolve;
            this._rejectCallback = reject;
        });
        this._promiseOrResult = promise;
        return promise;
    }

    [IDisposable.dispose](): void {
        if (this._state !== DeferredState.disposed) {
            this.reject(new DisposedError());
            delete this._promiseOrResult;
            this._state = DeferredState.disposed;
        }
    }

    static resolve<T = any>(value: T): Deferred<T> {
        const d = new Deferred<T>();
        d.resolve(value);
        return d;
    }

    static reject<T = any>(reason?: any): Deferred<T> {
        const d = new Deferred<T>();
        d.reject(reason);
        return d;
    }
}
