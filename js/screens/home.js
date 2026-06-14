import { S } from '../store/state.js';
import { dateStr, normDate, fmt, getKtvMissingWorkdays, fmtMissDay, isHoliday } from '../utils/date.js';
import { emptyH } from '../utils/ui.js';
import { startBCNForDate, startNewBCN } from './form.js';
import { bcnHTML } from '../main.js';

export function refreshHome() {
  const now = new Date();
  const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

  const dbDay = document.getElementById('dbDay');
  const dbDate = document.getElementById('dbDate');
  const dbHi = document.getElementById('dbHi');
  const stToday = document.getElementById('stToday');
  const stMonth = document.getElementById('stMonth');

  if (dbDay) dbDay.textContent = days[now.getDay()];
  if (dbDate) dbDate.textContent = fmt(now);
  if (dbHi) dbHi.textContent = 'Xin chào, ' + S.user + '!';

  const my = S.records.filter(r => r.ktv === S.user);
  const tod = my.filter(r => normDate(r.ngay) === dateStr(now));
  const mStr = now.getFullYear() + '-' + (now.getMonth() + 1).toString().padStart(2, '0');

  if (stToday) stToday.textContent = tod.length;
  if (stMonth) stMonth.textContent = my.filter(r => normDate(r.ngay).startsWith(mStr)).length;

  const doneBanner = document.getElementById('doneBanner');
  const qbtn = document.querySelector('.qbtn');
  const today = dateStr(now);
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;
  const isHol = isHoliday(today);
  const doneToday = tod.length > 0;
  const dbSub = document.getElementById('dbSub');

  if (doneToday) {
    const cvTotal = tod.reduce((s, r) => (s + (r.chiTiet || []).length), 0);
    if (doneBanner) {
      doneBanner.style.display = 'flex';
      doneBanner.innerHTML = `<div class="done-banner">
        <div class="done-banner-ico">
          <svg viewBox="0 0 24 24" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div class="done-banner-txt">
          <div class="done-banner-title">Đã hoàn thành báo cáo hôm nay ✓</div>
          <div class="done-banner-sub">${tod.length} BCN · ${cvTotal} công việc đã ghi</div>
        </div>
      </div>`;
    }
    if (dbSub) dbSub.textContent = tod.length + ' báo cáo hôm nay';
    if (qbtn) {
      qbtn.classList.add('disabled');
      qbtn.disabled = true;
      qbtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="20" height="20"><polyline points="20 6 9 17 4 12"/></svg> Đã báo cáo hôm nay';
    }
  } else if (isWeekend || isHol) {
    if (doneBanner) {
      doneBanner.style.display = 'flex';
      const label = isHol ? '🎌 Hôm nay là ngày lễ' : now.getDay() === 6 ? '🌤 Thứ Bảy — không cần báo cáo' : '☀️ Chủ Nhật — không cần báo cáo';
      doneBanner.innerHTML = `<div class="done-banner" style="background:#f8faff;border-color:var(--bdr)">
        <div class="done-banner-txt" style="text-align:center">
          <div class="done-banner-title" style="color:var(--t2)">${label}</div>
        </div>
      </div>`;
    }
    if (dbSub) dbSub.textContent = isHol ? '🎌 Hôm nay là ngày lễ' : now.getDay() === 6 ? '🌤 Thứ Bảy — không cần báo cáo' : '☀️ Chủ Nhật — không cần báo cáo';
    if (qbtn) {
      qbtn.classList.add('disabled');
      qbtn.disabled = true;
    }
  } else {
    if (doneBanner) doneBanner.style.display = 'none';
    if (dbSub) dbSub.textContent = 'Chưa có báo cáo hôm nay';
    if (qbtn) {
      qbtn.classList.remove('disabled');
      qbtn.disabled = false;
      qbtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke="#fff" width="20" height="20"><path d="M12 5v14M5 12h14"/></svg> Tạo Báo Cáo Hôm Nay';
    }
  }

  const missBanner = document.getElementById('missBanner');
  const missing = getKtvMissingWorkdays(S.user).filter(d => d !== today);
  if (missing.length > 0) {
    if (missBanner) {
      missBanner.style.display = 'block';
      missBanner.innerHTML = `<div class="miss-banner">
        <div class="miss-banner-hd">
          <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <div class="miss-banner-title">Còn ${missing.length} ngày chưa có báo cáo</div>
        </div>
        <div class="miss-days">
          ${missing.map(d => `<span class="miss-day" onclick="startBCNForDate('${d}')" style="cursor:pointer">${fmtMissDay(d)}</span>`).join('')}
        </div>
      </div>`;
    }
  } else {
    if (missBanner) missBanner.style.display = 'none';
  }

  const recent = my.slice().sort((a, b) => normDate(b.ngay).localeCompare(normDate(a.ngay))).slice(0, 5);
  const recentList = document.getElementById('recentList');
  if (recentList) {
    recentList.innerHTML = recent.length
      ? recent.map(r => bcnHTML(r, 'detail')).join('')
      : emptyH('Chưa có báo cáo', 'Nhấn "+ Tạo Báo Cáo" để bắt đầu');
  }
}
