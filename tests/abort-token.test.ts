import { assert } from "chai";
import { AbortToken } from "../src";

describe("AbortToken", () => {

    it("Should create a new token", () => {
        const token = AbortToken.create();

        assert.isFalse(token.aborted);
    });

    it("Should abort a token", () => {
        const token = AbortToken.create();

        token.abort("No reason");

        assert.isTrue(token.aborted);
    });

    it("Should abort a parent token", () => {
        const parent = AbortToken.create();
        const token = AbortToken.create(parent);

        parent.abort("No reason");

        assert.isTrue(token.aborted);
    });
});
