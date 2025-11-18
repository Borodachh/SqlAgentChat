import Database from "better-sqlite3";
import path from "path";

const db = new Database(path.join(process.cwd(), "data.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    position TEXT NOT NULL,
    department TEXT NOT NULL,
    salary INTEGER NOT NULL,
    hire_date TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL,
    stock INTEGER NOT NULL,
    supplier TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    sale_date TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    total_amount REAL NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    sql_query TEXT,
    query_results TEXT,
    timestamp INTEGER NOT NULL,
    error TEXT
  );
`);

const employeesCount = db.prepare("SELECT COUNT(*) as count FROM employees").get() as { count: number };
if (employeesCount.count === 0) {
  const insertEmployee = db.prepare(
    "INSERT INTO employees (name, position, department, salary, hire_date) VALUES (?, ?, ?, ?, ?)"
  );

  const employees = [
    ["Иванов Иван", "Разработчик", "IT", 120000, "2022-01-15"],
    ["Петрова Мария", "Менеджер", "Продажи", 90000, "2021-06-20"],
    ["Сидоров Петр", "Дизайнер", "Маркетинг", 85000, "2022-03-10"],
    ["Козлова Анна", "HR специалист", "HR", 75000, "2021-09-05"],
    ["Николаев Алексей", "Тимлид", "IT", 150000, "2020-11-12"],
    ["Федорова Елена", "Аналитик", "Аналитика", 95000, "2022-02-28"],
    ["Морозов Дмитрий", "Разработчик", "IT", 110000, "2022-07-01"],
    ["Васильева Ольга", "Менеджер проектов", "Управление", 130000, "2021-04-15"],
  ];

  for (const emp of employees) {
    insertEmployee.run(...emp);
  }
}

const productsCount = db.prepare("SELECT COUNT(*) as count FROM products").get() as { count: number };
if (productsCount.count === 0) {
  const insertProduct = db.prepare(
    "INSERT INTO products (name, category, price, stock, supplier) VALUES (?, ?, ?, ?, ?)"
  );

  const products = [
    ["Ноутбук Dell XPS", "Электроника", 89999.99, 15, "Dell Inc."],
    ["Смартфон iPhone 14", "Электроника", 79999.00, 25, "Apple Inc."],
    ["Клавиатура механическая", "Аксессуары", 5499.00, 50, "Logitech"],
    ["Мышь беспроводная", "Аксессуары", 2199.00, 100, "Logitech"],
    ["Монитор Samsung 27", "Электроника", 24999.00, 20, "Samsung"],
    ["Наушники Sony WH-1000XM5", "Аксессуары", 29999.00, 30, "Sony"],
    ["Планшет iPad Air", "Электроника", 54999.00, 18, "Apple Inc."],
    ["Веб-камера Logitech", "Аксессуары", 7999.00, 40, "Logitech"],
  ];

  for (const prod of products) {
    insertProduct.run(...prod);
  }
}

const salesCount = db.prepare("SELECT COUNT(*) as count FROM sales").get() as { count: number };
if (salesCount.count === 0) {
  const insertSale = db.prepare(
    "INSERT INTO sales (product_id, quantity, sale_date, customer_name, total_amount) VALUES (?, ?, ?, ?, ?)"
  );

  const sales = [
    [1, 2, "2024-01-15", "ООО Техно", 179999.98],
    [2, 5, "2024-01-20", "ИП Смирнов", 399995.00],
    [3, 10, "2024-02-05", "ООО Офис Плюс", 54990.00],
    [4, 15, "2024-02-10", "ООО Офис Плюс", 32985.00],
    [5, 3, "2024-02-18", "ИП Петров", 74997.00],
    [6, 7, "2024-03-01", "ООО Музыка", 209993.00],
    [1, 1, "2024-03-12", "ИП Иванов", 89999.99],
    [7, 4, "2024-03-25", "ООО Образование", 219996.00],
  ];

  for (const sale of sales) {
    insertSale.run(...sale);
  }
}

export function executeQuery(query: string): { columns: string[]; rows: any[]; rowCount: number } {
  try {
    if (!query || typeof query !== 'string') {
      throw new Error("Invalid query: must be a non-empty string");
    }

    const cleanQuery = query.trim();
    if (!cleanQuery) {
      throw new Error("Invalid query: empty query");
    }

    const stmt = db.prepare(cleanQuery);
    const rows = stmt.all();
    
    if (rows.length === 0) {
      return { columns: [], rows: [], rowCount: 0 };
    }

    const columns = Object.keys(rows[0]);
    return { columns, rows, rowCount: rows.length };
  } catch (error: any) {
    console.error("SQL execution error:", error);
    throw new Error(`Ошибка выполнения SQL: ${error.message}`);
  }
}

export function getDatabaseSchema(): string {
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `).all() as { name: string }[];

  let schema = "";
  for (const table of tables) {
    const tableInfo = db.prepare(`PRAGMA table_info(${table.name})`).all();
    schema += `\nТаблица: ${table.name}\n`;
    schema += "Колонки:\n";
    for (const col of tableInfo) {
      schema += `  - ${(col as any).name} (${(col as any).type})\n`;
    }
  }

  return schema;
}

export default db;
