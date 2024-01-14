import { Func, DisposableHost } from "@aster-js/core";
import { Deferred } from "./deferred";
import { timeout, TimeoutResult } from "./helpers";
import { TimeoutSource } from "./timeout-source";

export type DebouncerOptions = {
    readonly delay: number;
    readonly overdue: number;
    readonly timeout: number;
}

export class Debouncer<TArgs extends any[] = [], TResult = any> extends DisposableHost {
    private readonly _callback: Func<TArgs, Promise<TResult> | TResult>;
    private readonly _options: DebouncerOptions;
    private _timeoutSource: TimeoutSource;

    private _nextResult: Deferred<TimeoutResult<TResult>> = new Deferred();
    private _nextArgs: TArgs | null = null;
    private _nextOverdue: number = -1;

    private _pendingResult: Deferred<TimeoutResult<TResult>> = new Deferred();
    private _pendingArgs: TArgs | null = null;

    private _running: boolean = false;

    get hasPendingCall(): boolean { return Boolean(this._nextArgs); }

    constructor(callback: Func<TArgs, Promise<TResult> | TResult>, options: Partial<DebouncerOptions> = {}) {
        super();
        this._callback = callback;
        this._options = { delay: 100, overdue: -1, timeout: -1, ...options };

        this.registerForDispose(
            this._timeoutSource = new TimeoutSource()
        );
    }

    /**
     * Begin invoke the debounced method.
     * This method exists to avoid awaiting the promise and avoid linter errors
     */
    beginInvoke(...args: TArgs): void {
        this.invokeCore(args);
    }

    async invoke(...args: TArgs): Promise<TResult> {
        const result = await this.invokeCore(args);
        switch (result.status) {
            case "fulfilled":
                return result.value;
            case "rejected":
                throw result.reason;
            case "timeout":
                throw new Error("Operation cancelled");
        }
    }

    async tryInvoke(...args: TArgs): Promise<TimeoutResult<TResult>> {
        return this.invokeCore(args);
    }

    private async invokeCore(args: TArgs): Promise<TimeoutResult<TResult>> {
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

        this._timeoutSource.invoke(() => this.invokeCallback(), this._options.delay);
    }

    cancel(): void {
        this._timeoutSource.clear();

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

        const task = this.runTask(this._nextArgs);
        const result = await timeout(task, this._options.timeout);

        this._nextResult.resolve(result);

        this._running = false;

        this.reset();
    }

    private async runTask(args: TArgs): Promise<TResult>{
        return this._callback(...args);
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
