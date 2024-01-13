import { IDisposable } from "@aster-js/core";
import { Deferred } from "./deferred";

const NoValue = Symbol();
const Disposed = Symbol();

export class Delayed<T = any> implements IDisposable {
    private _value: T | typeof NoValue | typeof Disposed = NoValue;
    private _deferred?: Deferred<T>;

    get disposed(): boolean { return this._value === Disposed; }

    has(): boolean {
        IDisposable.checkDisposed(this);
        return this._value !== NoValue;
    }

    get(): PromiseLike<T> | T {
        IDisposable.checkDisposed(this);

        if (this._value !== NoValue) return this._value as T;
        if (!this._deferred) this._deferred = new Deferred();
        return this._deferred;
    }

    set(value: T): void {
        IDisposable.checkDisposed(this);

        this._value = value;
        this._deferred?.resolve(value);
    }

    reset(): void {
        IDisposable.checkDisposed(this);

        IDisposable.safeDispose(this._deferred);
        IDisposable.safeDispose(this._value);
        this._value = NoValue;
    }

    [IDisposable.dispose](): void {
        IDisposable.safeDispose(this._deferred);
        IDisposable.safeDispose(this._value);
        this._value = Disposed;
    }
}
