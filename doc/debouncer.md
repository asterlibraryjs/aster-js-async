
## Debouncer<TArgs, TResult>

`Debouncer<TArgs, TResult>` provides a simple and sage wait to debounce actions and functions with variable arguments call.

## Safety

Each call will be debounced and only the end result will be propagated to each promise listener.

When the callback start to be call, every other call will be stopped during the call.
This will inconsistant result. As a safety feature, the timeout allow to ignore and throw an error when the callback takes too long to execute
and then avoid further call to be block by an unfortunate bad call.

```typescript

function search(text: string, abortToken: AbortToken): Promise<any[]> {/* long API call*/}

// Action, Debouncer delay, Action Timeout
const debouncer = new Debouncer(search, 600, 100);

const p1 = debouncer.invoke("hel", AbortToken.none);
// user typing ...
const p2 = debouncer.invoke("hell", AbortToken.none);
// user typing ...
const p3 = debouncer.invoke("hello", AbortToken.none);

const [result1, result2, result3] = Promise.all(p1, p2, p3);
// Each result will be the same

```

## Reference

- `invoke(...args: TArgs): Promise<TResult>`: Ask to invoke the callback with the provided arguments.

- `cancel(): void`: Cancel any pending call.

## Implements

- `IDisposable` from `@aster-js/core`
