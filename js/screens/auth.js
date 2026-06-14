import { S, getRole, ROLE_ADMIN, ROLE_BOSS, ROLE_KTV } from '../store/state.js';
import { hashPin } from '../utils/crypto.js';
import { showLD, hideLD, toast } from '../utils/ui.js';
import { ADMIN_NAME, BOSS_NAME, SUPABASE_URL } from '../config.js';
import { initSupabase, syncAll } from '../api/supabase.js';
import { buildNav } from '../components/nav.js';
import { showScreen } from '../main.js';
import { populateAllDropdowns } from '../components/modal.js';
import { renderSettingsKTV, renderAdminDmPanel } from './settings.js';
import { refreshAdminDash } from './adminDash.js';
import { renderAdminList } from './adminList.js';
import { refreshBossDash } from './bossDash.js';
import { refreshHome } from './home.js';
import { nowTime } from '../utils/date.js';
import { showBanner } from '../api/supabase.js';
import { showConfirm } from '../components/dialog.js';

let pinBuf = '';
let loginTab = 'ktv';

export function getLock(name) {
  try {
    const r = localStorage.getItem('lock_' + name.toLowerCase());
    if (r) return JSON.parse(r);
  } catch (e) {}
  return { attempts: 0, lockedUntil: 0 };
}

export function saveLock(name, lk) {
  try {
    localStorage.setItem('lock_' + name.toLowerCase(), JSON.stringify(lk));
  } catch (e) {}
}

export function isLocked(name) {
  return getLock(name).lockedUntil > Date.now();
}

export function lockSecondsLeft(name) {
  return Math.ceil((getLock(name).lockedUntil - Date.now()) / 1000);
}

export function disablePinPad(on) {
  document.querySelectorAll('.pk:not(.emp)').forEach(b => b.disabled = on);
}

export function startLockCountdown(name) {
  const msg = document.getElementById('lockoutMsg');
  const err = document.getElementById('pinErr');
  if (err) err.style.display = 'none';
  if (msg) msg.style.display = 'block';
  disablePinPad(true);

  const t = setInterval(() => {
    const sec = lockSecondsLeft(name);
    if (sec <= 0) {
      clearInterval(t);
      if (msg) msg.style.display = 'none';
      disablePinPad(false);
      const lk = getLock(name);
      lk.attempts = 0;
      lk.lockedUntil = 0;
      saveLock(name, lk);
    } else {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      if (msg) msg.textContent = `🔒 Tài khoản tạm khóa — thử lại sau ${m > 0 ? m + 'p ' : ''}${s}s`;
    }
  }, 1000);
}

export function switchLoginTab(tab) {
  loginTab = tab;
  pinBuf = '';
  updPin();
  document.getElementById('pinSection').style.display = 'none';
  document.getElementById('pinErr').style.display = 'none';
  document.getElementById('lockoutMsg').style.display = 'none';
  const isKTV = tab === 'ktv';
  document.getElementById('loginTabKTV').style.display = isKTV ? 'block' : 'none';
  document.getElementById('loginTabMgr').style.display = isKTV ? 'none' : 'block';
  document.getElementById('tabKTV').style.background = isKTV ? 'var(--p)' : 'var(--sur2)';
  document.getElementById('tabKTV').style.color = isKTV ? '#fff' : 'var(--t2)';
  document.getElementById('tabMgr').style.background = isKTV ? 'var(--sur2)' : 'var(--p)';
  document.getElementById('tabMgr').style.color = isKTV ? 'var(--t2)' : '#fff';
  if (!isKTV) document.getElementById('loginMgrName').focus();
}

export function populateLoginKTV() {
  const sel = document.getElementById('loginKTV');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Chọn họ tên --</option>';
  S.ktvList
    .filter(k => k.name !== ADMIN_NAME && k.name !== BOSS_NAME)
    .forEach(k => {
      sel.innerHTML += `<option value="${k.name}">${k.name}${k.ghiChu?.toLowerCase() === 'test' ? ' [TEST]' : ''}</option>`;
    });
}

export function onSelectKTV(name) {
  pinBuf = '';
  updPin();
  document.getElementById('pinSection').style.display = name ? 'block' : 'none';
  document.getElementById('pinErr').style.display = 'none';
  document.getElementById('lockoutMsg').style.display = 'none';
  if (name) {
    document.getElementById('pinLabel').textContent = 'Nhập mã PIN';
  }
}

export function onMgrNameInput(name) {
  const trimmed = name.trim();
  const isMgr = [ADMIN_NAME, BOSS_NAME].includes(trimmed);
  if (isMgr) {
    pinBuf = '';
    updPin();
    document.getElementById('pinSection').style.display = 'block';
    document.getElementById('pinLabel').textContent = 'Nhập mã PIN — ' + trimmed;
    document.getElementById('pinErr').style.display = 'none';
    document.getElementById('lockoutMsg').style.display = 'none';
  } else {
    document.getElementById('pinSection').style.display = 'none';
  }
}

