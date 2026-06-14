import { S, DM_MAP, tgSelected, setTgSelected } from '../store/state.js';
import { toast } from '../utils/ui.js';

export function fillSel(id, items) {
  const el = document.getElementById(id);
  if (!el) return;
  const cur = el.value;
  el.innerHTML = '<option value="">-- Chọn --</option>';
  items.forEach(v => {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = v;
    el.appendChild(o);
  });
  el.value = cur;
  if (!cur) el.classList.add('empty');
}

export function populateAllDropdowns() {
  Object.entries(DM_MAP).forEach(([id, key]) => fillSel(id, S.danhMuc[key] || []));
}

export function openKHDrop() {
  const input = document.getElementById('cv_khSearch');
  if (input) filterKH(input.value);
  const drop = document.getElementById('khDrop');
  if (drop) drop.classList.add('open');
}

export function closeKHDrop() {
  const drop = document.getElementById('khDrop');
  if (drop) drop.classList.remove('open');
}

export function filterKH(q) {
  const list = S.danhMuc['KhachHang'] || [];
  const ql = q.toLowerCase().trim();
  const hits = ql ? list.filter(v => v.toLowerCase().includes(ql)) : list;
  const drop = document.getElementById('khDrop');
  const cur = document.getElementById('cv_khachHang').value;

  if (!drop) return;

  drop.innerHTML = hits.length
    ? hits.slice(0, 30).map(v => {
        const p = v.split('@');
        const name = p[0].trim();
        const model = p[1]?.trim() || '';
        return `<div class="kh-opt ${v === cur ? 'selected' : ''}" onmousedown="selectKH('${v.replace(/'/g, "\\'")}')">
          ${name}${model ? `<span class="kh-code">@ ${model}</span>` : ''}
        </div>`;
      }).join('')
    : '<div class="kh-empty">Không tìm thấy</div>';
  drop.classList.add('open');
}

export function selectKH(val) {
  const cvKh = document.getElementById('cv_khachHang');
  const cvKhSearch = document.getElementById('cv_khSearch');
  const cvModel = document.getElementById('cv_model');

  if (cvKh) cvKh.value = val;
  if (cvKhSearch) cvKhSearch.value = val;
  if (cvModel) cvModel.value = val.split('@')[1]?.trim() || '';
  closeKHDrop();
}

export function setTG(val) {
  setTgSelected(val);
  const tgSang = document.getElementById('tgSang');
  const tgChieu = document.getElementById('tgChieu');
  if (tgSang) tgSang.classList.toggle('active', val === 'SÁNG');
  if (tgChieu) tgChieu.classList.toggle('active', val === 'CHIỀU');
}

export function openCVModal(idx) {
  S.editIdx = idx;
  const title = document.getElementById('mCVTitle');
  if (title) title.textContent = idx >= 0 ? 'Sửa công việc' : 'Thêm công việc';

  const khSearch = document.getElementById('cv_khSearch');
  const khachHang = document.getElementById('cv_khachHang');
  const model = document.getElementById('cv_model');
  const soLuong = document.getElementById('cv_soLuong');
  const counter = document.getElementById('cv_counter');
  const ghiChu = document.getElementById('cv_ghiChu');

  if (khSearch) khSearch.value = '';
  if (khachHang) khachHang.value = '';
  if (model) model.value = '';
  if (soLuong) soLuong.value = 1;
  if (counter) counter.value = 0;
  if (ghiChu) ghiChu.value = '';

  setTG('SÁNG');
  populateAllDropdowns();

  ['cv_loaiViec', 'cv_ketQua'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.value = '';
      el.classList.add('empty');
    }
  });

  if (idx >= 0) {
    const cv = S.tmpCV[idx];
    if (cv.khachHang) {
      if (khSearch) khSearch.value = cv.khachHang;
      if (khachHang) khachHang.value = cv.khachHang;
      if (model) model.value = cv.model || cv.khachHang.split('@')[1]?.trim() || '';
    }
    if (cv.loaiViec) {
      const el = document.getElementById('cv_loaiViec');
      if (el) {
        el.value = cv.loaiViec;
        el.classList.remove('empty');
      }
    }
    if (cv.ketQua) {
      const el = document.getElementById('cv_ketQua');
      if (el) {
        el.value = cv.ketQua;
        el.classList.remove('empty');
      }
    }
    setTG(cv.thoiGian || 'SÁNG');
    if (soLuong) soLuong.value = cv.soLuong || 1;
    if (counter) counter.value = cv.counter || 0;
    if (ghiChu) ghiChu.value = cv.ghiChu || '';
  }
  const modal = document.getElementById('modalCV');
  if (modal) modal.classList.add('open');
}

