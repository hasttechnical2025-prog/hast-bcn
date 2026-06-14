import { S } from '../store/state.js';
import { dateStr, normDate, fmt } from '../utils/date.js';
import { renderAllMissingWorkdays } from './adminDash.js';
import { bcnHTML } from '../main.js';
import { emptyH } from '../utils/ui.js';

export function refreshBossDash() {
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

  const bTotal = document.getElementById('bTotal');
  const bDone = document.getElementById('bDone');
  const bPending = document.getElementById('bPending');
  const bossTitle = document.getElementById('bossTitle');
  const bossSub = document.getElementById('bossSub');

  if (bTotal) bTotal.textContent = all.length;
  if (bDone) bDone.textContent = doneCV;
  if (bPending) bPending.textContent = pendCV;
  if (bossTitle) bossTitle.textContent = 'Tổng quan — ' + fmt(now);
  if (bossSub) bossSub.textContent = all.length + ' BCN · ' + mRecs.length + ' tháng này';

  renderAllMissingWorkdays('bossMissBanner');

  const counts = {};
  mRecs.forEach(r => {
    counts[r.ktv] = (counts[r.ktv] || 0) + 1;
  });

  const max = Math.max(...Object.values(counts), 1);
  const bossKtvChart = document.getElementById('bossKtvChart');
  if (bossKtvChart) {
    bossKtvChart.innerHTML = Object.entries(counts).length
      ? Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .map(([name, cnt]) => `<div class="bar-row">
            <div class="bar-label" title="${name}">${name}</div>
            <div class="bar-track">
              <div class="bar-fill" style="width:${Math.round((cnt / max) * 100)}%; background:linear-gradient(90deg,#0f766e,#0e7490)"></div>
            </div>
            <div class="bar-val">${cnt}</div>
          </div>`)
          .join('')
      : '<div style="color:var(--t3);font-size:13px;text-align:center;padding:12px">Chưa có dữ liệu</div>';
  }

  const todayRecs = all.filter(r => normDate(r.ngay) === dateStr(now));
  const bossTodayList = document.getElementById('bossTodayList');
  if (bossTodayList) {
    bossTodayList.innerHTML = todayRecs.length
      ? todayRecs.map(r => bcnHTML(r, 'admin-detail', true)).join('')
      : emptyH('Không có hoạt động hôm nay', '');
  }
}
