import { S } from '../store/state.js';

export function dateStr(d) {
  return d.getFullYear() + '-' + (d.getMonth() + 1).toString().padStart(2, '0') + '-' + d.getDate().toString().padStart(2, '0');
}

export function fmt(d) {
  return d.getDate().toString().padStart(2, '0') + '/' + (d.getMonth() + 1).toString().padStart(2, '0') + '/' + d.getFullYear();
}

export function normDate(s) {
  if (!s) return '';
  const str = String(s).trim();
  if (str.includes('T')) return str.slice(0, 10);
  if (str.includes('/')) {
    const p = str.split('/');
    if (p[2]?.length === 4) return p[2] + '-' + p[0].padStart(2, '0') + '-' + p[1].padStart(2, '0');
    return p[0] + '-' + (p[1] || '').padStart(2, '0') + '-' + (p[2] || '').padStart(2, '0');
  }
  const [y, m, d] = str.split('-');
  return y + '-' + (m || '').padStart(2, '0') + '-' + (d || '').padStart(2, '0');
}

export function fmtStr(s) {
  if (!s) return '';
  const nd = normDate(s);
  if (!nd || nd.length < 10) return String(s);
  const [y, m, d] = nd.split('-');
  return d.padStart(2, '0') + '/' + m.padStart(2, '0') + '/' + y;
}

export function nowTime() {
  const d = new Date();
  return d.getHours() + ':' + d.getMinutes().toString().padStart(2, '0');
}

export function isHoliday(ds) {
  const [y, m, d] = ds.split('-');
  const mmdd = m + '-' + d;
  return S.ngayLe.some(h => {
    const hs = String(h).trim();
    return hs === ds || hs === mmdd;
  });
}

export function getKtvMissingWorkdays(ktvName) {
  const ktv = S.ktvList.find(k => k.name === ktvName);
  if (ktv?.ghiChu?.toLowerCase() === 'test') return [];

  const now = new Date();
  const today = dateStr(now);
  const dow = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1) - 7);

  const doneDates = new Set(S.records.filter(r => r.ktv === ktvName).map(r => normDate(r.ngay)));
  const missing = [];
  const cursor = new Date(monday);
  const closingDate = S.secCfg?.closingDate || '';

  while (dateStr(cursor) <= today) {
    const ds = dateStr(cursor);
    const day = cursor.getDay();
    const isLocked = closingDate && ds <= closingDate;

    if (!isLocked && day !== 0 && day !== 6 && !isHoliday(ds) && !doneDates.has(ds) && ds !== today) {
      missing.push(ds);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return missing;
}

export const VI_DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export function fmtMissDay(ds) {
  if (!ds) return '';
  const d = new Date(ds + 'T00:00:00');
  const idx = d.getDay();
  if (isNaN(idx)) return fmtStr(ds);
  return (VI_DAYS[idx] || '') + ' ' + fmtStr(ds);
}
