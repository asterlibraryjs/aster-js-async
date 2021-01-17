import { EventEmitter, IEvent } from "@aster-js/events";
import { Deferred } from "./deferred";
import { Task } from "./task";
import { TaskExecutorDelegate } from "./task-handlers";

export class TaskController<T = void> {
    private readonly _tasks: Set<Task<T>>;
    private readonly _deferred: Deferred;
    private readonly _resolved: EventEmitter<T>;
    private readonly _rejected: EventEmitter<T>;

    get remaing(): number { return this._tasks.size; }

    get resolved(): IEvent<T> { return this._resolved.event; }

    get rejected(): IEvent<T> { return this._rejected.event; }

    constructor(tasks?: Iterable<Task<T>>) {
        this._tasks = new Set();
        this._deferred = new Deferred();
        this._resolved = new EventEmitter();
        this._rejected = new EventEmitter();

        if (tasks) {
            for (const task of tasks) this.addAndRun(task);
        }
    }

    run(task: Task<T>): void;
    run(task: TaskExecutorDelegate<T>, thisArg?: any): void;
    run(task: Task<T> | TaskExecutorDelegate<T>, thisArg?: any): void {
        if (this._deferred.succeed) this._deferred.reset();
        if (task instanceof Task) {
            this.addAndRun(task);
        }
        else {
            this.addAndRun(new Task(task, thisArg));
        }
    }

    whenAll(): PromiseLike<void> {
        return this._deferred;
    }

    clear(): void {
        this._tasks.clear();
        this._deferred.reset();
    }

    protected async addAndRun(task: Task<T>): Promise<void> {
        this._tasks.add(task);
        try {
            const result = await task.run();
            this._resolved.trigger(result);
        }
        catch (err) {
            this._rejected.trigger(err);
            this._deferred.reject(err);
        }
        finally {
            this._tasks.delete(task);
            if (this._tasks.size === 0) this._deferred.resolve();
        }
    }
}