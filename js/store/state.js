import { ADMIN_NAME, BOSS_NAME } from '../config.js';

export const ROLE_KTV = 'ktv';
export const ROLE_ADMIN = 'admin';
export const ROLE_BOSS = 'boss';

export const TB_KTV = 'bcn_danh_sach_ktv';
export const TB_DM  = 'bcn_danh_muc';
export const TB_BCN = 'bcn_bao_cao_ngay';
export const TB_CV  = 'bcn_chi_tiet_cong_viec';
export const TB_CFG = 'bcn_cau_hinh_he_thong';

export const DM_MAP = { cv_loaiViec: 'LoaiViec', cv_ketQua: 'KetQua' };

export const IS_ADMIN = n => n.toLowerCase() === ADMIN_NAME.toLowerCase();
export const IS_BOSS  = n => n.toLowerCase() === BOSS_NAME.toLowerCase();

export function getRole(n) {
  if (IS_ADMIN(n)) return ROLE_ADMIN;
  if (IS_BOSS(n))  return ROLE_BOSS;
  return ROLE_KTV;
}

export const S = {
  user: '',
  userPinHash: '',
  role: ROLE_KTV,
  isAdmin: false,
  isBoss: false,
  records: [],
  ktvList: [],
  danhMuc: {},
  ngayLe: [],
  secCfg: { maxAttempts: 5, lockMinutes: 5 },
  tmpCV: [],
  editIdx: -1,
  tabMode: 'all',
  adTabMode: 'all',
  adKtvFilter: 'all',
  editingBCNId: null,
  crossResults: [],
  isCrossSearch: false,
};

export let sb = null;

export function setSupabaseClient(client) {
  sb = client;
}

export let tgSelected = 'SÁNG';

export function setTgSelected(val) {
  tgSelected = val;
}
