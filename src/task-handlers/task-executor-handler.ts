import type { AbortToken } from "../abort-token";
import type { ITaskHandler, TaskExecutorDelegate } from "./itask-handler";


export class TaskExecutorHandler<T> implements ITaskHandler<T>{
    private readonly _executor: TaskExecutorDelegate<T>;

    constructor(executor: TaskExecutorDelegate<T>, thisArg?: any) {
        this._executor = thisArg ? executor.bind(thisArg) : executor;
    }

    async run(token: AbortToken): Promise<T> {
        token?.throwIfAborted();
        return await this._executor(token);
    }
}
