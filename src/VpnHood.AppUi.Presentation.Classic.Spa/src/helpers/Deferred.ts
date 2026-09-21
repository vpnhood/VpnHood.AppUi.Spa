export type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
  readonly settled: boolean;
};

export function createDeferred<T>(): Deferred<T> {
  let _resolve!: (v: T | PromiseLike<T>) => void;
  let _reject!: (r?: unknown) => void;
  let _settled = false;

  const promise = new Promise<T>((res, rej) => {
    _resolve = (v) => { if (!_settled) { _settled = true; res(v); } };
    _reject  = (e) => { if (!_settled) { _settled = true; rej(e); } };
  });

  return {
    promise,
    resolve: _resolve,
    reject: _reject,
    get settled() { return _settled; },
  };
}
