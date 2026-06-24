import { SUPABASE_URL } from './config.js';
import { S, sb, TB_KTV, TB_DM, TB_CFG, ROLE_ADMIN, ROLE_BOSS, ROLE_KTV } from './store/state.js';
import { setupDialogListeners, showConfirm } from './components/dialog.js';
import { initSupabase } from './api/supabase.js';
import { populateLoginKTV, switchLoginTab, onSelectKTV, onMgrNameInput, pk, logout, updPin } from './screens/auth.js';
import { normDate, fmtStr, dateStr } from './utils/date.js';
import { toast, showLD, hideLD, emptyH } from './utils/ui.js';
import { renderKTVList } from './screens/ktvList.js';
import { renderAdminList } from './screens/adminList.js';
import { refreshAdminDash } from './screens/adminDash.js';
import { refreshBossDash } from './screens/bossDash.js';
import { refreshHome } from './screens/home.js';
import { renderSettingsKTV, renderAdminDmPanel } from './screens/settings.js';
import { populateAllDropdowns } from './components/modal.js';
import { openFormEdit } from './screens/form.js';
import { printBCN } from './components/print.js';
import { manualSync } from './api/supabase.js';

export function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.ni').forEach(n => n.classList.remove('active'));

  const screenEl = document.getElementById('screen-' + name);
  if (screenEl) screenEl.classList.add('active');

  const navEl = document.getElementById('nav-' + name);
  if (navEl) navEl.classList.add('active');

  const titles = {
    'home': 'Trang Chủ',
    'list': 'Danh Sách',
    'form': 'Tạo BCN',
    'detail': 'Chi Tiết',
    'cross-detail': 'Lịch Sử Máy',
    'admin-dash': 'Dashboard',
    'admin-list': 'Tất Cả BCN',
    'admin-detail': 'Chi Tiết BCN',
    'boss-dash': 'Tổng Quan',
    'settings': 'Cài Đặt'
  };

  const hdrTitle = document.getElementById('hdrTitle');
  if (hdrTitle) hdrTitle.textContent = titles[name] || 'BCN App';

  if (name === 'list') renderKTVList();
  if (name === 'admin-list') renderAdminList();
  if (name === 'settings' && S.isAdmin) {
    renderSettingsKTV();
    renderAdminDmPanel();
    if (window.switchAdminSubtab) window.switchAdminSubtab('ktv');
  }

  window.scrollTo(0, 0);
}

export async function goHome() {
  const formScreen = document.getElementById('screen-form');
  const formActive = formScreen && formScreen.classList.contains('active');

  if (formActive && S.tmpCV.length > 0) {
    const ok = await showConfirm({
      title: 'Hủy báo cáo?',
      msg: 'Dữ liệu đã nhập sẽ bị mất. Bạn có chắc muốn hủy?',
      icon: '⚠️',
      iconType: 'warn',
      okText: 'Hủy báo cáo',
      cancelText: 'Tiếp tục nhập'
    });
    if (!ok) return;
  }
  S.tmpCV = [];
  S.editingBCNId = null;
  showScreen(S.isAdmin ? 'admin-dash' : 'home');
}

export function bcnHTML(r, detailScreen, showKTV = false) {
  const total = (r.chiTiet || []).length;
  const done = (r.chiTiet || []).filter(c => c.ketQua === 'Hoàn thành').length;
  const pur = showKTV;
  return `<div class="bcn-item" onclick="viewBCN('${r.id}','${detailScreen}')">
    <div class="bcn-ico ${pur ? 'purple' : ''}">
      <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
        <rect x="9" y="3" width="6" height="4" rx="2"/><path d="M9 12h6M9 16h4"/>
      </svg>
    </div>
    <div class="bcn-inf">
      <div class="bcn-so">${r.so}</div>
      <div class="bcn-meta">${fmtStr(normDate(r.ngay))}${showKTV ? ' · ' + r.ktv : ''} · ${total} công việc</div>
    </div>
    <span class="badge ${done === total && total > 0 ? 'ok' : ''}">${done}/${total}</span>
  </div>`;
}

