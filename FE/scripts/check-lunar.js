import assert from 'node:assert/strict';
import { formatVietnameseLunarDate } from '../src/lunarDate.js';

const knownDates = new Map([
  ['2023-01-22', '(Tức ngày 1 tháng 1 năm Quý Mão)'],
  ['2024-02-10', '(Tức ngày 1 tháng 1 năm Giáp Thìn)'],
  ['2025-01-29', '(Tức ngày 1 tháng 1 năm Ất Tỵ)'],
  ['2026-01-03', '(Tức ngày 15 tháng 11 năm Ất Tỵ)'],
  ['2026-02-17', '(Tức ngày 1 tháng 1 năm Bính Ngọ)']
]);

for (const [solarDate, expectedLunarDate] of knownDates) {
  assert.equal(formatVietnameseLunarDate(solarDate), expectedLunarDate, `Sai ngày âm lịch cho ${solarDate}`);
}

assert.equal(formatVietnameseLunarDate(''), '');
assert.equal(formatVietnameseLunarDate('2026-02-30'), '');
console.log(`Lunar calendar check passed (${knownDates.size} known dates).`);
