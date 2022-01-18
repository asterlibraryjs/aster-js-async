
## Task<T>

> Work in progress

Task provide an execution pipeline to run complex logics.

```typescript
const task = new Task(executor);
task.use(TimeoutTaskHandler, 10000); // Abort the operation after 10 sec
task.use(DelayedTaskHandler, 300); // Delay the call with a 300 ms
await task.run(token);
```

## Implements

- `IDisposable` from `@aster-js/core`
