import type { QuerySpec } from "./rawsql-contract.js";

export function mappedOutput<Value>(options: {
  mapping: QuerySpec<unknown[], Value>["output"]["mapping"];
  validate: (value: unknown) => Value;
  example: Value;
}): NonNullable<QuerySpec<unknown[], Value>["output"]> {
  return {
    mapping: options.mapping,
    // rawsql-ts applies mapping before validate. Keeping that convention explicit
    // here makes the DTO boundary obvious when reading each QuerySpec.
    validate: options.validate,
    example: options.example,
  };
}

export function scalarOutput<Value>(options: {
  validate: (value: unknown) => Value;
  example: Value;
}): NonNullable<QuerySpec<unknown[], Value>["output"]> {
  return {
    // Scalar queries are easiest to read when the contract says "validate the
    // scalar value directly" instead of pretending there is a mapped row DTO.
    validate: options.validate,
    example: options.example,
  };
}
