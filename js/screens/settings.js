import { S, sb, TB_KTV, TB_DM, TB_CFG } from '../store/state.js';
import { ADMIN_NAME, BOSS_NAME } from '../config.js';
import { hashPin } from '../utils/crypto.js';
import { toast, showLD, hideLD } from '../utils/ui.js';
import { showConfirm } from '../components/dialog.js';
import { populateLoginKTV } from './auth.js';
import { populateAllDropdowns } from '../components/modal.js';
import { initSupabase } from '../api/supabase.js';

export function switchAdminSubtab(tabName) {
  document.querySelectorAll('#settingsAdmin .chip-grp .chip').forEach(c => c.classList.remove('active'));
  const subTab = document.getElementById('subtab-' + tabName);
  if (subTab) subTab.classList.add('active');

  document.querySelectorAll('.admin-subtab-section').forEach(sec => sec.style.display = 'none');
  const section = document.getElementById('sec-admin-' + tabName);
  if (section) section.style.display = 'block';
}

export async function testConn() {
  showLD('Kiểm tra...');
  try {
    const { data, error } = await sb.from(TB_KTV).select('ho_ten').limit(1);
    hideLD();
    if (error) throw error;
    toast('✓ Kết nối Supabase thành công!', 'ok2');
  } catch (e) {
    hideLD();
    toast('✕ Lỗi kết nối: ' + e.message, 'err');
  }
}

export function renderSettingsKTV() {
  const ktvListEl = document.getElementById('ktvList');
  if (!ktvListEl) return;
  ktvListEl.innerHTML = S.ktvList.map((k, i) => `
    <div class="info-row">
      <div class="ik">${k.name}${k.ghiChu?.toLowerCase() === 'test' ? ' <span style="font-size:10px;background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:10px;font-weight:700">TEST</span>' : ''}</div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:10px;color:var(--t3)">🔒 Đã mã hóa</span>
        ${k.name !== ADMIN_NAME ? `<button onclick="removeKTV('${k.name}')" style="background:#fef2f2;border:none;border-radius:6px;padding:4px 8px;color:var(--err);cursor:pointer;font-size:12px">Xóa</button>` : ''}
      </div>
    </div>`).join('');
}

export async function addKTV() {
  const name = document.getElementById('newKTVName').value.trim();
  const pin = document.getElementById('newKTVPin').value.trim();
  const ghiChu = document.getElementById('newKTVGhiChu').value.trim();

  if (!name) { toast('Nhập tên KTV', 'err'); return; }
  if (!/^\d{4}$/.test(pin)) { toast('PIN phải đúng 4 chữ số', 'err'); return; }

  showLD('Đang lưu lên database...');
  try {
    const pinH = await hashPin(pin, name);
    const { error } = await sb.from(TB_KTV).insert({ ho_ten: name, pin_hash: pinH, ghi_chu: ghiChu || 'KTV' });
    hideLD();
    if (error) throw error;

    S.ktvList.push({ name, pin: pinH, ghiChu: ghiChu || 'KTV' });
    populateLoginKTV();
    renderSettingsKTV();

    document.getElementById('newKTVName').value = '';
    document.getElementById('newKTVPin').value = '';
    document.getElementById('newKTVGhiChu').value = '';
    toast('Đã thêm KTV thành công', 'ok2');
  } catch (e) {
    hideLD();
    toast('Lỗi: ' + e.message, 'err');
  }
}

export async function removeKTV(name) {
  const ok = await showConfirm({
    title: 'Xóa KTV?',
    msg: `Xóa "${name}" khỏi danh sách? Thao tác này không thể hoàn tác.`,
    icon: '👤',
    iconType: 'danger',
    okText: 'Xóa KTV',
    okDanger: true
  });
  if (!ok) return;

  showLD('Đang xóa...');
  try {
    const { error } = await sb.from(TB_KTV).delete().eq('ho_ten', name);
    hideLD();
    if (error) throw error;

    S.ktvList = S.ktvList.filter(k => k.name !== name);
    populateLoginKTV();
    renderSettingsKTV();
    toast('Đã xóa KTV khỏi danh sách', 'ok2');
  } catch (e) {
    hideLD();
    toast('Lỗi: ' + e.message, 'err');
  }
}

