const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

// Load Apps Script code
const code = fs.readFileSync(path.join(__dirname, '..', 'Code.gs'), 'utf8');
eval(code);

class MockSheet {
  constructor(values = []) {
    this.values = values;
  }
  getDataRange() {
    return { getValues: () => this.values };
  }
  appendRow(row) {
    this.values.push(row);
  }
  getLastRow() {
    return this.values.length;
  }
}

class MockSpreadsheet {
  constructor(sheets) {
    this.sheets = sheets;
  }
  getSheetByName(name) {
    return this.sheets[name];
  }
}

function setupEnv() {
  const sheets = {
    Config_Roles: new MockSheet([
      ['id', 'name', 'email'],
      ['1', 'Alice', 'alice@example.com'],
      ['2', 'Bob', 'bob@example.com']
    ]),
    Config_Currency: new MockSheet([
      ['code'],
      ['USD'],
      ['CNY']
    ]),
    Config_Categories: new MockSheet([
      ['cat', 'sub'],
      ['Food', 'Dining'],
      ['Food', 'Snack']
    ]),
    Transactions: new MockSheet([
      ['timestamp', 'role', 'currency', 'category', 'subcategory', 'amount', 'note']
    ])
  };
  global.SpreadsheetApp = {
    getActive: () => new MockSpreadsheet(sheets)
  };
  return sheets;
}

test('getConfig parses sheets', () => {
  setupEnv();
  const conf = getConfig();
  assert.deepStrictEqual(conf.roles[0], { id: '1', name: 'Alice', email: 'alice@example.com' });
  assert.deepStrictEqual(conf.currencies, ['USD', 'CNY']);
  assert.deepStrictEqual(conf.categories, { Food: ['Dining', 'Snack'] });
});

test('recordTxn appends row', () => {
  const sheets = setupEnv();
  const res = recordTxn({
    role: 'Alice',
    currency: 'USD',
    category: 'Food',
    subcategory: 'Dining',
    amount: 10,
    note: 'Test'
  });
  assert.ok(res.ok);
  assert.strictEqual(sheets.Transactions.getLastRow(), 2);
});

test('recordTxn requires role', () => {
  setupEnv();
  assert.throws(() => recordTxn({
    currency: 'USD',
    category: 'Food',
    subcategory: 'Dining',
    amount: 5
  }), /缺少 role/);
});
