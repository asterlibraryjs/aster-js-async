import { Action, IDisposable } from "@aster-js/core";

export class TimeoutSource implements IDisposable {
    private _timer: number = -1;

    get hasPendingCall(): boolean { return this._timer !== -1; }

    /** Invoke the pending call and cancel any pending ones */
    invoke(callback: Action, timeout: number): void {
        this.clear();
        this.invokeCore(callback, timeout);
    }

    /** Invoke the provided callback if there is no pending call */
    tryInvoke(callback: Action, timeout: number): boolean {
        if (this._timer === -1) {
            this.invokeCore(callback, timeout);
            return true;
        }
        return false;
    }

    private invokeCore(callback: Action, timeout: number): void {
        this._timer = self.setTimeout(() => {
            this._timer = -1;
            callback();
        }, timeout);
    }

    /** Cancel any pending calls */
    clear(): void {
        if (this._timer !== -1) {
            clearTimeout(this._timer);
            this._timer = -1;
        }
    }

    [IDisposable.dispose](): void {
        this.clear();
    }
}
