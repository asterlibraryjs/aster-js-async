import { AbortToken } from "../abort-token";
import { AsyncHelper } from "../helper";
import { DelegatingTaskHandler } from "./delegating-task-handler";
import { ITaskHandler } from "./itask-handler";

export class DelayedTaskHandler<T> extends DelegatingTaskHandler<T> {

    constructor( 
        delegatingHandler: ITaskHandler<T>,
        private readonly _delay: number
    ) {
        super(delegatingHandler);
    }

    async run(token: AbortToken): Promise<T> {
        await AsyncHelper.sleep(this._delay);
        return await super.run(token);
    }
}