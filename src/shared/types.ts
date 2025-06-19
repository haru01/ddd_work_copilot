// src/shared/types.ts
import { TaskEither } from 'fp-ts/TaskEither';
import { Either, left, right } from 'fp-ts/Either';

export type UUID = string & { readonly _brand: unique symbol };

export type Result<T> =
  | { success: true; value: T }
  | { success: false; error: string };

export type AppError =
  | { type: 'ValidationError'; message: string }
  | { type: 'DomainError'; message: string };

export type AppTaskEither<T> = TaskEither<AppError, T>;

export const validationError = (message: string): AppError => ({
  type: 'ValidationError', message
});

export const domainError = (message: string): AppError => ({
  type: 'DomainError', message
});

// Result型をEitherに変換するヘルパー関数
export const resultToEither = <T>(result: Result<T>): Either<AppError, T> => {
  return result.success
    ? right(result.value)
    : left(validationError(result.error));
};
