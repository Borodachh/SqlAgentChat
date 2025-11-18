import { db, pool } from "./db";
import { employees, products, sales } from "@shared/schema";
import { count } from "drizzle-orm";

async function seed() {
  console.log("Starting database seed...");

  // Check if data already exists
  const [employeesCount] = await db.select({ count: count() }).from(employees);
  
  if (employeesCount.count === 0) {
    console.log("Seeding employees...");
    await db.insert(employees).values([
      { name: "Иванов Иван", position: "Разработчик", department: "IT", salary: 120000, hireDate: "2022-01-15" },
      { name: "Петрова Мария", position: "Менеджер", department: "Продажи", salary: 90000, hireDate: "2021-06-20" },
      { name: "Сидоров Петр", position: "Дизайнер", department: "Маркетинг", salary: 85000, hireDate: "2022-03-10" },
      { name: "Козлова Анна", position: "HR специалист", department: "HR", salary: 75000, hireDate: "2021-09-05" },
      { name: "Николаев Алексей", position: "Тимлид", department: "IT", salary: 150000, hireDate: "2020-11-12" },
      { name: "Федорова Елена", position: "Аналитик", department: "Аналитика", salary: 95000, hireDate: "2022-02-28" },
      { name: "Морозов Дмитрий", position: "Разработчик", department: "IT", salary: 110000, hireDate: "2022-07-01" },
      { name: "Васильева Ольга", position: "Менеджер проектов", department: "Управление", salary: 130000, hireDate: "2021-04-15" }
    ]);
  }

  const [productsCount] = await db.select({ count: count() }).from(products);
  
  if (productsCount.count === 0) {
    console.log("Seeding products...");
    await db.insert(products).values([
      { name: "Ноутбук Dell XPS", category: "Электроника", price: 89999.99, stock: 15, supplier: "Dell Inc." },
      { name: "Смартфон iPhone 14", category: "Электроника", price: 79999.00, stock: 25, supplier: "Apple Inc." },
      { name: "Клавиатура механическая", category: "Аксессуары", price: 5499.00, stock: 50, supplier: "Logitech" },
      { name: "Мышь беспроводная", category: "Аксессуары", price: 2199.00, stock: 100, supplier: "Logitech" },
      { name: "Монитор Samsung 27", category: "Электроника", price: 24999.00, stock: 20, supplier: "Samsung" },
      { name: "Наушники Sony WH-1000XM5", category: "Аксессуары", price: 29999.00, stock: 30, supplier: "Sony" },
      { name: "Планшет iPad Air", category: "Электроника", price: 54999.00, stock: 18, supplier: "Apple Inc." },
      { name: "Веб-камера Logitech", category: "Аксессуары", price: 7999.00, stock: 40, supplier: "Logitech" }
    ]);
  }

  const [salesCount] = await db.select({ count: count() }).from(sales);
  
  if (salesCount.count === 0) {
    console.log("Seeding sales...");
    await db.insert(sales).values([
      { productId: 1, quantity: 2, saleDate: "2024-01-15", customerName: "ООО Техно", totalAmount: 179999.98 },
      { productId: 2, quantity: 5, saleDate: "2024-01-20", customerName: "ИП Смирнов", totalAmount: 399995.00 },
      { productId: 3, quantity: 10, saleDate: "2024-02-05", customerName: "ООО Офис Плюс", totalAmount: 54990.00 },
      { productId: 4, quantity: 15, saleDate: "2024-02-10", customerName: "ООО Офис Плюс", totalAmount: 32985.00 },
      { productId: 5, quantity: 3, saleDate: "2024-02-18", customerName: "ИП Петров", totalAmount: 74997.00 },
      { productId: 6, quantity: 7, saleDate: "2024-03-01", customerName: "ООО Музыка", totalAmount: 209993.00 },
      { productId: 1, quantity: 1, saleDate: "2024-03-12", customerName: "ИП Иванов", totalAmount: 89999.99 },
      { productId: 7, quantity: 4, saleDate: "2024-03-25", customerName: "ООО Образование", totalAmount: 219996.00 }
    ]);
  }

  console.log("Database seeded successfully!");
  await pool.end();
}

seed().catch(console.error);
