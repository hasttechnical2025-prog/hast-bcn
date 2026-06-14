export function toast(msg, type = '') {
  const t = document.getElementById('toast');
  if (!t) return;
  const icons = { ok2: '✓ ', err: '✕ ', '': '' };
  t.textContent = (icons[type] || '') + msg;
  t.className = 'toast show ' + type;
  setTimeout(() => t.classList.remove('show'), 2800);
}

export function showLD(m = 'Đang xử lý...') {
  const txt = document.getElementById('ldtxt');
  const ov = document.getElementById('ldov');
  if (txt) txt.textContent = m;
  if (ov) ov.classList.add('show');
}

export function hideLD() {
  const ov = document.getElementById('ldov');
  if (ov) ov.classList.remove('show');
}

export function emptyH(h, p) {
  return `<div class="empty">
    <svg viewBox="0 0 24 24" stroke-width="1.5">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="2"/>
    </svg>
    <h3>${h}</h3>
    ${p ? `<p>${p}</p>` : ''}
  </div>`;
}
