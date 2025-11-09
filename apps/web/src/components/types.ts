export type ColumnConfig = {
  key: string;
  header: string;
  render?: (value: unknown, row: unknown) => React.ReactNode;
};
