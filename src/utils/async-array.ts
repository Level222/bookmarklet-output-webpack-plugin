export const mapAsync = async <T, U>(
  array: T[],
  callbackfn: (value: T, index: number, array: T[]) => Promise<U>,
  thisArg?: any
): Promise<U[]> => {
  return Promise.all(array.map(callbackfn, thisArg));
};

export const findAsync = async <T>(
  array: T[],
  predicate: (value: T, index: number, obj: T[]) => Promise<unknown>,
  thisArg?: any
): Promise<T | undefined> => {
  const results = await Promise.all(array.map(predicate, thisArg));
  const index = results.findIndex((result) => result);
  return array[index];
};
