import type { AbortToken } from "./abort-token";
import { Task } from "./task";

export class TaskQueue {
    private _head: Promise<any> = Promise.resolve();

    run<T>(factory: () => Task<T> | Promise<T>, abortToken?: AbortToken): Promise<T> {
        const task = this.runCore<T>(this._head, factory, abortToken)
        this._head = task;
        return task;
    }

    async runCore<T>(head: Promise<any>, factory: () => Task<T> | Promise<T>, abortToken?: AbortToken): Promise<T> {
        await head;

        const task = factory();
        if (task instanceof Task) {
            return await task.run(abortToken);
        }
        else {
            return await task;
        }
    }
}
