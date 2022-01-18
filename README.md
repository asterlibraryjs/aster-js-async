# @aster-js/async

## Main concept

This library introduce a very important concept that will be used in more complexes Aster libraries: The `AbortToken`.

`AbortToken` allow to cancel cascading asynchronous calls and abort them as soon as possible and change the behavior:

```ts
async function update({ data, children }: CustomData, token: AbortToken): Promise<boolean> {

    // token.signal will allow to use native AbortController signal
    // Aborting during the request will reject the fetch call
    const response = await fetch("/data/", { method: "POST", body: JSON.stringify(data), signal: token.signal });
    const created = await response.json();

    // If the token is abort we choose to remove the data
    if(token.aborted) {
        await fetch(`/data/${created.id}`, { method: "DELETE" });
        return false;
    }

    // If not, we append its children
    await fetch(`/data/${created.id}/children`, { method: "POST", body: JSON.stringify(children) });
    return true;
}

```

## Other topics

- [Deferred](./doc/deferred.md)
- [Delayed](./doc/delayed.md)
- [Debouncer](./doc/debouncer.md)
- [Task](./doc/task.md)
