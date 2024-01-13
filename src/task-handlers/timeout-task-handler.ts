import { AbortToken } from "../abort-token";
import { DelegatingTaskHandler } from "./delegating-task-handler";
import type { ITaskHandler } from "./itask-handler";

export class TimeoutTaskHandler<T> extends DelegatingTaskHandler<T> {

    constructor(
        delegatingHandler: ITaskHandler<T>,
        private readonly _timeout: number
    ) {
        super(delegatingHandler);
    }

    run(token: AbortToken): Promise<T> {
        const timeoutToken = AbortToken.create(token);

        const timeoutId = setTimeout(() => {
            timeoutToken.abort(`Task timedout after ${this._timeout}`);
        }, this._timeout);

        try {
            return super.run(timeoutToken);
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
}
