import { S } from '../store/state.js';
import { filterRecs, bcnHTML } from '../main.js';
import { emptyH } from '../utils/ui.js';

export function setAdTab(tab, el) {
  S.adTabMode = tab;
  document.querySelectorAll('#screen-admin-list .chip-grp .chip').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  renderAdminList();
}

export function setKtvFilter(ktv, el) {
  S.adKtvFilter = ktv;
  renderAdminList();
}

export function renderAdminList() {
  const ktvs = [...new Set(S.records.map(r => r.ktv))].filter(Boolean);
  const ktvFilterChips = document.getElementById('ktvFilterChips');
  if (ktvFilterChips) {
    ktvFilterChips.innerHTML =
      `<div class="chip ${S.adKtvFilter === 'all' ? 'active' : ''}" onclick="setKtvFilter('all', this)" style="${S.adKtvFilter === 'all' ? 'background:#7c3aed;color:#fff;border-color:#7c3aed' : ''}">Tất cả KTV</div>` +
      ktvs.map(k => `<div class="chip ${S.adKtvFilter === k ? 'active' : ''}" onclick="setKtvFilter('${k}', this)" style="${S.adKtvFilter === k ? 'background:#7c3aed;color:#fff;border-color:#7c3aed' : ''}">${k}</div>`).join('');
  }

  let recs = S.adKtvFilter === 'all' ? S.records : S.records.filter(r => r.ktv === S.adKtvFilter);
  const adSearchInp = document.getElementById('adSearchInp');
  recs = filterRecs(recs, S.adTabMode, adSearchInp ? adSearchInp.value : '');

  const adBcnList = document.getElementById('adBcnList');
  if (adBcnList) {
    adBcnList.innerHTML = recs.length
      ? recs.map(r => bcnHTML(r, 'admin-detail', true)).join('')
      : emptyH('Không có kết quả', 'Thử thay đổi bộ lọc');
  }
}

// Bind to window for HTML inline event listeners
window.setAdTab = setAdTab;
window.setKtvFilter = setKtvFilter;
window.renderAdminList = renderAdminList;

let adSearchTimeout = null;
export function debounceSearchAdmin() {
  clearTimeout(adSearchTimeout);
  adSearchTimeout = setTimeout(() => renderAdminList(), 400);
}
window.debounceSearchAdmin = debounceSearchAdmin;

let ktvSearchTimeout = null;
export function debounceSearchKTV() {
  // debounceSearchKTV is used in ktvList screen, but since it's an inline bound event,
  // we can resolve it by importing renderKTVList dynamically or placing it here.
  // Wait, let's put it in ktvList.js. I'll add it there later if needed, or define it here.
}
