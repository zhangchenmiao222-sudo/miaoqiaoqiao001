/**
 * Excel 导入服务
 * - generateTemplate: 生成带分类/位置预填的模板文件
 * - parseAndValidate: 解析并校验上传的 Excel
 * - importRows: 按区域分批写库，跳过重复项
 */
import ExcelJS from 'exceljs';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db/connection.js';
import type { RowDataPacket } from 'mysql2';

// ---- 类型 ------------------------------------------------------------

export interface CategoryRow { id: string; name: string; parent_id: string | null; level: number }
export interface LocationRow  { id: string; name: string; parent_id: string | null; level: number; fullPath?: string }

export interface ParsedItemRow {
  rowIndex: number;           // Excel 行号（从 2 开始）
  name: string;
  aliases: string[];          // 逗号分隔后拆分
  category_id: string;
  location_id: string | null;
  status: string;
  dog_id: string | null;
  expiry_date: string | null;
  photo_url: string | null;
  notes: string | null;
  quantity: number;
  unit: string;
}

export interface RowError {
  row: number;
  name: string;
  reason: string;
}

export interface ImportOptions {
  locationId?: string;        // 覆盖 Excel 中的位置（按区域导入）
  skipDuplicates?: boolean;   // 默认 true
  createdBy: string;          // 操作人 user id
}

export interface ImportResult {
  success: number;
  skipped: number;
  failed: number;
  errors: RowError[];
}

// ---- 常量 ------------------------------------------------------------

const HEADERS = [
  { key: 'name',        header: '名称*',          width: 24 },
  { key: 'aliases',     header: '别名（逗号分隔）', width: 28 },
  { key: 'category',    header: '分类名称*',        width: 20 },
  { key: 'location',    header: '位置路径',          width: 30 },
  { key: 'status',      header: '状态',              width: 14 },
  { key: 'quantity',    header: '数量',              width: 10 },
  { key: 'unit',        header: '单位',              width: 10 },
  { key: 'dog_id',      header: '关联犬只编号',      width: 18 },
  { key: 'expiry_date', header: '有效期(YYYY-MM-DD)', width: 18 },
  { key: 'photo_url',   header: '照片URL',           width: 36 },
  { key: 'notes',       header: '备注',              width: 30 },
] as const;

const VALID_STATUSES = ['in_stock', 'in_use', 'transferred', 'expired', 'scrapped'];
const STATUS_LABELS: Record<string, string> = {
  in_stock:    '在库',
  in_use:      '使用中',
  transferred: '已转移',
  expired:     '已过期',
  scrapped:    '已报废',
};

// ---- 辅助 ------------------------------------------------------------

/** 构建 id→fullPath 的位置路径表 */
function buildLocationPaths(locations: LocationRow[]): Map<string, string> {
  const map = new Map<string, LocationRow>(locations.map(l => [l.id, l]));
  const pathMap = new Map<string, string>();

  function getPath(id: string): string {
    if (pathMap.has(id)) return pathMap.get(id)!;
    const loc = map.get(id);
    if (!loc) return '';
    const path = loc.parent_id ? `${getPath(loc.parent_id)} > ${loc.name}` : loc.name;
    pathMap.set(id, path);
    return path;
  }

  locations.forEach(l => getPath(l.id));
  return pathMap;
}

// ---- 主服务 ----------------------------------------------------------

