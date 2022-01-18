import { IDisposable, Func } from "@aster-js/core";
import { AbortToken } from "./abort-token";
import { Deferred } from "./deferred";
import { AsyncHelper } from "./helper";

export class Debouncer<TArgs extends [...any, AbortToken?] = [], TResult = any> implements IDisposable {
    private readonly _callback: Func<TArgs, Promise<TResult>>;
    private readonly _result: Deferred<TResult>;
    private readonly _running: Deferred;
    private readonly _delay: number;
    private readonly _timeout: number;
    private _timer: number = 0;
    private _version: number = 0;

    constructor(callback: Func<TArgs, Promise<TResult>>, delay: number, timeout: number = -1) {
        this._delay = delay;
        this._callback = callback;
        this._timeout = timeout;
        this._result = new Deferred();
        this._running = Deferred.resolve<void>(void 0);
    }

    tryInvoke(...args: TArgs): Promise<PromiseSettledResult<TResult>> {
        // Keep a reference to the original awaiter to avoid getting the reset one
        const awaiter = this._running.getAwaiter();
        return this.tryInvokeCore(args, awaiter, this._version);
    }

    private async tryInvokeCore(args: TArgs, running: Promise<void>, version: number): Promise<PromiseSettledResult<TResult>> {
        try {
            const value = await this.invokeCore(args, running, version);
            return { status: "fulfilled", value };
        }
        catch (err) {
            return { status: "rejected", reason: err };
        }
    }

    invoke(...args: TArgs): Promise<TResult> {
        const awaiter = this._running.getAwaiter();
        return this.invokeCore(args, awaiter, this._version);
    }

    private async invokeCore(args: TArgs, running: Promise<void>, version: number): Promise<TResult> {
        await Promise.resolve();

        this.checkVersion(version);

        const abortToken = args[args.length - 1] as AbortToken;

        await running;
        abortToken.throwIfAborted();
        version = this._version;

        clearTimeout(this._timer);
        this._result.reset();

        this._timer = window.setTimeout(() => this.invokeCallback(args, version), this._delay)
        return await this._result;
    }

    cancel(): void {
        const error = new Error("Operation cancelled");

        this._result.reject(error);
        // Reject pending ones
        this._running.reset(true);

        this.reset(this._version);
    }

    private async invokeCallback(args: TArgs, version: number): Promise<void> {
        this._running.reset();
        try {
            const task = this._callback(...args);
            const result = await AsyncHelper.timeout(task, this._timeout);

            if (version === this._version) this._result.resolve(result);
        }
        catch (err) {
            if (version === this._version) this._result.reject(err);
        }
        finally {
            this.reset(version);
        }
    }

    private reset(version: number): void {
        if (version === this._version) {
            this._version++;
            this._running.resolve();
            this._result.reset();
        }
    }

    private checkVersion(expected: number): void {
        if (expected !== this._version) throw new Error("Operation cancelled");
    }

    [IDisposable.dispose](): void {
        clearTimeout(this._timer);
        this._result.reset(true);
        this._running.reset(true);
    }
}
