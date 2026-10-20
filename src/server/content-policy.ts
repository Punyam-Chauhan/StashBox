import { AsyncLocalStorage } from "node:async_hooks";
import { ValidationError } from "../domain/validation-error";
import { prohibitedReason as builtInReason } from "../domain/moderation";
import { customBlockedReason } from "../domain/site-settings";
export { asciiText, asciiDisplay } from "../domain/moderation";
const words = new AsyncLocalStorage<string[]>();
export function withContentPolicy<T>(list: string[], work: () => T): T {
  return words.run(list, work);
}
export function prohibitedReason(value: string) {
  return (
    builtInReason(value) || customBlockedReason(value, words.getStore() || [])
  );
}
export function checkContent(...values: string[]) {
  const reason = prohibitedReason(values.join(" "));
  if (reason) throw new ValidationError(reason);
}
