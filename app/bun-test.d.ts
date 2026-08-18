declare module 'bun:test' {
  export function test(name: string, callback: () => void): void
  export function expect<T>(value: T): {
    toBe(expected: T): void
    toThrow(): void
  }
}
