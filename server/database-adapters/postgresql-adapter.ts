import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { BaseDatabaseAdapter, QueryResult, TableInfo } from "./base-adapter";

neonConfig.webSocketConstructor = ws;

export class PostgreSQLAdapter extends BaseDatabaseAdapter {
  readonly type = "postgresql" as const;
  private pool: Pool | null = null;
  private connectionUrl: string;

  constructor(connectionUrl: string) {
    super();
    this.connectionUrl = connectionUrl;
  }

  async connect(): Promise<void> {
    if (this.connected && this.pool) {
      return;
    }

    this.pool = new Pool({ connectionString: this.connectionUrl });
    
    try {
      const client = await this.pool.connect();
      client.release();
      this.connected = true;
      console.log("[PostgreSQL] Connected successfully");
    } catch (error) {
      this.connected = false;
      throw new Error(`Failed to connect to PostgreSQL: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.connected = false;
      console.log("[PostgreSQL] Disconnected");
    }
  }

  async executeQuery(query: string): Promise<QueryResult> {
    if (!this.pool || !this.connected) {
      await this.connect();
    }

    const cleanQuery = query.trim();
    if (!cleanQuery) {
      throw new Error("Invalid query: empty query");
    }

    const result = await this.pool!.query(cleanQuery);
    
    const rows = result.rows || [];
    const columns = result.fields ? result.fields.map(field => field.name) : [];
    
    return {
      columns,
      rows,
      rowCount: result.rowCount || rows.length
    };
  }

  async getTables(): Promise<TableInfo[]> {
    if (!this.pool || !this.connected) {
      await this.connect();
    }

    const tablesResult = await this.pool!.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE 'drizzle%'
        AND table_name NOT IN ('chats', 'messages', 'session')
      ORDER BY table_name
    `);

    const tables: TableInfo[] = [];

    for (const row of tablesResult.rows) {
      const tableName = row.table_name;
      
      const columnsResult = await this.pool!.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

      tables.push({
        name: tableName,
        columns: columnsResult.rows.map(col => ({
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === 'YES'
        }))
      });
    }

    return tables;
  }

  getPool(): Pool | null {
    return this.pool;
  }
}
