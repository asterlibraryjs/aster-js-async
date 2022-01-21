import { delay } from "./delay";

const TIMEOUT_RESULT = Symbol();

export type PromiseTimeoutResult = {
    readonly status: "timeout";
}
export type TimeoutResult<T> = PromiseTimeoutResult | PromiseSettledResult<T>;

export async function timeout<T>(resultPromise: PromiseLike<T>, timeout: number): Promise<TimeoutResult<T>> {
    if (timeout === -1) {
        try{
            return { status: "fulfilled", value: await resultPromise };
        }
        catch(err){
            return { status: "rejected", reason: err };
        }
    };

    const timeoutPromise = delay<typeof TIMEOUT_RESULT>(() => TIMEOUT_RESULT, timeout);
    try {
        const result = await Promise.race([timeoutPromise, resultPromise]);

        if (result === TIMEOUT_RESULT) return { status: "timeout" };

        return { status: "fulfilled", value: result };
    }
    catch (err) {
        return { status: "rejected", reason: err };
    }
}
