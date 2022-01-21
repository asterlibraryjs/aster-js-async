import { Func, Disposable } from "@aster-js/core";
import { Deferred } from "./deferred";
import { timeout } from "./helpers";

export type DebouncerOptions = {
    readonly delay: number;
    readonly overdue: number;
    readonly timeout: number;
}

export class Debouncer<TArgs extends any[] = [], TResult = any> extends Disposable {
    private readonly _callback: Func<TArgs, Promise<TResult>>;
    private readonly _options: DebouncerOptions;
    private _timer: number = 0;

    private _nextResult: Deferred<TResult> = new Deferred();
    private _nextArgs: TArgs | null = null;
    private _nextOverdue: number = -1;

    private _pendingResult: Deferred<TResult> = new Deferred();
    private _pendingArgs: TArgs | null = null;

    private _running: boolean = false;

    constructor(callback: Func<TArgs, Promise<TResult>>, options: Partial<DebouncerOptions> = {}) {
        super();
        this._callback = callback;
        this._options = { delay: 100, overdue: -1, timeout: -1, ...options };
    }

    async tryInvoke(...args: TArgs): Promise<PromiseSettledResult<TResult>> {
        try {
            const value = await this.invoke(...args);
            return { status: "fulfilled", value };
        }
        catch (err) {
            return { status: "rejected", reason: err };
        }
    }

    async invoke(...args: TArgs): Promise<TResult> {
        if (this.isOverdue() || this._running) {
            this._pendingArgs = args;
            return await this._pendingResult;
        }

        this._nextArgs = args;
        this.scheduleNext();
        return await this._nextResult;
    }

    private scheduleNext(): void {
        if (this._nextOverdue === -1 && this._options.overdue !== -1) {
            this._nextOverdue = Date.now() + this._options.overdue;
        }

        clearTimeout(this._timer);
        this._timer = window.setTimeout(() => this.invokeCallback(), this._options.delay);
    }

    cancel(): void {
        clearTimeout(this._timer);

        if (!this._running) {
            const error = new Error("Operation cancelled");
            this._nextResult.reject(error);
        }

        if (this._pendingArgs) {
            const error = new Error("Operation cancelled");
            this._pendingResult.reject(error);

            this._pendingResult = new Deferred();
            this._pendingArgs = null;
        }

        this.reset();
    }

    private async invokeCallback(): Promise<void> {
        if (!this._nextArgs) return;

        this._running = true;

        const task = this._callback(...this._nextArgs);
        const result = await timeout(task, this._options.timeout);
        switch (result.status) {
            case "fulfilled":
                this._nextResult.resolve(result.value);
                break;
            case "rejected":
                this._nextResult.reject(result.reason);
                break;
            case "timeout":
                const error = new Error("Operation cancelled");
                this._nextResult.reject(error);
                break;
        }

        this._running = false;

        this.reset();
    }

    private isOverdue(): boolean {
        return this._nextOverdue !== -1 && this._nextOverdue < Date.now();
    }

    private reset(): void {
        this._nextOverdue = -1;

        this._nextResult = this._pendingResult;
        this._nextArgs = this._pendingArgs;

        this._pendingResult = new Deferred();
        this._pendingArgs = null;

        if (this._nextArgs) this.scheduleNext();
    }

    protected dispose(): void {
        this.cancel();
    }
}
