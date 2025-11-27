import { describe, it, expect } from 'vitest';

import { type Result, Ok, Err } from '../../src/types/result';

describe('Result<T, E>', () => {
  describe('Ok variant', () => {
    it('should create Ok result with value', () => {
      const result: Result<number, string> = Ok(42);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(42);
      }
    });

    it('should narrow type correctly with type guard', () => {
      const result: Result<string, Error> = Ok('success');

      if (result.ok) {
        // TypeScript should narrow to { ok: true, value: string }
        const value: string = result.value;
        expect(value).toBe('success');
      } else {
        throw new Error('Should not reach here');
      }
    });
  });

  describe('Err variant', () => {
    it('should create Err result with error', () => {
      const result: Result<number, string> = Err('failed');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('failed');
      }
    });

    it('should narrow type correctly with type guard', () => {
      const result: Result<number, Error> = Err(new Error('test error'));

      if (!result.ok) {
        // TypeScript should narrow to { ok: false, error: Error }
        const error: Error = result.error;
        expect(error.message).toBe('test error');
      } else {
        throw new Error('Should not reach here');
      }
    });
  });

  describe('Pattern matching', () => {
    it('should handle Ok case in if-else', () => {
      const result: Result<number, string> = Ok(10);

      if (result.ok) {
        expect(result.value).toBe(10);
      } else {
        throw new Error('Should not reach here');
      }
    });

    it('should handle Err case in if-else', () => {
      const result: Result<number, string> = Err('error message');

      if (result.ok) {
        throw new Error('Should not reach here');
      } else {
        expect(result.error).toBe('error message');
      }
    });
  });

  describe('Type safety', () => {
    it('should work with complex types', () => {
      interface User {
        id: string;
        name: string;
      }

      interface ValidationError {
        field: string;
        message: string;
      }

      const success: Result<User, ValidationError> = Ok({ id: '1', name: 'Alice' });
      const failure: Result<User, ValidationError> = Err({ field: 'email', message: 'Invalid' });

      if (success.ok) {
        expect(success.value.name).toBe('Alice');
      }

      if (!failure.ok) {
        expect(failure.error.field).toBe('email');
      }
    });

    it('should support discriminated union exhaustive checking', () => {
      const handleResult = (result: Result<number, string>): number => {
        if (result.ok) {
          return result.value;
        } else {
          return -1;
        }
      };

      expect(handleResult(Ok(42))).toBe(42);
      expect(handleResult(Err('error'))).toBe(-1);
    });
  });
});
