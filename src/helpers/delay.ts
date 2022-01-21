import { Deferred } from "../deferred";

export function sleep(delay: number): Promise<void> {
    return new Promise(
        resolve => setTimeout(resolve, delay)
    );
}

export function delay<T>(callback: () => T | Promise<T>, timeout: number = 0): Deferred<T> {
    const deferred = new Deferred<T>();
    const version = deferred.version;
    setTimeout(async () => {
        try {
            if (!deferred.completed && version === deferred.version) {
                const result = await callback();
                deferred.resolve(result);
            }
        }
        catch (err) {
            if(version === deferred.version) deferred.reject(err);
        }
    }, timeout);

    return deferred;
}
