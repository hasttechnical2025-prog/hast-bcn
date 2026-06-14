import { S } from '../store/state.js';
import { normDate, fmtStr } from '../utils/date.js';

export function printBCN(id) {
  const r = S.records.find(x => x.id === id) || S.crossResults.find(x => x.id === id);
  if (!r) return;

  const printArea = document.getElementById('printArea');
  if (!printArea) return;

  const dateObj = new Date(normDate(r.ngay) + 'T00:00:00');
  const dDay = String(dateObj.getDate()).padStart(2, '0');
  const dMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dYear = dateObj.getFullYear();

  let rowsHtml = '';
  const maxRows = 12;
  const listLen = r.chiTiet ? r.chiTiet.length : 0;

  if (listLen > 0) {
    rowsHtml = r.chiTiet.map((cv, idx) => `<tr>
      <td class="c">${idx + 1}</td>
      <td class="c"><b>${cv.thoiGian || ''}</b></td>
      <td class="l">${(cv.khachHang || '-').split('@')[0].trim()}</td>
      <td class="c">${cv.model || ''}</td>
      <td>${cv.loaiViec || ''}</td>
      <td class="c">${cv.ketQua || ''}</td>
      <td>${cv.ghiChu || ''}</td>
    </tr>`).join('');
  }

  for (let i = 0; i < maxRows - listLen; i++) {
    rowsHtml += `<tr>
      <td class="c" style="height:35px;color:#fff">${listLen + i + 1}</td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
    </tr>`;
  }

  printArea.innerHTML = `
    <div class="p-header">
      <div class="p-logo"><img src="./logo.png" style="width:100%;height:auto;display:block;object-fit:contain"></div>
      <div class="p-contact">Website: http://www.sieuthanh.com.vn<br>Tel: (84-24) 38223888<br>Trụ sở: 5 Nguyễn Ngọc Vũ, Phường Trung Hòa, Quận Cầu Giấy, Hà Nội</div>
    </div>
    <div class="p-line"></div>
    <div class="p-dept">PHÒNG KỸ THUẬT</div>
    <div class="p-title">BÁO CÁO NHÂN VIÊN</div>
    <table class="p-info">
      <tr>
        <td style="width:60px;font-weight:bold;padding-left:0">Ngày:</td>
        <td style="width:180px">${fmtStr(normDate(r.ngay))}</td>
        <td style="width:100px;font-weight:bold">Phòng:</td>
        <td>Kỹ thuật</td>
      </tr>
      <tr>
        <td style="font-weight:bold;padding-left:0">Họ tên:</td>
        <td style="font-weight:bold">${r.ktv || ''}</td>
        <td></td>
        <td></td>
      </tr>
    </table>
    <table class="p-table">
      <thead>
        <tr>
          <th style="width:5%">TT</th>
          <th style="width:12%">Thời gian</th>
          <th style="width:35%">Khách hàng</th>
          <th style="width:15%">Model</th>
          <th style="width:13%">Nội dung công việc</th>
          <th style="width:10%">Kết quả</th>
          <th style="width:10%">Ghi chú</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <div class="p-sign">
      <div class="p-sign-box">
        <div class="p-date">Siêu Thanh, ngày ${dDay} tháng ${dMonth} năm ${dYear}</div>
        <div class="p-sign-title">NGƯỜI BÁO CÁO</div>
        <div class="p-sign-name">${r.ktv || ''}</div>
      </div>
    </div>`;

  setTimeout(() => window.print(), 300);
}

window.printBCN = printBCN;
