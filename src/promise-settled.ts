import { AssertionError } from "@aster-js/core";

/**
 * Assert the Promise.allSettled result to ensure all promises are fulfilled results
 * @param results Results to validate
 */
export function assertAllSettledResult<T>(results: PromiseSettledResult<Awaited<T>>[]): asserts results is PromiseFulfilledResult<Awaited<T>>[] {
    const rejectedResults = results.filter(isRejectedResult);
    if (rejectedResults.length) throw new AllSettledPromiseError(rejectedResults);
}

function isRejectedResult<T>(result: PromiseSettledResult<Awaited<T>>): result is PromiseRejectedResult {
    return result.status === "rejected";
}


export class AllSettledPromiseError extends AssertionError {
    constructor(readonly rejectedResults: PromiseRejectedResult[]) {
        super(`${rejectedResults.length} errors has been trigger during promise settlement`);
    }
}
