import { SUPABASE_URL, SUPABASE_KEY } from '../config.js';
import { S, sb, setSupabaseClient, TB_KTV, TB_DM, TB_BCN, TB_CV, TB_CFG, ROLE_ADMIN, ROLE_BOSS } from '../store/state.js';
import { encodeHeader } from '../utils/crypto.js';
import { normDate, nowTime } from '../utils/date.js';
import { toast } from '../utils/ui.js';

// Screen updates (imported dynamically or directly, circular runs are fine since they are called deferred)
import { populateLoginKTV } from '../screens/auth.js';
import { populateAllDropdowns } from '../components/modal.js';
import { renderSettingsKTV, renderAdminDmPanel } from '../screens/settings.js';
import { refreshAdminDash } from '../screens/adminDash.js';
import { renderAdminList } from '../screens/adminList.js';
import { refreshBossDash } from '../screens/bossDash.js';
import { refreshHome } from '../screens/home.js';
import { renderKTVList } from '../screens/ktvList.js';

export function initSupabase(user = '', pinHash = '') {
  const options = { auth: { persistSession: false } };
  if (user && pinHash) {
    options.global = {
      headers: {
        'x-ktv-user': encodeHeader(user),
        'x-ktv-pin': pinHash
      }
    };
  }
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, options);
  setSupabaseClient(client);
}

export function setSpin(on) {
  const btn = document.getElementById('syncBtn');
  if (btn) btn.classList.toggle('spinning', on);
}

export function showBanner(type, msg) {
  const icons = {
    ok: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>',
    err: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>',
    warn: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>'
  };
  const ids = S.role === ROLE_ADMIN ? ['adminSyncBanner'] : S.role === ROLE_BOSS ? ['bossSyncBanner'] : ['syncBanner'];
  ids.forEach(id => {
    const b = document.getElementById(id);
    if (!b) return;
    b.style.display = 'flex';
    b.className = 'sync-banner sb-' + type;
    b.innerHTML = (icons[type] || '') + '<span>' + msg + '</span>';
  });
}

export async function syncAll(silent = false) {
  if (!sb) return;
  setSpin(true);
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

    const { data: cfg, error: eConfig } = await sb.from(TB_CFG).select('key,value');
    if (!eConfig && cfg) {
      const m = {};
      cfg.forEach(c => m[c.key] = c.value);
      S.secCfg = {
        maxAttempts: parseInt(m['max_failed_attempts'] || 5),
        lockMinutes: parseInt(m['lockout_duration_minutes'] || 5),
        closingDate: m['closing_date'] || ''
      };
    }

    populateLoginKTV();
    populateAllDropdowns();

    if (S.isAdmin) {
      renderSettingsKTV();
      renderAdminDmPanel();
    }

    let q = sb.from(TB_BCN).select(`id,so:so_bcn,ngay,ktv,created_at,chiTiet:${TB_CV}(khachHang:khach_hang,loaiViec:loai_viec,model,thoiGian:thoi_gian,soLuong:so_luong,counter,ketQua:ket_qua,ghiChu:ghi_chu)`).order('ngay', { ascending: false });
    if (!(S.isAdmin || S.isBoss)) {
      q = q.eq('ktv', S.user);
    }
    const { data: recs, error: e3 } = await q;
    if (e3) throw e3;
    S.records = recs.map(r => ({ id: r.id, so: r.so, ngay: normDate(r.ngay), ktv: r.ktv, chiTiet: r.chiTiet || [], createdAt: r.created_at }));

    if (!silent) {
      showBanner('ok', '✓ Đồng bộ lúc ' + nowTime());
      toast('Đồng bộ thành công', 'ok2');
    }
  } catch (e) {
    if (!silent) showBanner('err', '✕ Lỗi: ' + e.message);
  } finally {
    setSpin(false);
  }
}

export async function manualSync() {
  await syncAll(false);
  if (S.isAdmin) {
    refreshAdminDash();
    renderAdminList();
  } else if (S.isBoss) {
    refreshBossDash();
  } else {
    refreshHome();
    renderKTVList();
  }
}
