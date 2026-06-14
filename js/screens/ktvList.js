import { S, sb, TB_CV, TB_BCN } from '../store/state.js';
import { toast, emptyH } from '../utils/ui.js';
import { normDate, fmtStr } from '../utils/date.js';
import { bcnHTML, filterRecs, showScreen } from '../main.js';
import { printBCN } from '../components/print.js';

export function setTab(tab, el) {
  S.tabMode = tab;
  document.querySelectorAll('#screen-list .chip').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  renderKTVList();
}

export function detectCrossKeyword(q) {
  if (!q) return null;
  const ql = q.trim();
  if (ql.length >= 3) return ql;
  return null;
}

export async function searchCrossKtv(keyword) {
  try {
    const { data, error } = await sb
      .from(TB_CV)
      .select(`
        bcn_id,
        khachHang:khach_hang,
        loaiViec:loai_viec,
        model,
        thoiGian:thoi_gian,
        soLuong:so_luong,
        counter,
        ketQua:ket_qua,
        ghiChu:ghi_chu,
        bcn:${TB_BCN}(id, so:so_bcn, ngay, ktv)
      `)
      .ilike('khach_hang', '%' + keyword + '%');

    if (error) throw error;

    const bcnMap = {};
    data.forEach(cv => {
      const b = cv.bcn;
      if (!b) return;
      if (!bcnMap[b.id]) {
        bcnMap[b.id] = {
          id: b.id,
          so: b.so,
          ngay: normDate(b.ngay),
          ktv: b.ktv,
          chiTiet: []
        };
      }
      bcnMap[b.id].chiTiet.push({
        khachHang: cv.khachHang,
        loaiViec: cv.loaiViec,
        model: cv.model,
        thoiGian: cv.thoiGian,
        soLuong: cv.soLuong,
        counter: cv.counter,
        ketQua: cv.ketQua,
        ghiChu: cv.ghiChu
      });
    });

    return Object.values(bcnMap).sort((a, b) => normDate(b.ngay).localeCompare(normDate(a.ngay)));
  } catch (e) {
    toast('Lỗi tìm kiếm: ' + e.message, 'err');
    return [];
  }
}

export async function renderKTVList() {
  const q = (document.getElementById('searchInp')?.value || '').trim();
  const keyword = detectCrossKeyword(q);
  const crossBanner = document.getElementById('crossSearchBanner');
  const bcnList = document.getElementById('bcnList');

  if (!bcnList) return;

  if (keyword) {
    if (crossBanner) {
      crossBanner.style.display = 'flex';
      crossBanner.className = 'cross-search-banner';
      crossBanner.innerHTML = `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg><span>Lịch sử hệ thống chứa từ khóa <b>"${keyword}"</b> — toàn bộ KTV</span>`;
    }

    S.crossResults = await searchCrossKtv(keyword);
    S.isCrossSearch = true;

    if (!S.crossResults.length) {
      bcnList.innerHTML = emptyH('Không tìm thấy lịch sử', 'Khách hàng này chưa có báo cáo nào');
      return;
    }

    bcnList.innerHTML = S.crossResults.map(r => {
      const total = (r.chiTiet || []).length;
      const done = (r.chiTiet || []).filter(c => c.ketQua === 'Hoàn thành').length;
      const isMine = r.ktv === S.user;
      return `<div class="bcn-item" onclick="viewCrossBCN('${r.id}')">
        <div class="bcn-ico teal">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
            <rect x="9" y="3" width="6" height="4" rx="2"/><path d="M9 12h6M9 16h4"/>
          </svg>
        </div>
        <div class="bcn-inf">
          <div class="bcn-so">${r.so} ${isMine ? '<span style="font-size:10px;color:var(--ok)">● Của bạn</span>' : ''}</div>
          <div class="bcn-meta">${fmtStr(r.ngay)} · <b>${r.ktv}</b> · ${total} CV</div>
        </div>
        <span class="badge ${done === total && total > 0 ? 'ok' : ''}">${done}/${total}</span>
      </div>`;
    }).join('');

  } else {
    S.isCrossSearch = false;
    S.crossResults = [];
    if (crossBanner) crossBanner.style.display = 'none';
    const myRecs = filterRecs(S.records.filter(r => r.ktv === S.user), S.tabMode, q);
    bcnList.innerHTML = myRecs.length
      ? myRecs.map(r => bcnHTML(r, 'detail')).join('')
      : emptyH('Không có kết quả', 'Nhập từ khóa từ 3 ký tự để tìm kiếm lịch sử toàn bộ hệ thống');
  }
}

export function viewCrossBCN(id) {
  const r = S.crossResults.find(x => x.id === id);
  if (!r) return;

  const isMine = r.ktv === S.user;
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

  const html = `
    <div class="dh teal">
      <div class="dh-so">${r.so} ${isMine ? '· Của bạn' : ''}</div>
      <div class="dh-date">${fmtStr(r.ngay)}</div>
      <div class="dh-ktv">KTV: ${r.ktv}</div>
    </div>
    <div class="card">
      <div class="ct"><span class="ct-dot" style="background:#0f766e"></span>Chi tiết công việc (${(r.chiTiet || []).length})</div>
      ${rows || '<div style="color:var(--t3);text-align:center;padding:16px">Không có dữ liệu</div>'}
    </div>
    <div class="btn-row">
      <button class="btn btn-s" onclick="showScreen('list')">← Quay lại</button>
      ${isMine ? `<button class="btn btn-ok" onclick="printBCN('${r.id}')">🖨️ Xuất PDF</button>` : ''}
    </div>`;

  const container = document.getElementById('crossDetailContent');
  if (container) container.innerHTML = html;
  showScreen('cross-detail');
}

// Bind to window for HTML inline event listeners
window.setTab = setTab;
window.viewCrossBCN = viewCrossBCN;
window.renderKTVList = renderKTVList;
