import { BaseDatabaseAdapter, QueryResult, TableInfo } from "./base-adapter";

interface ClickHouseResponse {
  data: Record<string, any>[];
  meta: { name: string; type: string }[];
  rows: number;
  statistics?: { elapsed: number; rows_read: number; bytes_read: number };
}

export class ClickHouseAdapter extends BaseDatabaseAdapter {
  readonly type = "clickhouse" as const;
  private baseUrl: string;
  private database: string;
  private username: string;
  private password: string;

  constructor(connectionUrl: string, database: string = "default") {
    super();
    
    const url = new URL(connectionUrl);
    this.baseUrl = `${url.protocol}//${url.host}`;
    this.database = database || url.pathname.slice(1) || "default";
    this.username = url.username || "default";
    this.password = url.password || "";
  }

  async connect(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/?query=SELECT%201`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      this.connected = true;
      console.log("[ClickHouse] Connected successfully");
    } catch (error) {
      this.connected = false;
      throw new Error(`Failed to connect to ClickHouse: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    console.log("[ClickHouse] Disconnected");
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.username && this.password) {
      headers["Authorization"] = `Basic ${Buffer.from(`${this.username}:${this.password}`).toString("base64")}`;
    }

    return headers;
  }

  async executeQuery(query: string): Promise<QueryResult> {
    if (!this.connected) {
      await this.connect();
    }

    const cleanQuery = query.trim();
    if (!cleanQuery) {
      throw new Error("Invalid query: empty query");
    }

    const queryWithFormat = cleanQuery.endsWith(";") 
      ? cleanQuery.slice(0, -1) + " FORMAT JSON"
      : cleanQuery + " FORMAT JSON";

    const url = `${this.baseUrl}/?database=${encodeURIComponent(this.database)}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: queryWithFormat,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ClickHouse error: ${errorText}`);
    }

    const result: ClickHouseResponse = await response.json();
    
    const columns = result.meta?.map(m => m.name) || [];
    const rows = result.data || [];
    
    return {
      columns,
      rows,
      rowCount: result.rows || rows.length
    };
  }

  async getTables(): Promise<TableInfo[]> {
    if (!this.connected) {
      await this.connect();
    }

    const tablesResult = await this.executeQuery(`
      SELECT name 
      FROM system.tables 
      WHERE database = '${this.database}'
        AND engine NOT IN ('View', 'MaterializedView')
      ORDER BY name
    `);

    const tables: TableInfo[] = [];

    for (const row of tablesResult.rows) {
      const tableName = row.name;
      
      const columnsResult = await this.executeQuery(`
        SELECT name, type, 
               position(type, 'Nullable') > 0 AS is_nullable
        FROM system.columns
        WHERE database = '${this.database}' AND table = '${tableName}'
        ORDER BY position
      `);

      tables.push({
        name: tableName,
        columns: columnsResult.rows.map(col => ({
          name: col.name,
          type: col.type,
          nullable: Boolean(col.is_nullable)
        }))
      });
    }

    return tables;
  }
}
