/**
 * Result pattern inspired by Go's error handling.
 * Returns a tuple [data, error].
 */
export type Result<T, E = Error> = [T, null] | [null, E];

/**
 * Wraps a promise to return a Go-style result tuple.
 */
export async function safe<T, E = Error>(
  promise: Promise<T>,
): Promise<Result<T, E>> {
  try {
    const data = await promise;
    return [data, null];
  } catch (err) {
    return [null, err as E];
  }
}

/**
 * Wraps a synchronous function to return a Go-style result tuple.
 */
export function safeSync<T, E = Error>(fn: () => T): Result<T, E> {
  try {
    const data = fn();
    return [data, null];
  } catch (err) {
    return [null, err as E];
  }
}
