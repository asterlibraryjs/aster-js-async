import { AbortToken } from "../abort-token";

export type TaskExecutorDelegate<T> = (token: AbortToken) => T | Promise<T>;

export interface ITaskHandler<T = any> {
    run(token: AbortToken): Promise<T>;
}
