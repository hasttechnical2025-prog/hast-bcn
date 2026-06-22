import { S, sb, TB_BCN, TB_CV } from '../store/state.js';
import { dateStr, normDate, fmtStr } from '../utils/date.js';
import { showConfirm } from '../components/dialog.js';
import { viewBCN, showScreen } from '../main.js';
import { renderCVList } from '../components/modal.js';
import { toast, showLD, hideLD } from '../utils/ui.js';
import { refreshHome } from './home.js';

export function genNo(d) {
  const yy = d.getFullYear().toString().slice(-2);
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');
  return `BCN-${yy}${mm}${dd}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export function setFormDate(ymd) {
  const fNgay = document.getElementById('fNgay');
  const fNgayDisplay = document.getElementById('fNgayDisplay');
  if (fNgay) fNgay.value = ymd;
  if (fNgayDisplay) fNgayDisplay.value = fmtStr(ymd);
}

export function openFormNew(targetDate) {
  S.editingBCNId = null;
  S.tmpCV = [];
  const fSo = document.getElementById('fSo');
  if (fSo) fSo.value = genNo(new Date(targetDate + 'T00:00:00'));

  setFormDate(targetDate);

  const fKTV = document.getElementById('fKTV');
  if (fKTV) fKTV.value = S.user;

  const editIndicator = document.getElementById('editIndicator');
  if (editIndicator) editIndicator.style.display = 'none';

  const hdrTitle = document.getElementById('hdrTitle');
  if (hdrTitle) hdrTitle.textContent = 'Tạo BCN';

  renderCVList();
  showScreen('form');
}

export function openFormEdit(id) {
  const r = S.records.find(x => x.id === id);
  if (!r) return;
  S.editingBCNId = id;
  S.tmpCV = (r.chiTiet || []).map(cv => ({ ...cv }));

  const fSo = document.getElementById('fSo');
  if (fSo) fSo.value = r.so;

  setFormDate(normDate(r.ngay));

  const fKTV = document.getElementById('fKTV');
  if (fKTV) fKTV.value = r.ktv;

  const ind = document.getElementById('editIndicator');
  if (ind) ind.style.display = 'flex';

  const editIndicatorText = document.getElementById('editIndicatorText');
  if (editIndicatorText) editIndicatorText.textContent = 'Đang sửa — ' + fmtStr(normDate(r.ngay));

  const hdrTitle = document.getElementById('hdrTitle');
  if (hdrTitle) hdrTitle.textContent = 'Sửa BCN';

  renderCVList();
  showScreen('form');
}

export async function startBCNForDate(targetDate) {
  const my = S.records.filter(r => r.ktv === S.user);
  const alreadyDone = my.some(r => normDate(r.ngay) === targetDate);

  if (alreadyDone) {
    const rec = my.find(r => normDate(r.ngay) === targetDate);
    const ok = await showConfirm({
      title: 'Đã có báo cáo ngày ' + fmtStr(targetDate),
      msg: 'Ngày này đã có báo cáo rồi. Bạn có muốn xem và sửa không?',
      icon: '📋',
      iconType: 'info',
      okText: 'Xem báo cáo',
      cancelText: 'Đóng'
    });
    if (ok && rec) viewBCN(rec.id, 'detail');
    return;
  }
  openFormNew(targetDate);
}

export async function startNewBCN() {
  await startBCNForDate(dateStr(new Date()));
}

export async function saveBCN() {
  if (!S.tmpCV.length) {
    toast('Cần thêm ít nhất 1 công việc', 'err');
    return;
  }

  const ngay = document.getElementById('fNgay').value;
  const closingDate = S.secCfg?.closingDate || '';
  if (!S.isAdmin && closingDate && ngay <= closingDate) {
    toast('Ngày này đã khóa sổ, không thể thêm/sửa báo cáo!', 'err');
    return;
  }

  const isEdit = S.editingBCNId !== null;
  const my = S.records.filter(r => r.ktv === S.user);
  const dupRec = my.find(r => normDate(r.ngay) === normDate(ngay) && r.id !== S.editingBCNId);

  if (dupRec) {
    toast('Ngày ' + fmtStr(normDate(ngay)) + ' đã có báo cáo rồi!', 'err');
    return;
  }

  showLD(isEdit ? 'Đang cập nhật...' : 'Đang lưu...');
  const bcnId = isEdit ? S.editingBCNId : Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const soBCN = document.getElementById('fSo').value;

  try {
    const { error: upsertErr } = await sb.from(TB_BCN).upsert({ id: bcnId, so_bcn: soBCN, ngay, ktv: S.user }, { onConflict: 'so_bcn' });
    if (upsertErr) throw upsertErr;

    if (isEdit) {
      const { error: delErr } = await sb.from(TB_CV).delete().eq('bcn_id', bcnId);
      if (delErr) throw delErr;
    }

    const congViecRows = S.tmpCV.map(cv => ({
      bcn_id: bcnId,
      khach_hang: cv.khachHang,
      loai_viec: cv.loaiViec,
      model: cv.model,
      thoi_gian: cv.thoiGian,
      so_luong: parseInt(cv.soLuong || 1),
      counter: parseInt(cv.counter || 0),
      ket_qua: cv.ketQua,
      ghi_chu: cv.ghiChu
    }));

    const { error: insCvErr } = await sb.from(TB_CV).insert(congViecRows);
    if (insCvErr) throw insCvErr;

    const updatedBCN = { id: bcnId, so: soBCN, ngay, ktv: S.user, chiTiet: [...S.tmpCV], createdAt: new Date().toISOString() };

    if (isEdit) {
      const idx = S.records.findIndex(r => r.id === bcnId);
      if (idx >= 0) S.records[idx] = updatedBCN;
      S.editingBCNId = null;
      toast('Đã cập nhật báo cáo ✓', 'ok2');
    } else {
      S.records.unshift(updatedBCN);
      toast('Báo cáo đã lưu thành công ✓', 'ok2');
    }

    hideLD();
    showScreen('home');
    refreshHome();
  } catch (e) {
    hideLD();
    toast('Lỗi lưu: ' + e.message, 'err');
  }
}

// Bind to window for HTML inline event listeners
window.startBCNForDate = startBCNForDate;
window.startNewBCN = startNewBCN;
window.openFormEdit = openFormEdit;
window.saveBCN = saveBCN;