export function renderAdminDmPanel() {
  const select = document.getElementById('adminDmSelect');
  if (!select) return;

  const cat = select.value;
  const values = S.danhMuc[cat] || [];
  const listEl = document.getElementById('adminDmList');

  if (!listEl) return;
  if (!values.length) {
    listEl.innerHTML = '<div style="color:var(--t3);font-size:13px;text-align:center;padding:16px">Chưa có giá trị nào</div>';
    return;
  }

  listEl.innerHTML = values.map((v, i) => `
    <div class="info-row" style="padding:8px 0">
      <div style="font-size:14px;font-weight:600;color:var(--t1);word-break:break-all">${v}</div>
      <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
        <button onclick="moveDmValue(${i},-1)" ${i === 0 ? 'disabled style="opacity:0.3;cursor:default"' : ''}
          style="background:#f1f5f9;border:none;border-radius:6px;padding:6px 10px;color:var(--t2);cursor:pointer;font-size:12px;font-weight:700">▲</button>
        <button onclick="moveDmValue(${i},1)" ${i === values.length - 1 ? 'disabled style="opacity:0.3;cursor:default"' : ''}
          style="background:#f1f5f9;border:none;border-radius:6px;padding:6px 10px;color:var(--t2);cursor:pointer;font-size:12px;font-weight:700">▼</button>
        <button onclick="removeDmValue('${v.replace(/'/g, "\\'")}')"
          style="background:#fef2f2;border:none;border-radius:6px;padding:6px 10px;color:var(--err);cursor:pointer;font-size:12px;font-weight:700;margin-left:4px">Xóa</button>
      </div>
    </div>`).join('');
}

export async function moveDmValue(idx, dir) {
  const select = document.getElementById('adminDmSelect');
  if (!select) return;

  const cat = select.value;
  const values = S.danhMuc[cat] || [];
  const ti = idx + dir;

  if (ti < 0 || ti >= values.length) return;
  const vCur = values[idx];
  const vTgt = values[ti];

  showLD('Đang sắp xếp...');
  try {
    const { data: recs, error: ge } = await sb.from(TB_DM).select('id,gia_tri,thu_tu').eq('loai_danh_muc', cat).in('gia_tri', [vCur, vTgt]);
    if (ge) throw ge;
    if (recs.length < 2) throw new Error('Dữ liệu không đồng bộ');

    const rCur = recs.find(r => r.gia_tri === vCur);
    const rTgt = recs.find(r => r.gia_tri === vTgt);

    const { error: u1 } = await sb.from(TB_DM).update({ thu_tu: rTgt.thu_tu }).eq('id', rCur.id);
    if (u1) throw u1;

    const { error: u2 } = await sb.from(TB_DM).update({ thu_tu: rCur.thu_tu }).eq('id', rTgt.id);
    if (u2) throw u2;

    values[idx] = vTgt;
    values[ti] = vCur;

    if (cat === 'NgayLe') S.ngayLe = [...values];
    hideLD();
    toast('Đã đổi vị trí ✓', 'ok2');
    renderAdminDmPanel();
    populateAllDropdowns();
  } catch (e) {
    hideLD();
    toast('Lỗi sắp xếp: ' + e.message, 'err');
  }
}

export async function addDmValue() {
  const select = document.getElementById('adminDmSelect');
  const input = document.getElementById('adminDmNewValue');
  if (!select || !input) return;

  const cat = select.value;
  const newVal = input.value.trim();

  if (!newVal) { toast('Vui lòng nhập giá trị cần thêm', 'err'); return; }

  const values = S.danhMuc[cat] || [];
  if (values.includes(newVal)) { toast('Giá trị này đã tồn tại!', 'err'); return; }

  let maxOrder = 0;
  try {
    const { data: mr, error: me } = await sb.from(TB_DM).select('thu_tu').eq('loai_danh_muc', cat).order('thu_tu', { ascending: false }).limit(1);
    if (!me && mr && mr.length > 0) maxOrder = parseInt(mr[0].thu_tu || 0);
  } catch (e) {}

  showLD('Đang lưu...');
  try {
    const { error } = await sb.from(TB_DM).insert({ loai_danh_muc: cat, gia_tri: newVal, thu_tu: maxOrder + 1 });
    if (error) throw error;

    if (!S.danhMuc[cat]) S.danhMuc[cat] = [];
    S.danhMuc[cat].push(newVal);

    if (cat === 'NgayLe') S.ngayLe.push(newVal);
    input.value = '';
    hideLD();
    toast('Đã thêm thành công ✓', 'ok2');
    renderAdminDmPanel();
    populateAllDropdowns();
  } catch (e) {
    hideLD();
    toast('Lỗi khi thêm: ' + e.message, 'err');
  }
}

