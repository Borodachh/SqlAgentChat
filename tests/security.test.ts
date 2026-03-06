import test from "node:test";
import assert from "node:assert/strict";
import { isSafeReadOnlySQL, sanitizeSpreadsheetValue, stripSqlComments } from "../server/security";

test("allows simple select queries", () => {
  assert.deepEqual(isSafeReadOnlySQL("SELECT * FROM employees"), { safe: true });
});

test("blocks multi-statement SQL", () => {
  const result = isSafeReadOnlySQL("SELECT * FROM employees; DELETE FROM employees");
  assert.equal(result.safe, false);
  assert.match(result.explanation ?? "", /один SELECT-запрос/i);
});

test("blocks data-modifying CTEs that start with WITH", () => {
  const result = isSafeReadOnlySQL("WITH deleted AS (DELETE FROM users RETURNING *) SELECT * FROM deleted");
  assert.equal(result.safe, false);
  assert.match(result.explanation ?? "", /DELETE запрещена/i);
});

test("allows semicolons inside string literals", () => {
  assert.deepEqual(isSafeReadOnlySQL("SELECT ';' AS separator"), { safe: true });
});

test("allows blocked keywords inside string literals", () => {
  assert.deepEqual(isSafeReadOnlySQL("SELECT 'DROP TABLE users' AS example"), { safe: true });
});

test("strips SQL comments before validation", () => {
  assert.equal(stripSqlComments("SELECT 1 -- comment"), "SELECT 1");
});

test("preserves comment markers inside string literals", () => {
  assert.equal(stripSqlComments("SELECT '--not comment' AS value"), "SELECT '--not comment' AS value");
});

test("sanitizes spreadsheet formulas", () => {
  assert.equal(sanitizeSpreadsheetValue("=2+2"), "'=2+2");
  assert.equal(sanitizeSpreadsheetValue("@SUM(A1:A2)"), "'@SUM(A1:A2)");
  assert.equal(sanitizeSpreadsheetValue("-10+cmd"), "'-10+cmd");
  assert.equal(sanitizeSpreadsheetValue(" =2+2"), "' =2+2");
  assert.equal(sanitizeSpreadsheetValue("\n=2+2"), "'\n=2+2");
});

test("preserves safe primitive values for spreadsheets", () => {
  assert.equal(sanitizeSpreadsheetValue("plain text"), "plain text");
  assert.equal(sanitizeSpreadsheetValue(" plain text"), " plain text");
  assert.equal(sanitizeSpreadsheetValue(42), 42);
  assert.equal(sanitizeSpreadsheetValue(true), true);
  assert.equal(sanitizeSpreadsheetValue(null), "");
});
