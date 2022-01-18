export namespace AsyncHelper {
    const TIMEOUT_RESULT = Symbol();

    export function sleep(delay: number): Promise<void> {
        return new Promise(
            resolve => setTimeout(resolve, delay)
        );
    }

    export function delay<T>(result: T, delay: number = 0): Promise<T> {
        return new Promise(
            resolve => setTimeout(() => resolve(result), delay)
        );
    }

    export async function timeout<T>(resultPromise: Promise<T>, timeout: number): Promise<T> {
        if (timeout === -1) return await resultPromise;

        const timeoutPromise = delay(TIMEOUT_RESULT, timeout);
        const result = await Promise.race([timeoutPromise, resultPromise]);
        if (result === TIMEOUT_RESULT) throw new Error("Operation timedout");
        return result;
    }
}
