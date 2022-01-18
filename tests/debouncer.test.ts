import { assert } from "chai";
import { assert as sassert, spy } from "sinon";
import { AbortToken, AsyncHelper, Debouncer } from "../src";

describe("Debouncer", () => {

    it("Should return the last call result", async () => {
        const callbackSpy = spy(async (result: number, _token: AbortToken) => result)
        const debouncer = new Debouncer(callbackSpy, 500);

        const result1 = debouncer.invoke(0, AbortToken.none);
        const result2 = debouncer.invoke(1, AbortToken.none);

        const results = await Promise.all([result1, result2]);

        assert.deepEqual(results, [1, 1]);
        sassert.calledOnce(callbackSpy);
    });

    it("Should execute once and wait for second call", async () => {
        let running = false;
        const callbackSpy = spy(async (result: number, _token: AbortToken) => {
            if (running) throw new Error("Debouncer should not trigger two callback at the same time");
            try {
                running = true;
                return await AsyncHelper.delay(result, 500);
            }
            finally {
                running = false;
            }
        });

        const debouncer = new Debouncer(callbackSpy, 0);

        const result1 = debouncer.invoke(1, AbortToken.none);
        const result2 = debouncer.invoke(2, AbortToken.none);

        await AsyncHelper.sleep(5);
        const result3 = debouncer.invoke(3, AbortToken.none);

        const results = await Promise.all([result1, result2, result3]);

        assert.deepEqual(results, [2, 2, 3]);
        sassert.calledTwice(callbackSpy);
    });

    it("Should timeout the first execution", async () => {
        let delay = 5000;
        const callbackSpy = spy(async (result: number, _token: AbortToken) => {
            const currentDelay = delay;
            delay = 0;
            return await AsyncHelper.delay(result, currentDelay);
        });

        const debouncer = new Debouncer(callbackSpy, 0, 10);

        const result1 = debouncer.invoke(1, AbortToken.none);
        const result2 = debouncer.invoke(2, AbortToken.none);

        await AsyncHelper.sleep(5);
        const result3 = debouncer.invoke(3, AbortToken.none);

        const results = await Promise.allSettled([result1, result2, result3]);

        assert.deepEqual(results.map(r => r.status), ["rejected", "rejected", "fulfilled"]);
        sassert.calledTwice(callbackSpy);
    });

    it("Should cancel pending execution", async () => {
        const callbackSpy = spy(async (_token: AbortToken) => { });

        const debouncer = new Debouncer(callbackSpy, 100);

        const result = debouncer.invoke(AbortToken.none);
        debouncer.cancel();

        const results = await Promise.allSettled([result]);

        assert.deepEqual(results.map(r => r.status), ["rejected"]);
        sassert.notCalled(callbackSpy);
    });

    it("Should cancel all pending executions", async () => {
        let delay = 5000;
        const callbackSpy = spy(async (result: number, _token: AbortToken) => {
            const currentDelay = delay;
            delay = 0;
            return await AsyncHelper.delay(result, currentDelay);
        });

        const debouncer = new Debouncer(callbackSpy, 0, 10);

        const result1 = debouncer.invoke(1, AbortToken.none);
        const result2 = debouncer.invoke(2, AbortToken.none);

        await AsyncHelper.sleep(5);
        const result3 = debouncer.invoke(3, AbortToken.none);

        debouncer.cancel();

        const results = await Promise.allSettled([result1, result2, result3]);

        assert.deepEqual(results.map(r => r.status), ["rejected", "rejected", "rejected"]);
        sassert.calledOnce(callbackSpy);
    });
});
