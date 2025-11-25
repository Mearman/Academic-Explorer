/**
 * Option type for optional values.
 * Discriminated union with `some` field for pattern matching.
 *
 * @typeParam T - Value type
 *
 * @example
 * ```typescript
 * const option: Option<number> = Some(42);
 * if (option.some) {
 *   console.log(option.value); // 42
 * } else {
 *   console.log('No value');
 * }
 * ```
 */
export type Option<T> =
  | { some: true; value: T }
  | { some: false };

/**
 * Create an Option with a value present.
 *
 * @typeParam T - Value type
 * @param value - The present value
 * @returns Option with some: true
 *
 * @example
 * ```typescript
 * const option = Some(42);
 * // Option<number>
 * ```
 */
export function Some<T>(value: T): Option<T> {
  return { some: true, value };
}

/**
 * Create an Option with no value.
 *
 * @typeParam T - Value type (inferred from context)
 * @returns Option with some: false
 *
 * @example
 * ```typescript
 * const option: Option<number> = None();
 * // Option<number> with some: false
 * ```
 */
export function None<T = never>(): Option<T> {
  return { some: false };
}
