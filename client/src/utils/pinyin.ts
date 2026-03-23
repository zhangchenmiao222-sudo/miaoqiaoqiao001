import { pinyin } from 'pinyin-pro';

/**
 * 汉字转全拼（空格分隔）
 * 例：「试剂盒」→ "shi ji he"
 */
export function toFullPinyin(text: string): string {
  return pinyin(text, { toneType: 'none', separator: ' ' }).toLowerCase();
}

/**
 * 汉字转首字母缩写
 * 例：「试剂盒」→ "sjh"
 */
export function toInitials(text: string): string {
  return pinyin(text, { pattern: 'first', separator: '' }).toLowerCase();
}

/**
 * 判断搜索词是否匹配目标文本（支持原文、全拼、首字母）
 */
export function pinyinMatch(target: string, keyword: string): boolean {
  const k = keyword.toLowerCase().trim();
  if (!k) return true;
  if (target.toLowerCase().includes(k)) return true;
  if (toFullPinyin(target).includes(k)) return true;
  if (toInitials(target).includes(k)) return true;
  return false;
}