export const ExcelImportService = {

  // ==================================================================
  // 1. 生成模板
  // ==================================================================
  async generateTemplate(): Promise<Buffer> {
    // 从数据库拉取最新分类和位置
    const [categories] = await pool.query<RowDataPacket[]>(
      'SELECT id, name, parent_id, level FROM categories ORDER BY level, sort_order, name'
    );
    const [locations] = await pool.query<RowDataPacket[]>(
      'SELECT id, name, parent_id, level FROM locations ORDER BY level, sort_order, name'
    );

    const cats = categories as CategoryRow[];
    const locs = locations as LocationRow[];
    const locPaths = buildLocationPaths(locs);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'SmartAssetLocator';
    wb.created = new Date();

    // ---- Sheet 1: 物品数据 -----------------------------------------
    const ws = wb.addWorksheet('物品数据', { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = HEADERS.map(h => ({ key: h.key, header: h.header, width: h.width }));

    // 表头样式
    const headerRow = ws.getRow(1);
    headerRow.eachCell(cell => {
      cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F6FEB' } };
      cell.font   = { color: { argb: 'FFFFFFFF' }, bold: true };
      cell.border = { bottom: { style: 'medium' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    headerRow.height = 22;

    // 示例行
    ws.addRow({
      name:        '示例物品-请删除此行',
      aliases:     '示例,sample',
      category:    cats[0]?.name ?? '试剂耗材',
      location:    locPaths.get(locs.find(l => l.level === 3)?.id ?? '') ?? '区域A > 房间1 > 货架1',
      status:      'in_stock',
      quantity:    1,
      unit:        '个',
      dog_id:      '',
      expiry_date: '2026-12-31',
      photo_url:   '',
      notes:       '备注信息',
    });
    // 示例行灰色提示
    ws.getRow(2).eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EAF0' } };
      cell.font = { color: { argb: 'FF999999' }, italic: true };
    });

    // 状态列数据验证（下拉框，从 B3 往下）
    const statusColLetter = 'E';
    for (let r = 3; r <= 2000; r++) {
      ws.getCell(`${statusColLetter}${r}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${VALID_STATUSES.join(',')}"`],
        showErrorMessage: true,
        error: '请从下拉列表中选择状态值',
      };
    }

    // ---- Sheet 2: 分类参考 -----------------------------------------
    const wsCat = wb.addWorksheet('分类参考');
    wsCat.columns = [
      { header: '分类名称（填入模板时使用）', key: 'name', width: 28 },
      { header: '分类ID', key: 'id', width: 38 },
      { header: '层级', key: 'level', width: 8 },
      { header: '父分类', key: 'parent', width: 20 },
    ];
    const catHeaderRow = wsCat.getRow(1);
    catHeaderRow.font = { bold: true };
    catHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDEF7E4' } };

    const catMap = new Map(cats.map(c => [c.id, c.name]));
    cats.forEach(cat => {
      wsCat.addRow({
        name:   cat.name,
        id:     cat.id,
        level:  cat.level,
        parent: cat.parent_id ? catMap.get(cat.parent_id) ?? '' : '（一级）',
      });
    });

    // ---- Sheet 3: 位置参考 -----------------------------------------
    const wsLoc = wb.addWorksheet('位置参考');
    wsLoc.columns = [
      { header: '位置路径（填入模板时使用完整路径）', key: 'path',  width: 40 },
      { header: '位置ID',                            key: 'id',    width: 38 },
      { header: '层级 (1=区域 2=房间 3=具体位置)',    key: 'level', width: 28 },
    ];
    const locHeaderRow = wsLoc.getRow(1);
    locHeaderRow.font = { bold: true };
    locHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };

    locs.forEach(loc => {
      wsLoc.addRow({ path: locPaths.get(loc.id) ?? loc.name, id: loc.id, level: loc.level });
    });

    // ---- Sheet 4: 填写说明 -----------------------------------------
    const wsHelp = wb.addWorksheet('填写说明');
    wsHelp.getColumn(1).width = 90;
    const instructions = [
      ['📋 物品导入模板填写说明'],
      [''],
      ['必填字段（标 * 号）:'],
      ['  • 名称*       — 物品名称，不能为空'],
      ['  • 分类名称*   — 必须与「分类参考」表中的名称完全一致'],
      [''],
      ['选填字段:'],
      ['  • 别名        — 多个别名用英文逗号分隔，例如: 别名1,别名2'],
      ['  • 位置路径    — 填写「位置参考」表中的完整路径，例如: 实验楼 > 检测室 > 试剂柜A'],
      ['  • 状态        — 从下拉框选择: in_stock(在库)/in_use(使用中)/transferred(已转移)/expired(已过期)/scrapped(已报废)'],
      ['  • 数量        — 默认为 1'],
      ['  • 单位        — 默认为 个'],
      ['  • 有效期      — 格式必须为 YYYY-MM-DD，例如: 2026-12-31'],
      [''],
      ['注意事项:'],
      ['  • 请勿修改第一行表头'],
      ['  • 第2行为示例行，导入前请删除'],
      ['  • 系统会自动跳过与已有物品（同名称+同位置）重复的行'],
      ['  • 导入结果会返回成功/跳过/失败的详细信息'],
    ];
    instructions.forEach(([text], i) => {
      const cell = wsHelp.getCell(`A${i + 1}`);
      cell.value = text ?? '';
      if (i === 0) { cell.font = { bold: true, size: 14 }; }
      else if (text?.endsWith(':')) { cell.font = { bold: true }; }
    });

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  },

  // ==================================================================
  // 2. 解析并校验上传的 Excel
  // ==================================================================
  async parseAndValidate(buffer: Buffer): Promise<{
    valid: ParsedItemRow[];
    errors: RowError[];
  }> {
    // 从库中加载分类和位置用于名称→ID 映射
    const [categories] = await pool.query<RowDataPacket[]>(
      'SELECT id, name FROM categories'
    );
    const [locations] = await pool.query<RowDataPacket[]>(
      'SELECT id, name, parent_id, level FROM locations'
    );

    const cats = categories as { id: string; name: string }[];
    const locs = locations as LocationRow[];
    const locPaths = buildLocationPaths(locs);

    // name → id 映射（不区分大小写）
    const catByName = new Map(cats.map(c => [c.name.toLowerCase().trim(), c.id]));
    const locByPath = new Map<string, string>();
    locPaths.forEach((path, id) => locByPath.set(path.toLowerCase().trim(), id));

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);

    const ws = wb.getWorksheet('物品数据') ?? wb.worksheets[0];
    if (!ws) {
      return { valid: [], errors: [{ row: 0, name: '', reason: '未找到工作表「物品数据」' }] };
    }

    const valid: ParsedItemRow[] = [];
    const errors: RowError[] = [];

    ws.eachRow((row, rowIndex) => {
      if (rowIndex === 1) return; // 跳过表头

      const cell = (col: number) => {
        const v = row.getCell(col).value;
        if (v === null || v === undefined) return '';
        if (typeof v === 'object' && 'text' in (v as object)) return String((v as { text: unknown }).text);
        return String(v).trim();
      };

      const name        = cell(1);
      const aliasRaw    = cell(2);
      const categoryRaw = cell(3);
      const locationRaw = cell(4);
      const statusRaw   = cell(5);
      const quantityRaw = cell(6);
      const unitRaw     = cell(7);
      const dog_id      = cell(8) || null;
      const expiryRaw   = cell(9);
      const photo_url   = cell(10) || null;
      const notes       = cell(11) || null;

      // 跳过空行和示例行
      if (!name || name.includes('示例物品')) return;

      const rowErrors: string[] = [];

      // --- 必填校验 ---
      if (!name) rowErrors.push('名称不能为空');

      // --- 分类校验 ---
      const category_id = catByName.get(categoryRaw.toLowerCase().trim()) ?? null;
      if (!category_id) {
        rowErrors.push(`分类「${categoryRaw}」不存在，请参考「分类参考」表`);
      }

      // --- 位置校验（选填）---
      let location_id: string | null = null;
      if (locationRaw) {
        location_id = locByPath.get(locationRaw.toLowerCase().trim()) ?? null;
        if (!location_id) {
          rowErrors.push(`位置「${locationRaw}」不存在，请参考「位置参考」表中的完整路径`);
        }
      }

      // --- 状态校验 ---
      const status = statusRaw || 'in_stock';
      if (!VALID_STATUSES.includes(status)) {
        rowErrors.push(`状态「${status}」无效，可选值: ${VALID_STATUSES.join('/')}`);
      }

      // --- 数量校验 ---
      const quantity = quantityRaw ? Number(quantityRaw) : 1;
      if (isNaN(quantity) || quantity < 0) {
        rowErrors.push(`数量「${quantityRaw}」必须为非负数字`);
      }

      // --- 有效期格式校验 ---
      let expiry_date: string | null = null;
      if (expiryRaw) {
        const dateMatch = /^\d{4}-\d{2}-\d{2}$/.test(expiryRaw);
        if (!dateMatch) {
          rowErrors.push(`有效期「${expiryRaw}」格式错误，请使用 YYYY-MM-DD`);
        } else {
          expiry_date = expiryRaw;
        }
      }

      if (rowErrors.length > 0) {
        errors.push({ row: rowIndex, name, reason: rowErrors.join('；') });
        return;
      }

      valid.push({
        rowIndex,
        name,
        aliases: aliasRaw ? aliasRaw.split(',').map(s => s.trim()).filter(Boolean) : [],
        category_id: category_id!,
        location_id,
        status,
        dog_id,
        expiry_date,
        photo_url,
        notes,
        quantity,
        unit: unitRaw || '个',
      });
    });

    return { valid, errors };
  },

  // ==================================================================
  // 3. 批量导入（支持按区域覆盖位置、跳过重复项）
  // ==================================================================
  async importRows(rows: ParsedItemRow[], options: ImportOptions): Promise<ImportResult> {
    const { locationId, skipDuplicates = true, createdBy } = options;
    let success = 0;
    let skipped = 0;
    const errors: RowError[] = [];

    // 分批处理，每批 50 条，减少单次事务大小
    const BATCH = 50;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);

      for (const row of batch) {
        const effectiveLocationId = locationId ?? row.location_id;

        try {
          // 重复检查：同名称 + 同位置（位置可为 NULL）
          if (skipDuplicates) {
            const dupSql = effectiveLocationId
              ? 'SELECT id FROM items WHERE name = ? AND location_id = ? LIMIT 1'
              : 'SELECT id FROM items WHERE name = ? AND location_id IS NULL LIMIT 1';
            const dupParams = effectiveLocationId ? [row.name, effectiveLocationId] : [row.name];
            const [dup] = await pool.query<RowDataPacket[]>(dupSql, dupParams);
            if (dup.length > 0) {
              skipped++;
              continue;
            }
          }

          const itemId = uuidv4();
          await pool.query(
            `INSERT INTO items
               (id, name, aliases, category_id, location_id, status,
                dog_id, expiry_date, photo_url, notes, quantity, unit, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              itemId, row.name,
              row.aliases.length ? JSON.stringify(row.aliases) : null,
              row.category_id, effectiveLocationId, row.status,
              row.dog_id, row.expiry_date, row.photo_url,
              row.notes, row.quantity, row.unit, createdBy,
            ]
          );

          // 写入别名表
          if (row.aliases.length) {
            const aliasRows = row.aliases.map(a => [uuidv4(), itemId, a, 'colloquial']);
            await pool.query(
              'INSERT INTO item_aliases (id, item_id, alias, alias_type) VALUES ?',
              [aliasRows]
            );
          }

          success++;
        } catch (err) {
          console.error(`[Import] 第 ${row.rowIndex} 行写库失败:`, err);
          errors.push({ row: row.rowIndex, name: row.name, reason: '数据库写入失败' });
        }
      }
    }

    return { success, skipped, failed: errors.length, errors };
  },
};

export { STATUS_LABELS };
