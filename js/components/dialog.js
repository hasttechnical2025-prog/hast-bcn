let _cdlgResolve = null;

export function showConfirm({ title = 'Xác nhận', msg = '', icon = '⚠️', iconType = 'warn', okText = 'Đồng ý', cancelText = 'Hủy', okDanger = false }) {
  return new Promise(resolve => {
    _cdlgResolve = resolve;
    const tTitle = document.getElementById('cdlgTitle');
    const tMsg = document.getElementById('cdlgMsg');
    const tIcon = document.getElementById('cdlgIcon');
    const btnCancel = document.getElementById('cdlgCancelBtn');
    const btnOk = document.getElementById('cdlgOkBtn');
    const over = document.getElementById('cdlgOver');

    if (tTitle) tTitle.textContent = title;
    if (tMsg) tMsg.textContent = msg;
    if (tIcon) {
      tIcon.textContent = icon;
      tIcon.className = 'cdlg-icon ' + iconType;
    }
    if (btnCancel) btnCancel.textContent = cancelText;
    if (btnOk) {
      btnOk.textContent = okText;
      btnOk.className = 'btn cdlg-ok ' + (okDanger ? 'danger' : iconType === 'warn' ? 'warn' : '');
    }
    if (over) over.classList.add('open');
  });
}

export function cdlgResolve(val) {
  const over = document.getElementById('cdlgOver');
  if (over) over.classList.remove('open');
  if (_cdlgResolve) {
    _cdlgResolve(val);
    _cdlgResolve = null;
  }
}

export function setupDialogListeners() {
  const over = document.getElementById('cdlgOver');
  if (over) {
    over.addEventListener('click', e => {
      if (e.target === over) cdlgResolve(false);
    });
  }
}

// Bind to window for HTML inline event listeners
window.cdlgResolve = cdlgResolve;
