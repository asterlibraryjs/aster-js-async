import { Action, IDisposable } from "@aster-js/core";

export class TimeoutSource implements IDisposable {
    private _timer: number = -1;

    get hasPendingCall(): boolean { return this._timer !== -1; }

    invoke(callback: Action, timeout: number): void {
        this.clear();

        this._timer = self.setTimeout(() => {
            this._timer = -1;
            callback();
        }, timeout);
    }

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