export function filterRecs(recs, tab, q) {
  const now = new Date();
  const tod = dateStr(now);
  const wk0 = new Date(now);
  wk0.setDate(now.getDate() - now.getDay());
  const mStr = now.getFullYear() + '-' + (now.getMonth() + 1).toString().padStart(2, '0');

  if (tab === 'today') recs = recs.filter(r => normDate(r.ngay) === tod);
  if (tab === 'week') recs = recs.filter(r => { const nd = normDate(r.ngay); return nd && new Date(nd) >= wk0; });
  if (tab === 'month') recs = recs.filter(r => normDate(r.ngay).startsWith(mStr));

  if (q) {
    const ql = q.toLowerCase();
    recs = recs.filter(r =>
      (r.so || '').toLowerCase().includes(ql) ||
      (r.ktv || '').toLowerCase().includes(ql) ||
      (r.chiTiet || []).some(c => (c.khachHang || '').toLowerCase().includes(ql))
    );
  }
  return recs.slice().sort((a, b) => normDate(b.ngay).localeCompare(normDate(a.ngay)));
}

export function viewBCN(id, targetScreen) {
  const r = S.records.find(x => x.id === id);
  if (!r) return;

  const isAd = targetScreen === 'admin-detail';
  const rows = (r.chiTiet || []).map(cv => `
    <div class="cvi">
      <div class="cvi-hd"><div>
        <div class="cvi-title">${(cv.khachHang || '-').split('@')[0].trim()}</div>
        <div class="cvi-meta">${cv.loaiViec || ''}${cv.model ? ' · ' + cv.model : ''}</div>
      </div></div>
      <div class="cv-tags">
        ${cv.thoiGian ? `<span class="tag ${cv.thoiGian === 'SÁNG' ? 't0' : ''}" style="${cv.thoiGian === 'CHIỀU' ? 'background:#ede9fe;color:#7c3aed' : ''}">${cv.thoiGian}</span>` : ''}
        <span class="tag tg">${cv.soLuong || 1}x</span>
        ${cv.counter ? `<span class="tag tg">📠 ${cv.counter}</span>` : ''}
        <span class="tag ${cv.ketQua === 'Hoàn thành' ? 't2' : ''}">${cv.ketQua || '-'}</span>
        ${cv.ghiChu ? `<span class="tag tg">📝 ${cv.ghiChu}</span>` : ''}
      </div>
    </div>`).join('');

  const backTarget = isAd ? 'admin-list' : 'list';
  const closingDate = S.secCfg?.closingDate || '';
  const isLocked = !S.isAdmin && closingDate && normDate(r.ngay) <= closingDate;
  const html = `
    <div class="dh ${isAd ? 'purple' : 'blue'}">
      <div class="dh-so">${r.so}</div>
      <div class="dh-date">${fmtStr(normDate(r.ngay))}</div>
      <div class="dh-ktv">KTV: ${r.ktv}</div>
    </div>
    <div class="card">
      <div class="ct"><span class="ct-dot" style="background:${isAd ? '#7c3aed' : 'var(--p)'}"></span>Chi tiết công việc (${(r.chiTiet || []).length})</div>
      ${rows || '<div style="color:var(--t3);text-align:center;padding:16px">Không có dữ liệu</div>'}
    </div>
    <div class="btn-row">
      <button class="btn btn-s" onclick="showScreen('${backTarget}')">← Quay lại</button>
      <button class="btn btn-ok" onclick="printBCN('${r.id}')" style="flex:1">🖨️ Xuất PDF</button>
      ${!isAd && !isLocked ? `<button class="btn btn-s" onclick="openFormEdit('${r.id}')" style="flex:0.6;padding:10px 4px;font-size:13px">Sửa</button><button class="btn btn-d" onclick="delBCN('${r.id}')" style="flex:0.6;padding:10px 4px;font-size:13px">Xóa</button>` : ''}
    </div>`;

  const container = document.getElementById(isAd ? 'adDetailContent' : 'detailContent');
  if (container) container.innerHTML = html;
  showScreen(targetScreen);
}

