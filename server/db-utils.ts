import { db, pool } from "./db";
import { sql } from "drizzle-orm";

export function getDatabaseSchema(): string {
  return `
Таблицы в базе данных:

1. employees (сотрудники):
   - id: integer (PRIMARY KEY)
   - name: text (имя сотрудника)
   - position: text (должность)
   - department: text (отдел)
   - salary: integer (зарплата)
   - hire_date: text (дата найма)

2. products (продукты):
   - id: integer (PRIMARY KEY)
   - name: text (название продукта)
   - category: text (категория)
   - price: real (цена)
   - stock: integer (количество на складе)
   - supplier: text (поставщик)

3. sales (продажи):
   - id: integer (PRIMARY KEY)
   - product_id: integer (FOREIGN KEY → products.id)
   - quantity: integer (количество)
   - sale_date: text (дата продажи)
   - customer_name: text (имя покупателя)
   - total_amount: real (общая сумма)

Примеры запросов:
- SELECT * FROM employees WHERE department = 'IT';
- SELECT name, salary FROM employees ORDER BY salary DESC LIMIT 5;
- SELECT p.name, s.quantity FROM products p JOIN sales s ON p.id = s.product_id;
`;
}

export async function executeQuery(query: string): Promise<{ columns: string[]; rows: any[]; rowCount: number }> {
  try {
    if (!query || typeof query !== 'string') {
      throw new Error("Invalid query: must be a non-empty string");
    }

    const cleanQuery = query.trim();
    if (!cleanQuery) {
      throw new Error("Invalid query: empty query");
    }

    // Execute raw SQL query using Neon pool
    const result = await pool.query(cleanQuery);
    
    const rows = result.rows || [];
    const columns = result.fields ? result.fields.map(field => field.name) : [];
    
    return {
      columns,
      rows,
      rowCount: result.rowCount || rows.length
    };
  } catch (err: any) {
    console.error("Error executing query:", err);
    throw new Error(`Ошибка выполнения SQL запроса: ${err.message}`);
  }
}
