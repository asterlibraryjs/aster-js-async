import { Disposable, IDisposable } from "@aster-js/core";
import { AbortableToken, AbortToken } from "./abort-token";
import { Deferred } from "./deferred";
import { DelayedTaskHandler } from "./task-handlers/delayed-task-handler";
import { DelegatingTaskHandler, DelegatingTaskHandlerConstructor } from "./task-handlers/delegating-task-handler";
import { ITaskHandler, TaskExecutorDelegate } from "./task-handlers/itask-handler";
import { TaskExecutorHandler } from "./task-handlers/task-executor-handler";
import { TimeoutTaskHandler } from "./task-handlers/timeout-task-handler";

export class Task<T = void> extends Disposable implements PromiseLike<T>  {
    private readonly _deferred: Deferred<T>;
    private _taskHandler: ITaskHandler<T>;
    private _token?: AbortableToken;

    get completed(): boolean { return this._deferred.completed; }

    get running(): boolean { return Boolean(this._token) && !this._deferred.completed; }

    constructor(executor: TaskExecutorDelegate<T>, thisArg?: any) {
        super();
        this._taskHandler = new TaskExecutorHandler(executor, thisArg);
        this._deferred = new Deferred();
    }

    use<THandler extends DelegatingTaskHandler<T>, TArgs extends any[]>(ctor: DelegatingTaskHandlerConstructor<THandler, TArgs>, ...args: TArgs): this {
        this._taskHandler = new ctor(this._taskHandler, ...args);
        return this;
    }

    run(token?: AbortToken): this {
        if (!this._token && !this._deferred.completed) {
            this._token = AbortToken.create(token);
            this._token.register(this._deferred);
            this.runCore(this._token);
        }
        return this;
    }

    abort(): void {
        if (this._token) {
            this._token.abort("Task aborted");
        }
        else {
            this._deferred.reject("Task aborted");
        }
    }

    then<TFulfill = T, TReject = never>(
        onfulfilled?: ((value: T) => TFulfill | PromiseLike<TFulfill>) | undefined | null,
        onrejected?: ((reason: any) => TReject | PromiseLike<TReject>) | undefined | null
    ): Promise<TFulfill | TReject> {
        return this._deferred.then(onfulfilled, onrejected);
    }

    private async runCore(token: AbortableToken): Promise<void> {
        try {
            const result = await this._taskHandler.run(token);
            this._deferred.resolve(result);
        }
        catch (err) {
            this._deferred.reject(err);
        }
    }

    protected dispose(): void {
        IDisposable.safeDispose(this._deferred);
        IDisposable.safeDispose(this._token);
    }

    static run<T>(executor: TaskExecutorDelegate<T>, timeout?: number, token?: AbortToken): Task<T> {
        const task = new Task(executor);
        if (timeout) task.use(TimeoutTaskHandler, timeout);
        task.run(token);
        return task;
    }

    static delay<T>(executor: TaskExecutorDelegate<T>, delay: number = 0, timeout?: number, token?: AbortToken): Task<T> {
        const task = new Task(executor);
        task.use(DelayedTaskHandler, delay);
        if (timeout) task.use(TimeoutTaskHandler, timeout);
        task.run(token);
        return task;
    }
}