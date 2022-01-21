import { assert } from "chai";
import { assert as sassert, spy } from "sinon";
import { delay, timeout } from "../src/helpers";

describe("delay", () => {

    it("Should delay a basic call", async () => {
        const callbackSpy = spy(async () => 0);

        const p1 = delay(callbackSpy, 100);
        const p2 = delay(callbackSpy, 200);

        const results = await Promise.all([p1, p2]);

        assert.deepEqual(results, [0, 0]);
        sassert.calledTwice(callbackSpy);
    });

    it("Should delay and reject a call", async () => {
        const callbackSpy = spy(async () => 0);

        const p1 = delay(callbackSpy, 100);
        const p2 = delay(callbackSpy, 100);
        p2.reject();

        const results = await Promise.allSettled([p1, p2]);

        assert.deepEqual(results.map(r => r.status), ["fulfilled", "rejected"]);
        sassert.calledOnce(callbackSpy);
    });

    it("Should timeout when the deferred is cancelled", async () => {
        const callbackSpy = spy(async () => 0);

        const p = delay(callbackSpy, 100);
        p.cancel();

        const result = await timeout(p, 500);

        assert.deepEqual(result.status, "timeout");
        sassert.notCalled(callbackSpy);
    });
});
