import type { DatabaseAdapter, QueryResult, TableInfo } from "./base-adapter";
import { BaseDatabaseAdapter } from "./base-adapter";
import { PostgreSQLAdapter } from "./postgresql-adapter";
import { ClickHouseAdapter } from "./clickhouse-adapter";
import { getDatabaseConfig, DatabaseType } from "../llm-config";

export type { DatabaseAdapter, QueryResult, TableInfo };
export { BaseDatabaseAdapter, PostgreSQLAdapter, ClickHouseAdapter };

let currentAdapter: DatabaseAdapter | null = null;

export function createDatabaseAdapter(type: DatabaseType, connectionUrl: string, database?: string): DatabaseAdapter {
  switch (type) {
    case "clickhouse":
      return new ClickHouseAdapter(connectionUrl, database);
    case "postgresql":
    default:
      return new PostgreSQLAdapter(connectionUrl);
  }
}

export async function getActiveAdapter(): Promise<DatabaseAdapter> {
  if (currentAdapter && currentAdapter.isConnected()) {
    return currentAdapter;
  }

  const config = getDatabaseConfig();
  currentAdapter = createDatabaseAdapter(config.type, config.connectionUrl, config.name);
  await currentAdapter.connect();
  
  return currentAdapter;
}

export async function disconnectAdapter(): Promise<void> {
  if (currentAdapter) {
    await currentAdapter.disconnect();
    currentAdapter = null;
  }
}

export function getCurrentAdapterType(): DatabaseType {
  return getDatabaseConfig().type;
}
