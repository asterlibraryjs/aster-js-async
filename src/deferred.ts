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
    private _version: number = 0;
    private _promiseOrResult?: T | Promise<T> | Error;
    private _resolveCallback?: (value: T | PromiseLike<T>) => void;
    private _rejectCallback?: (reason?: any) => void;

    get version(): number { return this._version; }

    get idle(): boolean { return this._state === 0; }

    get completed(): boolean { return Boolean(this._state & DeferredState.completed); }

    get succeed(): boolean { return Boolean(this._state & DeferredState.succeed); }

    get faulted(): boolean { return Boolean(this._state & DeferredState.faulted); }

    get disposed(): boolean { return Boolean(this._state & DeferredState.disposed); }

    resolve(value: T): boolean {
        IDisposable.checkDisposed(this);

        if (!this._state) {
            this._state = DeferredState.completed | DeferredState.succeed;
            this._promiseOrResult = value;
            this._resolveCallback && this._resolveCallback(value);
            return true;
        }
        return false;
    }

    reject(reason?: any): boolean {
        IDisposable.checkDisposed(this);

        if (!this._state) {
            this._state = DeferredState.completed | DeferredState.faulted;
            const error = reason instanceof Error ? reason : new DeferredError(reason);
            this._promiseOrResult = error;
            this._rejectCallback && this._rejectCallback(error);
            return true;
        }
        return false;
    }

    cancel(): boolean {
        IDisposable.checkDisposed(this);

        if (!this._state){
            this.resetCore();
            return true;
        }
        return false;
    }

    /**
     * Reset current deferred into idle state and rejecting any pending promise
     * > To avoid rejecting pending promise, use cancel
     * @param force Reset current promise and get a new one even if its not completed
     */
    reset(force?: boolean): void {
        IDisposable.checkDisposed(this);

        if (force) {
            if (!this._state && this._rejectCallback) {
                const err = new DeferredError("Operation cancelled");
                this._rejectCallback(err);
            }
            this.resetCore();
        }
        else if (this._state) {
            this.resetCore();
        }
    }

    private resetCore(): void {
        this._version++;
        this._state = 0;

        delete this._promiseOrResult;
        delete this._resolveCallback;
        delete this._rejectCallback;
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
