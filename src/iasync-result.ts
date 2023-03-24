
export interface AsyncResult<T> extends PromiseLike<T> { }

export interface IAsyncResult<T = void> {
    catch<TResult = never>(onrejected: (reason: any) => TResult | PromiseLike<TResult>): Promise<T | TResult>;
    finally(onfinally: () => void): Promise<T>;
}
