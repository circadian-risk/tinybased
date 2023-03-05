export type Cell = string | number | boolean;
export type TableSchema = Record<string, Cell>;
export type TinyBaseSchema = Record<string, TableSchema>;
export type Aggregations = 'avg' | 'count' | 'sum' | 'max' | 'min';
