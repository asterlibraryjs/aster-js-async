import type { AbortToken } from "../abort-token";
import type { ITaskHandler } from "./itask-handler";

export interface DelegatingTaskHandlerConstructor<T extends DelegatingTaskHandler = DelegatingTaskHandler, TArgs extends any[] = any[]> {
    new(innerHandler: ITaskHandler, ...args: TArgs): T;
}

export class DelegatingTaskHandler<T = any> implements ITaskHandler<T> {

    constructor(
        private readonly _delegatingHandler: ITaskHandler<T>
    ) { }

    run(token: AbortToken): Promise<T> {
        return this._delegatingHandler.run(token);
    }
}