export function closeMCV() {
  const modal = document.getElementById('modalCV');
  if (modal) modal.classList.remove('open');
}

export function adjCtr(id, d) {
  const el = document.getElementById(id);
  if (!el) return;
  const min = id === 'cv_counter' ? 0 : 1;
  el.value = Math.max(min, (parseInt(el.value) || 0) + d);
}

export function confirmCV() {
  const kh = document.getElementById('cv_khachHang').value.trim();
  const lv = document.getElementById('cv_loaiViec').value;
  const kq = document.getElementById('cv_ketQua').value;

  if (!kh) { toast('Chọn khách hàng', 'err'); return; }
  if (!lv) { toast('Chọn loại công việc', 'err'); return; }
  if (!tgSelected) { toast('Chọn thời gian', 'err'); return; }
  if (!kq) { toast('Chọn kết quả', 'err'); return; }

  const modelVal = document.getElementById('cv_model').value.trim();
  const soLuongVal = parseInt(document.getElementById('cv_soLuong').value) || 1;
  const counterVal = parseInt(document.getElementById('cv_counter').value) || 0;
  const ghiChuVal = document.getElementById('cv_ghiChu').value.trim();

  const cv = {
    khachHang: kh,
    loaiViec: lv,
    model: modelVal,
    thoiGian: tgSelected,
    soLuong: soLuongVal,
    counter: counterVal,
    ketQua: kq,
    ghiChu: ghiChuVal
  };

  if (S.editIdx >= 0) {
    S.tmpCV[S.editIdx] = cv;
  } else {
    S.tmpCV.push(cv);
  }
  closeMCV();
  renderCVList();
}

export function renderCVList() {
  const listEl = document.getElementById('cvList');
  if (!listEl) return;
  listEl.innerHTML = S.tmpCV.map((cv, i) => `
    <div class="cvi">
      <div class="cvi-hd">
        <div>
          <div class="cvi-title">${cv.khachHang.split('@')[0].trim()}</div>
          <div class="cvi-meta">${cv.loaiViec}${cv.model ? ' · ' + cv.model : ''}</div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="cvi-del" style="background:var(--pl);color:var(--p)" onclick="openCVModal(${i})">✏</button>
          <button class="cvi-del" onclick="delCV(${i})">✕</button>
        </div>
      </div>
      <div class="cv-tags">
        <span class="tag ${cv.thoiGian === 'SÁNG' ? 't0' : 'tg'}" style="${cv.thoiGian === 'CHIỀU' ? 'background:#ede9fe;color:#7c3aed' : ''}">${cv.thoiGian}</span>
        <span class="tag tg">${cv.soLuong}x</span>
        ${cv.counter ? `<span class="tag tg">📠 ${cv.counter}</span>` : ''}
        <span class="tag ${cv.ketQua === 'Hoàn thành' ? 't2' : ''}">${cv.ketQua}</span>
        ${cv.ghiChu ? `<span class="tag tg">📝 ${cv.ghiChu}</span>` : ''}
      </div>
    </div>`).join('');
}

export function delCV(i) {
  S.tmpCV.splice(i, 1);
  renderCVList();
}

// Bind to window for HTML inline event listeners
window.openKHDrop = openKHDrop;
window.closeKHDrop = closeKHDrop;
window.filterKH = filterKH;
window.selectKH = selectKH;
window.setTG = setTG;
window.openCVModal = openCVModal;
window.closeMCV = closeMCV;
window.adjCtr = adjCtr;
window.confirmCV = confirmCV;
window.delCV = delCV;
