import { S } from '../store/state.js';
import { ADMIN_NAME, BOSS_NAME } from '../config.js';
import { dateStr, normDate, fmt, getKtvMissingWorkdays, fmtMissDay } from '../utils/date.js';
import { bcnHTML } from '../main.js';
import { emptyH } from '../utils/ui.js';

export function renderAllMissingWorkdays(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const ktvNames = S.ktvList
    .filter(k => k.name !== ADMIN_NAME && k.name !== BOSS_NAME && k.ghiChu?.toLowerCase() !== 'test')
    .map(k => k.name);

  const ktvMissList = ktvNames
    .map(name => ({ name, missing: getKtvMissingWorkdays(name) }))
    .filter(k => k.missing.length > 0);

  if (!ktvMissList.length) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  container.innerHTML = `<div class="card" style="border:1.5px solid #fed7aa;background:#fff7ed">
    <div class="ct" style="color:#c2410c"><span class="ct-dot" style="background:#ea580c"></span>Cảnh báo truy bài — Tuần này</div>
    ${ktvMissList.map(k => `<div class="info-row" style="padding:6px 0;border-bottom:1px dashed #fed7aa">
      <div style="font-weight:700;color:#9a3412;font-size:13px">${k.name}</div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;width:60%">
        ${k.missing.map(d => `<span class="tag t0">${fmtMissDay(d)}</span>`).join('')}
      </div>
    </div>`).join('')}
  </div>`;
}

export function refreshAdminDash() {
  const now = new Date();
  const mStr = now.getFullYear() + '-' + (now.getMonth() + 1).toString().padStart(2, '0');
  const all = S.records;
  const mRecs = all.filter(r => normDate(r.ngay).startsWith(mStr));

  let totalCV = 0, doneCV = 0, pendCV = 0;
  all.forEach(r => {
    (r.chiTiet || []).forEach(c => {
      totalCV++;
      if (c.ketQua === 'Hoàn thành') doneCV++;
      else pendCV++;
    });
  });

  const adTotal = document.getElementById('adTotal');
  const adDone = document.getElementById('adDone');
  const adPending = document.getElementById('adPending');
  const adTitle = document.getElementById('adTitle');
  const adSub = document.getElementById('adSub');

  if (adTotal) adTotal.textContent = all.length;
  if (adDone) adDone.textContent = doneCV;
  if (adPending) adPending.textContent = pendCV;
  if (adTitle) adTitle.textContent = 'Tổng quan — ' + fmt(now);
  if (adSub) adSub.textContent = all.length + ' BCN tổng cộng · ' + mRecs.length + ' tháng này';

  renderAllMissingWorkdays('adMissBanner');

  const ktvCounts = {};
  mRecs.forEach(r => {
    ktvCounts[r.ktv] = (ktvCounts[r.ktv] || 0) + 1;
  });

  const max = Math.max(...Object.values(ktvCounts), 1);
  const ktvChart = document.getElementById('ktvChart');
  if (ktvChart) {
    ktvChart.innerHTML = Object.entries(ktvCounts).length
      ? Object.entries(ktvCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([name, cnt]) => `<div class="bar-row">
            <div class="bar-label" title="${name}">${name}</div>
            <div class="bar-track">
              <div class="bar-fill" style="width:${Math.round((cnt / max) * 100)}%"></div>
            </div>
            <div class="bar-val">${cnt}</div>
          </div>`)
          .join('')
      : '<div style="color:var(--t3);font-size:13px;text-align:center;padding:12px">Chưa có dữ liệu tháng này</div>';
  }

  const todayRecs = all.filter(r => normDate(r.ngay) === dateStr(now));
  const adTodayList = document.getElementById('adTodayList');
  if (adTodayList) {
    adTodayList.innerHTML = todayRecs.length
      ? todayRecs.map(r => bcnHTML(r, 'admin-detail', true)).join('')
      : emptyH('Không có hoạt động hôm nay', '');
  }
}