export function pk(k) {
  const name = loginTab === 'ktv' ? document.getElementById('loginKTV').value : document.getElementById('loginMgrName').value.trim();
  if (isLocked(name)) return;

  if (k === 'del') {
    pinBuf = pinBuf.slice(0, -1);
  } else if (pinBuf.length < 4) {
    pinBuf += k;
  }
  updPin();
  if (pinBuf.length === 4) {
    setTimeout(() => checkPin(name), 200);
  }
}

export function updPin() {
  for (let i = 0; i < 4; i++) {
    const pd = document.getElementById('pd' + i);
    if (pd) pd.classList.toggle('on', i < pinBuf.length);
  }
}

export async function checkPin(name) {
  const ktv = S.ktvList.find(k => k.name === name);
  if (!ktv) {
    pinBuf = '';
    updPin();
    toast('KTV không tồn tại', 'err');
    return;
  }
  showLD('Đang xác thực...');
  try {
    const hashed = await hashPin(pinBuf, name);
    if (ktv.pin === hashed) {
      hideLD();
      const lk = getLock(name);
      lk.attempts = 0;
      lk.lockedUntil = 0;
      saveLock(name, lk);
      S.userPinHash = hashed;
      loginOK(name);
      return;
    }
  } catch (err) {
    hideLD();
    toast('Lỗi mã hóa PIN', 'err');
    return;
  }
  hideLD();
  pinBuf = '';
  updPin();
  const lk = getLock(name);
  lk.attempts++;
  const left = S.secCfg.maxAttempts - lk.attempts;
  if (lk.attempts >= S.secCfg.maxAttempts) {
    lk.lockedUntil = Date.now() + S.secCfg.lockMinutes * 60 * 1000;
    saveLock(name, lk);
    startLockCountdown(name);
  } else {
    saveLock(name, lk);
    const err = document.getElementById('pinErr');
    if (err) {
      err.style.display = 'block';
      err.textContent = left > 0 ? `PIN không đúng — còn ${left} lần thử` : 'PIN không đúng';
    }
    document.querySelectorAll('#pinDisp .pd').forEach(d => {
      d.classList.add('shake');
      setTimeout(() => d.classList.remove('shake'), 400);
    });
  }
}

export async function loginOK(name) {
  S.user = name;
  S.role = getRole(name);
  S.isAdmin = S.role === ROLE_ADMIN;
  S.isBoss = S.role === ROLE_BOSS;

  initSupabase(S.user, S.userPinHash);

  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appShell').style.display = 'block';

  const roleLabel = {
    [ROLE_ADMIN]: '👑 Quản trị viên',
    [ROLE_BOSS]: '👔 Tổng Giám Đốc',
    [ROLE_KTV]: 'KTV: ' + name
  };
  document.getElementById('hdrSub').textContent = roleLabel[S.role];

  document.getElementById('settingsAdmin').style.display = S.isAdmin ? 'block' : 'none';
  document.getElementById('settingsBoss').style.display = S.isBoss ? 'block' : 'none';
  document.getElementById('settingsKTV').style.display = S.role === ROLE_KTV ? 'block' : 'none';
  document.getElementById('logoutCommonWrap').style.display = S.isAdmin ? 'none' : 'block';

  if (S.isAdmin) {
    document.getElementById('urlDisplay').textContent = SUPABASE_URL.slice(0, 50) + '...';
    document.getElementById('secMaxAttempts').value = S.secCfg.maxAttempts;
    document.getElementById('secLockMinutes').value = S.secCfg.lockMinutes;
  }

  buildNav();
  populateAllDropdowns();

  // Trigger initial sync manually
  await syncAll(true);

  if (S.isAdmin) {
    renderSettingsKTV();
    renderAdminDmPanel();
    refreshAdminDash();
    renderAdminList();
    showScreen('admin-dash');
  } else if (S.isBoss) {
    refreshBossDash();
    showScreen('boss-dash');
  } else {
    refreshHome();
    showScreen('home');
  }
  showBanner('ok', '✓ Đồng bộ lúc ' + nowTime());
}

export async function logout() {
  const ok = await showConfirm({
    title: 'Đăng xuất?',
    msg: 'Bạn sẽ quay về màn hình chọn KTV.',
    icon: '🔒',
    iconType: 'info',
    okText: 'Đăng xuất',
    cancelText: 'Ở lại'
  });
  if (!ok) return;

  S.user = '';
  S.userPinHash = '';
  S.role = ROLE_KTV;
  S.isAdmin = false;
  S.isBoss = false;
  S.records = [];
  S.ktvList = [];
  S.danhMuc = {};
  S.crossResults = [];
  S.isCrossSearch = false;

  pinBuf = '';
  updPin();

  const ktvSel = document.getElementById('loginKTV');
  if (ktvSel) ktvSel.value = '';

  const mgrInp = document.getElementById('loginMgrName');
  if (mgrInp) mgrInp.value = '';

  document.getElementById('appShell').style.display = 'none';
  document.getElementById('loginScreen').style.display = '';
  switchLoginTab('ktv');

  // Trigger page reload effect natively or re-init app
  // In module setup, we can re-init like window.onload
  if (window.appInit) {
    window.appInit();
  }
}
