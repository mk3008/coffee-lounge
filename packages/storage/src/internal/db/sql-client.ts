export type SqlQueryRows<T> = Promise<T[]>;

export type SqlCommandResult = {
  rowCount: number | null | undefined;
};

export type SqlClient = {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[] | Record<string, unknown>,
  ): SqlQueryRows<T>;
  execute(
    text: string,
    values?: readonly unknown[] | Record<string, unknown>,
  ): Promise<SqlCommandResult>;
};
