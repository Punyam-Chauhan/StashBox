// Keep synthetic signup identities within the same rules as real accounts.
const allocated = new Map();
export function testStudentId(key) {
  if (!allocated.has(key)) {
    let hash = 0;
    for (const char of key)
      hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
    let value = String(10000 + (hash % 90000));
    while ([...allocated.values()].includes(value))
      value = String(10000 + ((Number(value) + 1) % 90000));
    allocated.set(key, value);
  }
  return allocated.get(key);
}
