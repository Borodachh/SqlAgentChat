function maskSqlLiterals(query: string): string {
  let result = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = 0; i < query.length; i++) {
    const char = query[i];
    const next = query[i + 1];

    if (inSingleQuote) {
      if (char === "'" && next === "'") {
        result += "  ";
        i++;
        continue;
      }

      result += " ";
      if (char === "'") {
        inSingleQuote = false;
      }
      continue;
    }

    if (inDoubleQuote) {
      if (char === '"' && next === '"') {
        result += "  ";
        i++;
        continue;
      }

      result += " ";
      if (char === '"') {
        inDoubleQuote = false;
      }
      continue;
    }

    if (char === "'") {
      inSingleQuote = true;
      result += " ";
      continue;
    }

    if (char === '"') {
      inDoubleQuote = true;
      result += " ";
      continue;
    }

    result += char;
  }

  return result;
}

export function stripSqlComments(query: string): string {
  let result = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = 0; i < query.length; i++) {
    const char = query[i];
    const next = query[i + 1];

    if (inSingleQuote) {
      result += char;
      if (char === "'" && next === "'") {
        result += next;
        i++;
        continue;
      }
      if (char === "'") {
        inSingleQuote = false;
      }
      continue;
    }

    if (inDoubleQuote) {
      result += char;
      if (char === '"' && next === '"') {
        result += next;
        i++;
        continue;
      }
      if (char === '"') {
        inDoubleQuote = false;
      }
      continue;
    }

    if (char === "'") {
      inSingleQuote = true;
      result += char;
      continue;
    }

    if (char === '"') {
      inDoubleQuote = true;
      result += char;
      continue;
    }

    if (char === "-" && next === "-") {
      i += 2;
      while (i < query.length && query[i] !== "\n") {
        i++;
      }
      if (i < query.length) {
        result += query[i];
      }
      continue;
    }

    if (char === "/" && next === "*") {
      i += 2;
      while (i < query.length - 1 && !(query[i] === "*" && query[i + 1] === "/")) {
        i++;
      }
      i++;
      continue;
    }

    result += char;
  }

  return result.trim();
}

function splitSqlStatements(query: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = 0; i < query.length; i++) {
    const char = query[i];
    const next = query[i + 1];

    if (inSingleQuote) {
      current += char;
      if (char === "'" && next === "'") {
        current += next;
        i++;
        continue;
      }
      if (char === "'") {
        inSingleQuote = false;
      }
      continue;
    }

    if (inDoubleQuote) {
      current += char;
      if (char === '"' && next === '"') {
        current += next;
        i++;
        continue;
      }
      if (char === '"') {
        inDoubleQuote = false;
      }
      continue;
    }

    if (char === "'") {
      inSingleQuote = true;
      current += char;
      continue;
    }

    if (char === '"') {
      inDoubleQuote = true;
      current += char;
      continue;
    }

    if (char === ";") {
      const statement = current.trim();
      if (statement) {
        statements.push(statement);
      }
      current = "";
      continue;
    }

    current += char;
  }

  const tail = current.trim();
  if (tail) {
    statements.push(tail);
  }

  return statements;
}

export function isSafeReadOnlySQL(query: string): { safe: boolean; explanation?: string } {
  const cleanQuery = stripSqlComments(query);
  const statements = splitSqlStatements(cleanQuery);

  if (statements.length !== 1) {
    return {
      safe: false,
      explanation: "Разрешен только один SELECT-запрос без дополнительных команд."
    };
  }

  const statement = statements[0];
  const normalizedStatement = maskSqlLiterals(statement).toUpperCase();
  if (!normalizedStatement.startsWith("SELECT") && !normalizedStatement.startsWith("WITH")) {
    return {
      safe: false,
      explanation: "Я могу выполнять только SELECT-запросы для чтения данных."
    };
  }

  const dangerousPatterns: Array<[RegExp, string]> = [
    [/\bINSERT\b/, "Команда INSERT запрещена. Я не могу добавлять новые записи в таблицы."],
    [/\bUPDATE\b/, "Команда UPDATE запрещена. Я не могу изменять существующие записи."],
    [/\bDELETE\b/, "Команда DELETE запрещена. Я не могу удалять записи из таблиц."],
    [/\bDROP\b/, "Команда DROP запрещена. Я не могу удалять таблицы или базы данных."],
    [/\bALTER\b/, "Команда ALTER запрещена. Я не могу изменять структуру таблиц."],
    [/\bCREATE\b/, "Команда CREATE запрещена. Я не могу создавать новые таблицы или объекты."],
    [/\bTRUNCATE\b/, "Команда TRUNCATE запрещена. Я не могу очищать таблицы."],
    [/\bEXEC(?:UTE)?\b/, "Выполнение процедур запрещено."],
    [/\bMERGE\b/, "Команда MERGE запрещена. Разрешены только SELECT-запросы."],
    [/\bCOPY\b/, "Команда COPY запрещена. Разрешены только SELECT-запросы."],
  ];

  for (const [pattern, explanation] of dangerousPatterns) {
    if (pattern.test(normalizedStatement)) {
      return { safe: false, explanation };
    }
  }

  return { safe: true };
}

export function sanitizeSpreadsheetValue(value: unknown): string | number | boolean {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  const stringValue = String(value);
  if (/^(?:[=+\-@]|[\t\r\n]|\s+[=+\-@])/.test(stringValue)) {
    return `'${stringValue}`;
  }

  return stringValue;
}