export async function delBCN(id) {
  const r = S.records.find(x => x.id === id);
  if (!r) return;

  const closingDate = S.secCfg?.closingDate || '';
  if (!S.isAdmin && closingDate && normDate(r.ngay) <= closingDate) {
    toast('Ngày này đã khóa sổ, không thể xóa!', 'err');
    return;
  }

  const ok = await showConfirm({
    title: 'Xóa báo cáo?',
    msg: 'Báo cáo sẽ bị xóa vĩnh viễn khỏi hệ thống. Không thể khôi phục.',
    icon: '🗑️',
    iconType: 'danger',
    okText: 'Xóa',
    okDanger: true
  });
  if (!ok) return;

  showLD('Đang xóa...');
  try {
    const { error } = await sb.from(TB_BCN).delete().eq('id', id);
    if (error) throw error;

    S.records = S.records.filter(r => r.id !== id);
    if (S.editingBCNId === id) S.editingBCNId = null;

    hideLD();
    toast('Báo cáo đã được xóa', 'ok2');
    refreshHome();
    showScreen('list');
  } catch (e) {
    hideLD();
    toast('Lỗi xóa: ' + e.message, 'err');
  }
}

// App Initialization
export async function appInit() {
  setupDialogListeners();

  if (!SUPABASE_URL || SUPABASE_URL.includes('your-project-id')) {
    const ls = document.getElementById('loginStatus');
    if (ls) ls.textContent = '⚠ Chưa cấu hình SUPABASE_URL';
    return;
  }

  initSupabase();

  const ls = document.getElementById('loginStatus');
  if (ls) ls.textContent = 'Đang tải cấu hình hệ thống...';

  try {
    const { data: ktvs, error: e1 } = await sb.from(TB_KTV).select('ho_ten,ghi_chu').order('ho_ten');
    if (e1) throw e1;
    S.ktvList = ktvs.map(k => ({ name: k.ho_ten, ghiChu: k.ghi_chu || '' }));

    const { data: dm, error: e2 } = await sb.from(TB_DM).select('loai_danh_muc,gia_tri,thu_tu').order('thu_tu', { ascending: true });
    if (e2) throw e2;

    const dmMap = {};
    dm.forEach(item => {
      if (!dmMap[item.loai_danh_muc]) dmMap[item.loai_danh_muc] = [];
      dmMap[item.loai_danh_muc].push(item.gia_tri);
    });
    S.danhMuc = dmMap;
    S.ngayLe = dmMap['NgayLe'] || [];

    const { data: cfg, error: e3 } = await sb.from(TB_CFG).select('key,value');
    if (!e3 && cfg) {
      const m = {};
      cfg.forEach(c => m[c.key] = c.value);
      S.secCfg = {
        maxAttempts: parseInt(m['max_failed_attempts'] || 5),
        lockMinutes: parseInt(m['lockout_duration_minutes'] || 5),
        closingDate: m['closing_date'] || ''
      };
    }
    populateLoginKTV();
    if (ls) ls.textContent = '';
  } catch (e) {
    if (ls) ls.textContent = '⚠ Lỗi kết nối: ' + e.message;
  }
}

// Ensure init executes on load
window.onload = () => {
  appInit();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").then(reg => {
      console.log("SW registered");
      reg.onupdatefound = () => {
        const installingWorker = reg.installing;
        installingWorker.onstatechange = () => {
          if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
            console.log("New version available, reloading...");
            setTimeout(() => window.location.reload(), 500);
          }
        };
      };
    }).catch(err => console.log("SW Error:", err));
  }
};

window.appInit = appInit;

// Bind missing generic exports to window
window.showScreen = showScreen;
window.goHome = goHome;
window.viewBCN = viewBCN;
window.delBCN = delBCN;
window.switchLoginTab = switchLoginTab;
window.onSelectKTV = onSelectKTV;
window.onMgrNameInput = onMgrNameInput;
window.pk = pk;
window.logout = logout;
window.manualSync = manualSync;

// Expose S for debugging via console
window.S = S;
