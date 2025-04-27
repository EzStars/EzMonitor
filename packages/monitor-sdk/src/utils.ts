export function getUUID() {
  return `id-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function deepClone<T>(obj: T): T {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  const clone: any = Array.isArray(obj) ? [] : {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clone[key] = deepClone((obj as any)[key]);
    }
  }
  return clone as T;
}