export async function removeDmValue(val) {
  const select = document.getElementById('adminDmSelect');
  if (!select) return;

  const cat = select.value;
  const ok = await showConfirm({
    title: 'Xóa giá trị danh mục?',
    msg: `Bạn có chắc muốn xóa "${val}" khỏi danh mục không?`,
    icon: '⚠️',
    iconType: 'warn',
    okText: 'Xóa',
    okDanger: true
  });
  if (!ok) return;

  showLD('Đang xóa...');
  try {
    const { error } = await sb.from(TB_DM).delete().match({ loai_danh_muc: cat, gia_tri: val });
    if (error) throw error;

    if (S.danhMuc[cat]) S.danhMuc[cat] = S.danhMuc[cat].filter(x => x !== val);
    if (cat === 'NgayLe') S.ngayLe = S.ngayLe.filter(x => x !== val);

    hideLD();
    toast('Đã xóa thành công ✓', 'ok2');
    renderAdminDmPanel();
    populateAllDropdowns();
  } catch (e) {
    hideLD();
    toast('Lỗi khi xóa: ' + e.message, 'err');
  }
}

export function adjSecCfg(key, d) {
  const el = document.getElementById(key === 'maxAttempts' ? 'secMaxAttempts' : 'secLockMinutes');
  const mins = 1;
  const maxs = key === 'maxAttempts' ? 20 : 60;
  S.secCfg[key] = Math.max(mins, Math.min(maxs, S.secCfg[key] + d));
  if (el) el.value = S.secCfg[key];
}

export async function saveSecCfg() {
  showLD('Đang lưu...');
  try {
    const { error: e1 } = await sb.from(TB_CFG).update({ value: String(S.secCfg.maxAttempts) }).eq('key', 'max_failed_attempts');
    if (e1) throw e1;
    const { error: e2 } = await sb.from(TB_CFG).update({ value: String(S.secCfg.lockMinutes) }).eq('key', 'lockout_duration_minutes');
    if (e2) throw e2;

    hideLD();
    toast('Đã lưu cài đặt bảo mật lên database', 'ok2');
  } catch (e) {
    hideLD();
    toast('Lỗi: ' + e.message, 'err');
  }
}

export async function changePINGeneric(oldId, newId, confId) {
  const oldPin = document.getElementById(oldId).value.trim();
  const newPin = document.getElementById(newId).value.trim();
  const conf = document.getElementById(confId).value.trim();

  if (!oldPin || !newPin || !conf) { toast('Vui lòng điền đủ thông tin', 'err'); return; }
  if (!/^\d{4}$/.test(newPin)) { toast('PIN mới phải đúng 4 chữ số', 'err'); return; }
  if (newPin !== conf) { toast('PIN xác nhận không khớp', 'err'); return; }

  showLD('Đang đổi PIN...');
  try {
    const hashedOld = await hashPin(oldPin, S.user);
    const hashedNew = await hashPin(newPin, S.user);

    if (S.userPinHash !== hashedOld) {
      hideLD();
      toast('PIN hiện tại không đúng', 'err');
      return;
    }

    const { data, error } = await sb.from(TB_KTV).update({ pin_hash: hashedNew }).eq('ho_ten', S.user).select();
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Không có quyền đổi mật khẩu. RLS đã chặn.');

    S.userPinHash = hashedNew;
    initSupabase(S.user, S.userPinHash);

    [oldId, newId, confId].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    hideLD();
    toast('Đổi mã PIN thành công', 'ok2');
  } catch (e) {
    hideLD();
    toast('Lỗi: ' + e.message, 'err');
  }
}

// Bind to window for HTML inline event listeners
window.switchAdminSubtab = switchAdminSubtab;
window.testConn = testConn;
window.addKTV = addKTV;
window.removeKTV = removeKTV;
window.renderAdminDmPanel = renderAdminDmPanel;
window.moveDmValue = moveDmValue;
window.addDmValue = addDmValue;
window.removeDmValue = removeDmValue;
window.adjSecCfg = adjSecCfg;
window.saveSecCfg = saveSecCfg;
window.changePINGeneric = changePINGeneric;
