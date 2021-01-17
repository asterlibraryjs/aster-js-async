
## Delayed<T>

`Delayed` is usefull to provide a value that doesn't exist yet.

```typescript
class HttpClient {
    private readonly _token: Delayed<string>;

    constructor() {
        this._token = new Delayed();
    }

    setToken(token: string): void {
        this._token.set(token);
    }

    async get(url: string): Promise<any> {
        const token = await this._token.get();
        const res = await fetch(url, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` } 
        });
        return await res.json();
    }
}
```

## Reference

- `readonly disposed: boolean`: Indicate whether or not current instance is disposed.
- `has(): boolean`: Indicate whether or not the delayed value has been set.
- `get(): Promise<T> | T`: Returns the value or a promise of the value.
- `set(value: T): void`: Set the internal and resolve value promise.
- `reset(): void`: Reset the value to unset and reset the promise to await a new value.

## Implements

- [IDisposable](./disposable.md)