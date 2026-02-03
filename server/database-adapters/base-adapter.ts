export interface QueryResult {
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
}

export interface TableInfo {
  name: string;
  columns: { name: string; type: string; nullable: boolean }[];
}

export interface DatabaseAdapter {
  readonly type: "postgresql" | "clickhouse";
  
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  
  executeQuery(query: string): Promise<QueryResult>;
  getSchema(): Promise<string>;
  getTables(): Promise<TableInfo[]>;
  
  isConnected(): boolean;
}

export abstract class BaseDatabaseAdapter implements DatabaseAdapter {
  abstract readonly type: "postgresql" | "clickhouse";
  protected connected: boolean = false;

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract executeQuery(query: string): Promise<QueryResult>;
  abstract getTables(): Promise<TableInfo[]>;

  isConnected(): boolean {
    return this.connected;
  }

  async getSchema(): Promise<string> {
    const tables = await this.getTables();
    
    let schema = "Таблицы в базе данных:\n\n";
    
    tables.forEach((table, index) => {
      schema += `${index + 1}. ${table.name}:\n`;
      table.columns.forEach(col => {
        const nullable = col.nullable ? " (nullable)" : "";
        schema += `   - ${col.name}: ${col.type}${nullable}\n`;
      });
      schema += "\n";
    });

    if (this.type === "postgresql") {
      schema += `\nПримеры PostgreSQL запросов:
- SELECT * FROM employees WHERE department = 'IT';
- SELECT name, salary FROM employees ORDER BY salary DESC LIMIT 5;
- SELECT COUNT(*) FROM sales WHERE sale_date >= CURRENT_DATE - INTERVAL '30 days';`;
    } else {
      schema += `\nПримеры ClickHouse запросов:
- SELECT * FROM employees WHERE department = 'IT';
- SELECT name, salary FROM employees ORDER BY salary DESC LIMIT 5;
- SELECT count() FROM sales WHERE sale_date >= today() - 30;`;
    }

    return schema;
  }
}
