/** SheetLedger – Apps Script 后端（完整版，可直接覆盖） */

// 可留空：若该脚本“绑定”在目标表格上，留空即可用 getActive()
// 若是独立项目，请把下行填写为你的表格 ID（/d/ 与 /edit 之间那串）
const SPREADSHEET_ID = '';

/** 统一获取 Spreadsheet 对象 */
function _ss() {
  return SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActive();
}

/** WebApp 入口：渲染 index.html */
function doGet() {
  return HtmlService
    .createTemplateFromFile('index')
    .evaluate()
    .setTitle('SheetLedger')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** 在 HTML 里用 <?= include('partial') ?> 引入片段 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * 读取配置：角色/币种/分类映射
 * 需要的工作表：
 * - Config_Roles: [role_id, role_name, email?]
 * - Config_Currency: [currency_code]
 * - Config_Categories: [category, subcategory]
 */
function getConfig() {
  const ss = _ss();

  const rolesSheet = ss.getSheetByName('Config_Roles');
  const currencySheet = ss.getSheetByName('Config_Currency');
  const catSheet = ss.getSheetByName('Config_Categories');

  if (!rolesSheet || !currencySheet || !catSheet) {
    throw new Error('缺少配置表：请确认存在 Config_Roles / Config_Currency / Config_Categories');
  }

  // Roles
  const rolesValues = rolesSheet.getDataRange().getValues();
  const roles = [];
  for (let i = 1; i < rolesValues.length; i++) {
    const [id, name, email] = rolesValues[i];
    if (name) roles.push({ id: String(id || ''), name: String(name), email: String(email || '') });
  }

  // Currencies
  const curValues = currencySheet.getDataRange().getValues();
  const currencies = [];
  for (let i = 1; i < curValues.length; i++) {
    const [code] = curValues[i];
    if (code) currencies.push(String(code));
  }

  // Categories mapping
  const catValues = catSheet.getDataRange().getValues();
  const mapping = {};
  for (let i = 1; i < catValues.length; i++) {
    const [cat, sub] = catValues[i];
    if (!cat || !sub) continue;
    if (!mapping[cat]) mapping[cat] = [];
    mapping[cat].push(String(sub));
  }

  return { roles, currencies, categories: mapping };
}

/**
 * 写一笔交易到 Transactions
 * 仅保留 role 一列作为“记账人”标识，不再写 created_by
 * 需要的工作表：
 * - Transactions: [timestamp, role, currency, category, subcategory, amount, note]
 */
function recordTxn(payload) {
  if (!payload) throw new Error('空请求');
  let { role, currency, category, subcategory, amount, note } = payload;

  const conf = getConfig();

  // 基本校验
  if (!role) throw new Error('缺少 role');
  if (!currency) throw new Error('缺少 currency');
  if (!category) throw new Error('缺少 category');
  if (!subcategory) throw new Error('缺少 subcategory');
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) throw new Error('amount 非法');

  // 枚举校验
  const roleOk = conf.roles.some(r => r.name === role || r.id === role);
  if (!roleOk) throw new Error('role 不在配置中');
  if (!conf.currencies.includes(currency)) throw new Error('currency 不在配置中');
  if (!conf.categories[category]) throw new Error('category 不在配置中');
  if (!conf.categories[category].includes(subcategory)) throw new Error('subcategory 不在配置中');

  const ss = _ss();
  const sheet = ss.getSheetByName('Transactions');
  if (!sheet) throw new Error('缺少 Transactions 表');

  const row = [new Date(), role, currency, category, subcategory, Number(amt), note || ''];
  sheet.appendRow(row);

  return { ok: true, row: sheet.getLastRow() };
}

/** 快速造一条示例数据（可在 Apps Script 里手动运行） */
function seedOne() {
  return recordTxn({
    role: 'Will',
    currency: 'CNY',
    category: '生活',
    subcategory: '餐饮',
    amount: 12.5,
    note: '测试'
  });
}
