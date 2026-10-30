const PI = Math.PI;
const VIETNAM_TIMEZONE = 7;
const HEAVENLY_STEMS = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const EARTHLY_BRANCHES = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];

const integer = Math.floor;

function julianDayFromDate(day, month, year) {
  const a = integer((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  let julianDay = day + integer((153 * m + 2) / 5) + 365 * y + integer(y / 4) - integer(y / 100) + integer(y / 400) - 32045;
  if (julianDay < 2299161) {
    julianDay = day + integer((153 * m + 2) / 5) + 365 * y + integer(y / 4) - 32083;
  }
  return julianDay;
}

function newMoon(k) {
  const t = k / 1236.85;
  const t2 = t * t;
  const t3 = t2 * t;
  const degree = PI / 180;
  let julianDay = 2415020.75933 + 29.53058868 * k + 0.0001178 * t2 - 0.000000155 * t3;
  julianDay += 0.00033 * Math.sin((166.56 + 132.87 * t - 0.009173 * t2) * degree);
  const m = 359.2242 + 29.10535608 * k - 0.0000333 * t2 - 0.00000347 * t3;
  const mPrime = 306.0253 + 385.81691806 * k + 0.0107306 * t2 + 0.00001236 * t3;
  const f = 21.2964 + 390.67050646 * k - 0.0016528 * t2 - 0.00000239 * t3;
  let correction = (0.1734 - 0.000393 * t) * Math.sin(m * degree) + 0.0021 * Math.sin(2 * m * degree);
  correction -= 0.4068 * Math.sin(mPrime * degree) + 0.0161 * Math.sin(2 * mPrime * degree);
  correction -= 0.0004 * Math.sin(3 * mPrime * degree);
  correction += 0.0104 * Math.sin(2 * f * degree) - 0.0051 * Math.sin((m + mPrime) * degree);
  correction -= 0.0074 * Math.sin((m - mPrime) * degree) + 0.0004 * Math.sin((2 * f + m) * degree);
  correction -= 0.0004 * Math.sin((2 * f - m) * degree) + 0.0006 * Math.sin((2 * f + mPrime) * degree);
  correction += 0.0010 * Math.sin((2 * f - mPrime) * degree) + 0.0005 * Math.sin((2 * mPrime + m) * degree);
  const deltaT = t < -11
    ? 0.001 + 0.000839 * t + 0.0002261 * t2 - 0.00000845 * t3 - 0.000000081 * t * t3
    : -0.000278 + 0.000265 * t + 0.000262 * t2;
  return julianDay + correction - deltaT;
}

function newMoonDay(k, timezone) {
  return integer(newMoon(k) + 0.5 + timezone / 24);
}

function sunLongitude(julianDay) {
  const t = (julianDay - 2451545) / 36525;
  const t2 = t * t;
  const degree = PI / 180;
  const m = 357.5291 + 35999.0503 * t - 0.0001559 * t2 - 0.00000048 * t * t2;
  const longitude = 280.46645 + 36000.76983 * t + 0.0003032 * t2;
  const delta = (1.9146 - 0.004817 * t - 0.000014 * t2) * Math.sin(degree * m)
    + (0.019993 - 0.000101 * t) * Math.sin(degree * 2 * m)
    + 0.00029 * Math.sin(degree * 3 * m);
  let result = (longitude + delta) * degree;
  result -= PI * 2 * integer(result / (PI * 2));
  return result;
}

function sunLongitudeSector(dayNumber, timezone) {
  return integer(sunLongitude(dayNumber - 0.5 - timezone / 24) / PI * 6);
}

function lunarMonthEleven(year, timezone) {
  const offset = julianDayFromDate(31, 12, year) - 2415021;
  const k = integer(offset / 29.530588853);
  let monthStart = newMoonDay(k, timezone);
  if (sunLongitudeSector(monthStart, timezone) >= 9) monthStart = newMoonDay(k - 1, timezone);
  return monthStart;
}

function leapMonthOffset(monthEleven, timezone) {
  const k = integer(0.5 + (monthEleven - 2415021.076998695) / 29.530588853);
  let lastSector = 0;
  let index = 1;
  let sector = sunLongitudeSector(newMoonDay(k + index, timezone), timezone);
  do {
    lastSector = sector;
    index += 1;
    sector = sunLongitudeSector(newMoonDay(k + index, timezone), timezone);
  } while (sector !== lastSector && index < 14);
  return index - 1;
}

export function solarToVietnameseLunar(day, month, year) {
  const dayNumber = julianDayFromDate(day, month, year);
  const k = integer((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = newMoonDay(k + 1, VIETNAM_TIMEZONE);
  if (monthStart > dayNumber) monthStart = newMoonDay(k, VIETNAM_TIMEZONE);
  let monthElevenA = lunarMonthEleven(year, VIETNAM_TIMEZONE);
  let monthElevenB = monthElevenA;
  let lunarYear;
  if (monthElevenA >= monthStart) {
    lunarYear = year;
    monthElevenA = lunarMonthEleven(year - 1, VIETNAM_TIMEZONE);
  } else {
    lunarYear = year + 1;
    monthElevenB = lunarMonthEleven(year + 1, VIETNAM_TIMEZONE);
  }
  const lunarDay = dayNumber - monthStart + 1;
  const difference = integer((monthStart - monthElevenA) / 29);
  let lunarMonth = difference + 11;
  let isLeapMonth = false;
  if (monthElevenB - monthElevenA > 365) {
    const leapDifference = leapMonthOffset(monthElevenA, VIETNAM_TIMEZONE);
    if (difference >= leapDifference) {
      lunarMonth = difference + 10;
      if (difference === leapDifference) isLeapMonth = true;
    }
  }
  if (lunarMonth > 12) lunarMonth -= 12;
  if (lunarMonth >= 11 && difference < 4) lunarYear -= 1;
  return { day: lunarDay, month: lunarMonth, year: lunarYear, isLeapMonth };
}

export function formatVietnameseLunarDate(isoDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate || ''));
  if (!match) return '';
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return '';
  const lunar = solarToVietnameseLunar(day, month, year);
  const yearName = `${HEAVENLY_STEMS[(lunar.year + 6) % 10]} ${EARTHLY_BRANCHES[(lunar.year + 8) % 12]}`;
  const leapLabel = lunar.isLeapMonth ? ' nhuận' : '';
  return `(Tức ngày ${lunar.day} tháng ${lunar.month}${leapLabel} năm ${yearName})`;
}
