import { S } from '../store/state.js';
import { filterRecs, bcnHTML } from '../main.js';
import { emptyH } from '../utils/ui.js';

export function setAdTab(tab, el) {
  S.adTabMode = tab;
  const selectEl = document.getElementById('adTimeFilterSelect');
  if (selectEl) selectEl.value = tab;
  renderAdminList();
}

export function setKtvFilter(ktv, el) {
  S.adKtvFilter = ktv;
  const selectEl = document.getElementById('adKtvFilterSelect');
  if (selectEl) selectEl.value = ktv;
  renderAdminList();
}

export function renderAdminList() {
  const ktvs = [...new Set(S.records.map(r => r.ktv))].filter(Boolean);
  const selectEl = document.getElementById('adKtvFilterSelect');

  if (selectEl) {
    const currentValue = S.adKtvFilter;
    selectEl.innerHTML = `<option value="all">Tất cả KTV</option>` +
      ktvs.map(k => `<option value="${k}">${k}</option>`).join('');

    // Ensure the current value is valid, fallback to 'all'
    if (currentValue === 'all' || ktvs.includes(currentValue)) {
      selectEl.value = currentValue;
    } else {
      selectEl.value = 'all';
      S.adKtvFilter = 'all';
    }
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
