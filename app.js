/**
 * 美和科技大學收發室信件登記系統
 * 系統作者：魏啟軒
 * 主色調：孔雀綠 (Peacock Green)
 */

// LocalStorage 儲存鍵名
const STORAGE_KEY = 'meiho_mailroom_records_v1';

// 系統狀態
let records = [];

// DOM 元素快取
const dom = {
  // 時鐘
  clockDisplay: document.getElementById('clockDisplay'),
  // 統計卡片
  statTodayCount: document.getElementById('statTodayCount'),
  statPendingCount: document.getElementById('statPendingCount'),
  statReceivedCount: document.getElementById('statReceivedCount'),
  statTotalCount: document.getElementById('statTotalCount'),
  // 登記表單
  form: document.getElementById('mailRegisterForm'),
  trackingNo: document.getElementById('trackingNo'),
  mailType: document.getElementById('mailType'),
  handlerSelect: document.getElementById('handlerSelect'),
  handlerOtherGroup: document.getElementById('handlerOtherGroup'),
  handlerOther: document.getElementById('handlerOther'),
  sender: document.getElementById('sender'),
  recipient: document.getElementById('recipient'),
  department: document.getElementById('department'),
  remark: document.getElementById('remark'),
  btnReset: document.getElementById('btnReset'),
  // 篩選工具
  searchInput: document.getElementById('searchInput'),
  filterType: document.getElementById('filterType'),
  filterStatus: document.getElementById('filterStatus'),
  filterDate: document.getElementById('filterDate'),
  btnOpenSummaryModal: document.getElementById('btnOpenSummaryModal'),
  btnOpenSignSheetModal: document.getElementById('btnOpenSignSheetModal'),
  btnExportCsv: document.getElementById('btnExportCsv'),
  btnBackupJson: document.getElementById('btnBackupJson'),
  btnRestoreJson: document.getElementById('btnRestoreJson'),
  backupFileInput: document.getElementById('backupFileInput'),
  btnPrint: document.getElementById('btnPrint'),
  // 清單表格
  mailTableBody: document.getElementById('mailTableBody'),
  emptyState: document.getElementById('emptyState'),
  btnLoadSample: document.getElementById('btnLoadSample'),
  recordCountInfo: document.getElementById('recordCountInfo'),
  // 編輯 Modal
  editModal: document.getElementById('editModal'),
  editForm: document.getElementById('editForm'),
  editRecordId: document.getElementById('editRecordId'),
  editTrackingNo: document.getElementById('editTrackingNo'),
  editMailType: document.getElementById('editMailType'),
  editHandlerSelect: document.getElementById('editHandlerSelect'),
  editHandlerOtherGroup: document.getElementById('editHandlerOtherGroup'),
  editHandlerOther: document.getElementById('editHandlerOther'),
  editSender: document.getElementById('editSender'),
  editRecipient: document.getElementById('editRecipient'),
  editDepartment: document.getElementById('editDepartment'),
  editRemark: document.getElementById('editRemark'),
  radioStatusPending: document.getElementById('radioStatusPending'),
  radioStatusReceived: document.getElementById('radioStatusReceived'),
  editReceivedInfoGroup: document.getElementById('editReceivedInfoGroup'),
  editReceivedSigner: document.getElementById('editReceivedSigner'),
  btnModalClose: document.getElementById('btnModalClose'),
  btnModalCancel: document.getElementById('btnModalCancel'),
  // 簽收 Modal
  quickSignModal: document.getElementById('quickSignModal'),
  quickSignForm: document.getElementById('quickSignForm'),
  signRecordId: document.getElementById('signRecordId'),
  signSummaryNo: document.getElementById('signSummaryNo'),
  signSummaryRecipient: document.getElementById('signSummaryRecipient'),
  signSummaryDept: document.getElementById('signSummaryDept'),
  signerInput: document.getElementById('signerInput'),
  btnSignClose: document.getElementById('btnSignClose'),
  btnSignCancel: document.getElementById('btnSignCancel'),
  // 還原 Modal
  restoreModal: document.getElementById('restoreModal'),
  restoreSummaryTime: document.getElementById('restoreSummaryTime'),
  restoreSummaryCount: document.getElementById('restoreSummaryCount'),
  restoreSummaryCurrent: document.getElementById('restoreSummaryCurrent'),
  btnRestoreClose: document.getElementById('btnRestoreClose'),
  btnRestoreCancel: document.getElementById('btnRestoreCancel'),
  btnRestoreConfirm: document.getElementById('btnRestoreConfirm'),
  // 收件摘要 Modal
  summaryModal: document.getElementById('summaryModal'),
  btnSummaryClose: document.getElementById('btnSummaryClose'),
  btnSummaryCancel: document.getElementById('btnSummaryCancel'),
  summaryDateFilter: document.getElementById('summaryDateFilter'),
  summaryCustomDateGroup: document.getElementById('summaryCustomDateGroup'),
  summaryCustomDate: document.getElementById('summaryCustomDate'),
  summaryStatusFilter: document.getElementById('summaryStatusFilter'),
  summarySortOrder: document.getElementById('summarySortOrder'),
  summaryRecordsCountTag: document.getElementById('summaryRecordsCountTag'),
  summaryCanvas: document.getElementById('summaryCanvas'),
  btnDownloadSummaryImage: document.getElementById('btnDownloadSummaryImage'),
  btnCopySummaryImage: document.getElementById('btnCopySummaryImage'),
  optSummaryToday: document.getElementById('optSummaryToday'),
  optSummaryYesterday: document.getElementById('optSummaryYesterday'),
  // 簽收表 Modal
  signSheetModal: document.getElementById('signSheetModal'),
  btnSignSheetClose: document.getElementById('btnSignSheetClose'),
  btnSignSheetCancel: document.getElementById('btnSignSheetCancel'),
  signSheetDateFilter: document.getElementById('signSheetDateFilter'),
  signSheetCustomDateGroup: document.getElementById('signSheetCustomDateGroup'),
  signSheetCustomDate: document.getElementById('signSheetCustomDate'),
  signSheetStatusFilter: document.getElementById('signSheetStatusFilter'),
  signSheetSortOrder: document.getElementById('signSheetSortOrder'),
  signSheetRowHeight: document.getElementById('signSheetRowHeight'),
  signSheetCountTag: document.getElementById('signSheetCountTag'),
  a4PaperPreview: document.getElementById('a4PaperPreview'),
  btnDoPrintSignSheet: document.getElementById('btnDoPrintSignSheet'),
  optSignSheetToday: document.getElementById('optSignSheetToday'),
  optSignSheetYesterday: document.getElementById('optSignSheetYesterday'),
  // Toast
  toast: document.getElementById('systemToast'),
  toastMessage: document.getElementById('toastMessage')
};

// 初始化載入
document.addEventListener('DOMContentLoaded', () => {
  initClock();
  loadRecords();
  bindEvents();
  renderTable();
  updateStats();
});

// 時鐘功能
function initClock() {
  const updateTime = () => {
    const now = new Date();
    const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const dayStr = days[now.getDay()];
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');

    if (dom.clockDisplay) {
      dom.clockDisplay.innerHTML = `
        <span class="clock-date">${yyyy}年${mm}月${dd}日 (${dayStr})</span>
        <span class="clock-time">${hh}:${min}:${ss}</span>
      `;
    }
  };
  updateTime();
  setInterval(updateTime, 1000);
}

// 格式化當前時間字串: YYYY-MM-DD HH:mm:ss
function formatCurrentDateTime(dateObj = new Date()) {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const hh = String(dateObj.getHours()).padStart(2, '0');
  const min = String(dateObj.getMinutes()).padStart(2, '0');
  const ss = String(dateObj.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

// 讀取 LocalStorage 資料
function loadRecords() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      records = JSON.parse(data);
    } else {
      records = [];
    }
  } catch (err) {
    console.error('讀取資料失敗：', err);
    records = [];
  }
}

// 寫入 LocalStorage
function saveRecords() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.error('儲存資料失敗：', err);
    showToast('儲存失敗，請確認瀏覽器儲存空間！', 'error');
  }
}

// 綁定事件監聽
function bindEvents() {
  // 經手人下拉連動手動輸入 (登記表單)
  dom.handlerSelect.addEventListener('change', (e) => {
    if (e.target.value === '其他') {
      dom.handlerOtherGroup.style.display = 'flex';
      dom.handlerOther.required = true;
      dom.handlerOther.focus();
    } else {
      dom.handlerOtherGroup.style.display = 'none';
      dom.handlerOther.required = false;
    }
  });

  // 登記表單送出
  dom.form.addEventListener('submit', handleRegisterSubmit);

  // 清除重填
  dom.btnReset.addEventListener('click', () => {
    dom.form.reset();
    dom.handlerOtherGroup.style.display = 'none';
    dom.handlerOther.required = false;
    dom.trackingNo.focus();
  });

  // 搜尋與篩選事件
  dom.searchInput.addEventListener('input', renderTable);
  dom.filterType.addEventListener('change', renderTable);
  dom.filterStatus.addEventListener('change', renderTable);
  dom.filterDate.addEventListener('change', renderTable);

  // 匯出 CSV
  dom.btnExportCsv.addEventListener('click', exportToCsv);

  // 儲存收件摘要按鈕
  dom.btnOpenSummaryModal.addEventListener('click', openSummaryModal);
  dom.btnSummaryClose.addEventListener('click', closeSummaryModal);
  dom.btnSummaryCancel.addEventListener('click', closeSummaryModal);
  dom.summaryDateFilter.addEventListener('change', onSummaryDateFilterChange);
  dom.summaryCustomDate.addEventListener('input', renderSummaryCanvas);
  dom.summaryStatusFilter.addEventListener('change', renderSummaryCanvas);
  dom.summarySortOrder.addEventListener('change', renderSummaryCanvas);
  dom.btnDownloadSummaryImage.addEventListener('click', downloadSummaryImage);
  dom.btnCopySummaryImage.addEventListener('click', copySummaryImage);

  // 生成簽收表按鈕
  dom.btnOpenSignSheetModal.addEventListener('click', openSignSheetModal);
  dom.btnSignSheetClose.addEventListener('click', closeSignSheetModal);
  dom.btnSignSheetCancel.addEventListener('click', closeSignSheetModal);
  dom.signSheetDateFilter.addEventListener('change', onSignSheetDateFilterChange);
  dom.signSheetCustomDate.addEventListener('input', renderSignSheetPreview);
  dom.signSheetStatusFilter.addEventListener('change', renderSignSheetPreview);
  dom.signSheetSortOrder.addEventListener('change', renderSignSheetPreview);
  dom.signSheetRowHeight.addEventListener('change', renderSignSheetPreview);
  dom.btnDoPrintSignSheet.addEventListener('click', doPrintSignSheet);

  // 完整系統備份 (.json)
  dom.btnBackupJson.addEventListener('click', exportBackupJson);

  // 還原備份
  dom.btnRestoreJson.addEventListener('click', () => {
    dom.backupFileInput.click();
  });
  dom.backupFileInput.addEventListener('change', handleBackupFileSelect);

  // 還原 Modal 事件
  dom.btnRestoreClose.addEventListener('click', closeRestoreModal);
  dom.btnRestoreCancel.addEventListener('click', closeRestoreModal);
  dom.btnRestoreConfirm.addEventListener('click', executeRestore);

  // 列印清冊
  dom.btnPrint.addEventListener('click', () => {
    window.print();
  });

  // 示範資料載入按鈕
  dom.btnLoadSample.addEventListener('click', loadSampleData);

  // 編輯 Modal 經手人下拉連動
  dom.editHandlerSelect.addEventListener('change', (e) => {
    if (e.target.value === '其他') {
      dom.editHandlerOtherGroup.style.display = 'flex';
      dom.editHandlerOther.required = true;
      dom.editHandlerOther.focus();
    } else {
      dom.editHandlerOtherGroup.style.display = 'none';
      dom.editHandlerOther.required = false;
    }
  });

  // 編輯 Modal 狀態切換連動
  document.querySelectorAll('input[name="editStatusRadio"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'RECEIVED') {
        dom.editReceivedInfoGroup.style.display = 'flex';
      } else {
        dom.editReceivedInfoGroup.style.display = 'none';
      }
    });
  });

  // 關閉 Modal 按鈕
  dom.btnModalClose.addEventListener('click', closeEditModal);
  dom.btnModalCancel.addEventListener('click', closeEditModal);

  // 編輯表單儲存
  dom.editForm.addEventListener('submit', handleEditSave);

  // 簽收 Modal 關閉
  dom.btnSignClose.addEventListener('click', closeQuickSignModal);
  dom.btnSignCancel.addEventListener('click', closeQuickSignModal);

  // 簽收表單送出
  dom.quickSignForm.addEventListener('submit', handleSignConfirm);

  // 條碼掃描槍支援：在編號輸入框按下 Enter 且非空白時，若已有其他欄位可自動跳到下個欄位
  dom.trackingNo.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (dom.trackingNo.value.trim() && !dom.recipient.value.trim()) {
        e.preventDefault();
        dom.sender.focus();
      }
    }
  });
}

// 處理登記送出
function handleRegisterSubmit(e) {
  e.preventDefault();

  const trackingNo = dom.trackingNo.value.trim();
  const mailType = dom.mailType.value;
  let handler = dom.handlerSelect.value;
  if (handler === '其他') {
    handler = dom.handlerOther.value.trim() || '其他經手人';
  }
  const sender = dom.sender.value.trim();
  const recipient = dom.recipient.value.trim();
  const department = dom.department.value.trim();
  const remark = dom.remark.value.trim();

  if (!trackingNo || !sender || !recipient || !department) {
    showToast('請務必填寫所有必填欄位！', 'error');
    return;
  }

  // 建立新資料物件
  const newRecord = {
    id: 'MAIL_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    trackingNo: trackingNo,
    mailType: mailType,
    sender: sender,
    recipient: recipient,
    department: department,
    handler: handler,
    remark: remark,
    createdAt: formatCurrentDateTime(), // 建立日期和時間
    status: 'PENDING',                  // PENDING (待領取) | RECEIVED (已領取)
    receivedAt: null,
    receivedSigner: ''
  };

  // 新紀錄排在最前
  records.unshift(newRecord);
  saveRecords();
  renderTable();
  updateStats();

  // 清空表單並將焦點重新移至編號，方便連續登記
  dom.form.reset();
  dom.handlerOtherGroup.style.display = 'none';
  dom.handlerOther.required = false;
  dom.trackingNo.focus();

  showToast(`✅ 已成功登記：【${recipient}】的${mailType}`, 'success');
}

// 篩選紀錄
function getFilteredRecords() {
  const searchTerm = dom.searchInput.value.trim().toLowerCase();
  const selectedType = dom.filterType.value;
  const selectedStatus = dom.filterStatus.value;
  const selectedDate = dom.filterDate.value;

  const todayStr = formatCurrentDateTime().slice(0, 10);
  const now = new Date();

  return records.filter(item => {
    // 關鍵字搜尋 (編號、收件人、寄件人、單位、經手人、領取人)
    if (searchTerm) {
      const matchSearch =
        (item.trackingNo && item.trackingNo.toLowerCase().includes(searchTerm)) ||
        (item.recipient && item.recipient.toLowerCase().includes(searchTerm)) ||
        (item.department && item.department.toLowerCase().includes(searchTerm)) ||
        (item.sender && item.sender.toLowerCase().includes(searchTerm)) ||
        (item.handler && item.handler.toLowerCase().includes(searchTerm)) ||
        (item.receivedSigner && item.receivedSigner.toLowerCase().includes(searchTerm));

      if (!matchSearch) return false;
    }

    // 郵件類型過濾
    if (selectedType !== 'ALL' && item.mailType !== selectedType) {
      return false;
    }

    // 狀態過濾
    if (selectedStatus !== 'ALL' && item.status !== selectedStatus) {
      return false;
    }

    // 日期過濾
    if (selectedDate !== 'ALL' && item.createdAt) {
      const recordDateStr = item.createdAt.slice(0, 10);
      if (selectedDate === 'TODAY') {
        if (recordDateStr !== todayStr) return false;
      } else if (selectedDate === 'WEEK') {
        const itemDate = new Date(recordDateStr);
        const diffDays = (now - itemDate) / (1000 * 60 * 60 * 24);
        if (diffDays > 7) return false;
      } else if (selectedDate === 'MONTH') {
        const itemDate = new Date(recordDateStr);
        const diffDays = (now - itemDate) / (1000 * 60 * 60 * 24);
        if (diffDays > 30) return false;
      }
    }

    return true;
  });
}

// 渲染清單表格
function renderTable() {
  const filtered = getFilteredRecords();
  dom.mailTableBody.innerHTML = '';

  if (filtered.length === 0) {
    dom.emptyState.style.display = 'block';
    dom.recordCountInfo.textContent = '顯示 0 筆紀錄';
    return;
  }

  dom.emptyState.style.display = 'none';
  dom.recordCountInfo.textContent = `顯示 ${filtered.length} 筆紀錄 (共 ${records.length} 筆歷史紀錄)`;

  const fragment = document.createDocumentFragment();

  filtered.forEach((item, index) => {
    const tr = document.createElement('tr');

    // 狀態 Badge
    const isReceived = item.status === 'RECEIVED';
    const statusHtml = isReceived
      ? `<span class="badge badge-received" title="簽收人: ${escapeHtml(item.receivedSigner || item.recipient)} | 簽收時間: ${escapeHtml(item.receivedAt || '')}">🟢 已領取</span>`
      : `<span class="badge badge-pending">🔴 待領取</span>`;

    // 領取人欄位：若已領取則帶入領取人姓名，若尚未領取則留空
    const receiverText = isReceived ? escapeHtml(item.receivedSigner || item.recipient || '') : '';

    // 簽收/領取按鈕或狀態切換
    const actionSignBtn = isReceived
      ? `<button type="button" class="btn-action-edit" onclick="revertSignStatus('${item.id}')" title="還原為待領取狀態">取消簽收</button>`
      : `<button type="button" class="btn-action-sign" onclick="openQuickSignModal('${item.id}')">🖊️ 簽收領取</button>`;

    // 修改按鈕 (保留修改按鈕，不設刪除按鈕)
    const actionEditBtn = `<button type="button" class="btn-action-edit" onclick="openEditModal('${item.id}')">✏️ 修改</button>`;

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${statusHtml}</td>
      <td class="cell-tracking">${escapeHtml(item.trackingNo)}</td>
      <td><span class="badge-mail-type">${escapeHtml(item.mailType || '掛號函件')}</span></td>
      <td class="cell-recipient">${escapeHtml(item.recipient)}</td>
      <td class="cell-dept">${escapeHtml(item.department)}</td>
      <td>${escapeHtml(item.sender)}</td>
      <td>${receiverText}</td>
      <td class="cell-date">${escapeHtml(item.createdAt)}</td>
      <td class="cell-actions">
        ${actionSignBtn}
        ${actionEditBtn}
      </td>
    `;

    fragment.appendChild(tr);
  });

  dom.mailTableBody.appendChild(fragment);
}

// 更新統計卡片數字
function updateStats() {
  const todayStr = formatCurrentDateTime().slice(0, 10);

  const todayCount = records.filter(r => r.createdAt && r.createdAt.startsWith(todayStr)).length;
  const pendingCount = records.filter(r => r.status === 'PENDING').length;
  const receivedCount = records.filter(r => r.status === 'RECEIVED').length;
  const totalCount = records.length;

  dom.statTodayCount.textContent = todayCount;
  dom.statPendingCount.textContent = pendingCount;
  dom.statReceivedCount.textContent = receivedCount;
  dom.statTotalCount.textContent = totalCount;
}

// 開啟快速簽收 Modal
window.openQuickSignModal = function(id) {
  const record = records.find(r => r.id === id);
  if (!record) return;

  dom.signRecordId.value = record.id;
  dom.signSummaryNo.textContent = record.trackingNo;
  dom.signSummaryRecipient.textContent = record.recipient;
  dom.signSummaryDept.textContent = record.department;
  // 預設簽收人為本人
  dom.signerInput.value = record.recipient;

  dom.quickSignModal.style.display = 'flex';
  dom.signerInput.focus();
  dom.signerInput.select();
};

function closeQuickSignModal() {
  dom.quickSignModal.style.display = 'none';
}

function handleSignConfirm(e) {
  e.preventDefault();
  const id = dom.signRecordId.value;
  const signer = dom.signerInput.value.trim() || '本人';

  const record = records.find(r => r.id === id);
  if (record) {
    record.status = 'RECEIVED';
    record.receivedAt = formatCurrentDateTime();
    record.receivedSigner = signer;

    saveRecords();
    renderTable();
    updateStats();
    closeQuickSignModal();
    showToast(`✅ 已完成簽收：【${record.recipient}】 (簽收人: ${signer})`, 'success');
  }
}

// 取消簽收狀態（復原為待領取）
window.revertSignStatus = function(id) {
  const record = records.find(r => r.id === id);
  if (!record) return;

  if (confirm(`確定要將【${record.recipient}】的郵件還原為「待領取」狀態嗎？`)) {
    record.status = 'PENDING';
    record.receivedAt = null;
    record.receivedSigner = '';

    saveRecords();
    renderTable();
    updateStats();
    showToast(`已將【${record.recipient}】的狀態還原為待領取`, 'info');
  }
};

// 開啟修改 Modal
window.openEditModal = function(id) {
  const record = records.find(r => r.id === id);
  if (!record) return;

  dom.editRecordId.value = record.id;
  dom.editTrackingNo.value = record.trackingNo;
  dom.editMailType.value = record.mailType || '掛號函件';

  // 經手人設定
  const defaultHandlers = ['陳銘鴻', '魏啟軒'];
  if (defaultHandlers.includes(record.handler)) {
    dom.editHandlerSelect.value = record.handler;
    dom.editHandlerOtherGroup.style.display = 'none';
    dom.editHandlerOther.required = false;
    dom.editHandlerOther.value = '';
  } else {
    dom.editHandlerSelect.value = '其他';
    dom.editHandlerOtherGroup.style.display = 'flex';
    dom.editHandlerOther.required = true;
    dom.editHandlerOther.value = record.handler;
  }

  dom.editSender.value = record.sender;
  dom.editRecipient.value = record.recipient;
  dom.editDepartment.value = record.department;
  dom.editRemark.value = record.remark || '';

  // 狀態
  if (record.status === 'RECEIVED') {
    dom.radioStatusReceived.checked = true;
    dom.editReceivedInfoGroup.style.display = 'flex';
    dom.editReceivedSigner.value = record.receivedSigner || record.recipient;
  } else {
    dom.radioStatusPending.checked = true;
    dom.editReceivedInfoGroup.style.display = 'none';
    dom.editReceivedSigner.value = '';
  }

  dom.editModal.style.display = 'flex';
};

function closeEditModal() {
  dom.editModal.style.display = 'none';
}

function handleEditSave(e) {
  e.preventDefault();
  const id = dom.editRecordId.value;
  const record = records.find(r => r.id === id);
  if (!record) return;

  const trackingNo = dom.editTrackingNo.value.trim();
  const mailType = dom.editMailType.value;
  let handler = dom.editHandlerSelect.value;
  if (handler === '其他') {
    handler = dom.editHandlerOther.value.trim() || '其他經手人';
  }
  const sender = dom.editSender.value.trim();
  const recipient = dom.editRecipient.value.trim();
  const department = dom.editDepartment.value.trim();
  const remark = dom.editRemark.value.trim();

  const isReceived = document.querySelector('input[name="editStatusRadio"]:checked').value === 'RECEIVED';
  const receivedSigner = dom.editReceivedSigner.value.trim();

  // 更新紀錄
  record.trackingNo = trackingNo;
  record.mailType = mailType;
  record.handler = handler;
  record.sender = sender;
  record.recipient = recipient;
  record.department = department;
  record.remark = remark;

  if (isReceived) {
    if (record.status !== 'RECEIVED') {
      record.receivedAt = formatCurrentDateTime();
    }
    record.status = 'RECEIVED';
    record.receivedSigner = receivedSigner || recipient;
  } else {
    record.status = 'PENDING';
    record.receivedAt = null;
    record.receivedSigner = '';
  }

  saveRecords();
  renderTable();
  updateStats();
  closeEditModal();
  showToast('💾 資料修改已儲存！', 'success');
}

// 匯出 CSV 檔 (加 UTF-8 BOM 避免 Excel 亂碼)
function exportToCsv() {
  const filtered = getFilteredRecords();
  if (filtered.length === 0) {
    showToast('目前沒有可匯出的紀錄！', 'info');
    return;
  }

  const headers = [
    '序號',
    '狀態',
    '掛號函件/包裹編號',
    '郵件類型',
    '收件人',
    '收件人所屬單位',
    '寄件人',
    '郵件經手人',
    '資料建立日期和時間',
    '簽收人',
    '簽收時間',
    '備註'
  ];

  const csvRows = [];
  csvRows.push(headers.map(cleanCsvField).join(','));

  filtered.forEach((r, idx) => {
    const statusText = r.status === 'RECEIVED' ? '已領取' : '待領取';
    const row = [
      idx + 1,
      statusText,
      r.trackingNo || '',
      r.mailType || '',
      r.recipient || '',
      r.department || '',
      r.sender || '',
      r.handler || '',
      r.createdAt || '',
      r.receivedSigner || '',
      r.receivedAt || '',
      r.remark || ''
    ];
    csvRows.push(row.map(cleanCsvField).join(','));
  });

  const csvContent = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement('a');
  const dateStr = formatCurrentDateTime().slice(0, 10);
  downloadLink.href = url;
  downloadLink.download = `美和科技大學收發室信件登記清冊_${dateStr}.csv`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(url);

  showToast('📥 郵件清冊 CSV 檔案已順利匯出！', 'success');
}

// 暫存待還原的資料
let pendingRestoreData = null;

// 匯出完整系統備份 (.json)
function exportBackupJson() {
  if (records.length === 0) {
    if (!confirm('目前系統內尚無任何登記紀錄，確定要匯出空的備份檔嗎？')) {
      return;
    }
  }

  const backupPayload = {
    system: "美和科技大學收發室信件登記系統",
    author: "魏啟軒",
    version: "1.0",
    backupTime: formatCurrentDateTime(),
    totalRecords: records.length,
    records: records
  };

  const jsonStr = JSON.stringify(backupPayload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement('a');
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  downloadLink.href = url;
  downloadLink.download = `美和科技大學收發室_系統完整備份_${dateStr}.json`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(url);

  showToast(`💾 系統完整備份檔已成功匯出 (共 ${records.length} 筆)！請妥善保存於電腦中。`, 'success');
}

// 選擇備份檔案並解析
function handleBackupFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const content = evt.target.result;
      const parsed = JSON.parse(content);

      let restoreRecords = [];
      let backupTime = '未知時間';

      if (parsed && Array.isArray(parsed.records)) {
        restoreRecords = parsed.records;
        backupTime = parsed.backupTime || '系統備份檔';
      } else if (Array.isArray(parsed)) {
        restoreRecords = parsed;
        backupTime = '自訂紀錄清單';
      } else {
        throw new Error('不符合規範的備份檔案格式');
      }

      // 驗證紀錄是否有基本欄位
      const isValid = restoreRecords.every(r => r && (r.trackingNo || r.recipient));
      if (!isValid && restoreRecords.length > 0) {
        throw new Error('備份檔案中缺乏有效之信件登記欄位');
      }

      pendingRestoreData = {
        records: restoreRecords,
        backupTime: backupTime
      };

      // 顯示還原對話框
      dom.restoreSummaryTime.textContent = backupTime;
      dom.restoreSummaryCount.textContent = restoreRecords.length;
      dom.restoreSummaryCurrent.textContent = records.length;
      dom.restoreModal.style.display = 'flex';

    } catch (err) {
      console.error('解析備份檔案失敗：', err);
      showToast('❌ 無法讀取該備份檔：檔案格式錯誤或損毀！', 'error');
    } finally {
      // 清空 input 讓同一個檔案也能重複觸發 change
      dom.backupFileInput.value = '';
    }
  };

  reader.onerror = function() {
    showToast('讀取檔案失敗，請重新嘗試！', 'error');
    dom.backupFileInput.value = '';
  };

  reader.readAsText(file);
}

function closeRestoreModal() {
  dom.restoreModal.style.display = 'none';
  pendingRestoreData = null;
}

// 執行還原
function executeRestore() {
  if (!pendingRestoreData || !Array.isArray(pendingRestoreData.records)) {
    closeRestoreModal();
    return;
  }

  const mode = document.querySelector('input[name="restoreMode"]:checked').value;
  const newRecords = pendingRestoreData.records;

  if (mode === 'replace') {
    // 完全覆蓋
    records = [...newRecords];
    showToast(`✅ 資料還原完成！已由備份檔完全取代（共 ${records.length} 筆）。`, 'success');
  } else {
    // 與現有資料合併 (以 ID 或 編號+建立時間 進行去重複)
    const existingIds = new Set(records.map(r => r.id));
    const existingKeys = new Set(records.map(r => `${r.trackingNo}_${r.createdAt}`));
    let addedCount = 0;

    newRecords.forEach(item => {
      const itemKey = `${item.trackingNo}_${item.createdAt}`;
      if (!existingIds.has(item.id) && !existingKeys.has(itemKey)) {
        records.push(item);
        if (item.id) existingIds.add(item.id);
        existingKeys.add(itemKey);
        addedCount++;
      }
    });

    // 依建立時間降冪排序 (最新的在最前)
    records.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    showToast(`✅ 合併還原成功！新增了 ${addedCount} 筆備份紀錄，目前共 ${records.length} 筆。`, 'success');
  }

  saveRecords();
  renderTable();
  updateStats();
  closeRestoreModal();
}

function cleanCsvField(val) {
  if (val === null || val === undefined) return '""';
  const stringVal = String(val).replace(/"/g, '""');
  return `"${stringVal}"`;
}

// 載入示範測試資料
function loadSampleData() {
  const sampleNow = new Date();
  const timeMinusMins = (mins) => {
    return formatCurrentDateTime(new Date(sampleNow.getTime() - mins * 60000));
  };

  const sampleList = [
    {
      id: 'SAMPLE_1',
      trackingNo: '9820012345',
      mailType: '掛號函件',
      sender: '教育部高等教育司',
      recipient: '校長室 秘書',
      department: '校長室',
      handler: '魏啟軒',
      remark: '公文專件',
      createdAt: timeMinusMins(25),
      status: 'PENDING',
      receivedAt: null,
      receivedSigner: ''
    },
    {
      id: 'SAMPLE_2',
      trackingNo: '9820023456',
      mailType: '掛號包裹',
      sender: '屏東縣衛生局',
      recipient: '李主任',
      department: '護理系',
      handler: '陳銘鴻',
      remark: '教學實驗器材',
      createdAt: timeMinusMins(60),
      status: 'PENDING',
      receivedAt: null,
      receivedSigner: ''
    },
    {
      id: 'SAMPLE_3',
      trackingNo: 'EE123456789TW',
      mailType: '國際函件',
      sender: '日本東京大學醫學院',
      recipient: '陳教授',
      department: '醫學檢驗生物技術系',
      handler: '魏啟軒',
      remark: '學術論文審查原件',
      createdAt: timeMinusMins(140),
      status: 'RECEIVED',
      receivedAt: timeMinusMins(20),
      receivedSigner: '陳教授 本人'
    },
    {
      id: 'SAMPLE_4',
      trackingNo: '9820034567',
      mailType: '限時掛號函件',
      sender: '考選部',
      recipient: '註冊組組長',
      department: '教務處',
      handler: '陳銘鴻',
      remark: '重要考試通知',
      createdAt: timeMinusMins(180),
      status: 'PENDING',
      receivedAt: null,
      receivedSigner: ''
    },
    {
      id: 'SAMPLE_5',
      trackingNo: 'CP987654321JP',
      mailType: '國際包裹',
      sender: 'Amazon Japan',
      recipient: '張組長',
      department: '總務處保管組',
      handler: '魏啟軒',
      remark: '採購圖書資料',
      createdAt: timeMinusMins(300),
      status: 'RECEIVED',
      receivedAt: timeMinusMins(90),
      receivedSigner: '林助理代領'
    },
    {
      id: 'SAMPLE_6',
      trackingNo: '719200388910',
      mailType: '快遞包裹',
      sender: '黑貓宅急便 (三民書局)',
      recipient: '王教授',
      department: '幼兒保育系',
      handler: '陳銘鴻',
      remark: '教材樣書',
      createdAt: timeMinusMins(15),
      status: 'PENDING',
      receivedAt: null,
      receivedSigner: ''
    }
  ];

  records = sampleList.concat(records);
  saveRecords();
  renderTable();
  updateStats();
  showToast('已成功匯入 6 筆示範測試紀錄！', 'success');
}

// 簡易 Toast 提示訊息
let toastTimer = null;
function showToast(message, type = 'info') {
  if (toastTimer) clearTimeout(toastTimer);

  dom.toastMessage.textContent = message;
  dom.toast.className = 'toast show';
  if (type === 'success') {
    dom.toast.classList.add('toast-success');
  } else if (type === 'error') {
    dom.toast.classList.add('toast-error');
  } else {
    dom.toast.classList.add('toast-info');
  }

  toastTimer = setTimeout(() => {
    dom.toast.className = 'toast';
  }, 3200);
}

// 安全字串跳脫，防止 XSS
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ==========================================
// 儲存收件摘要圖片功能 (Canvas 繪製與匯出)
// 包含欄位：收件人姓名、收件人單位、郵件類型
// ==========================================

function formatDateChinese(dateObj) {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  return `${yyyy}年${mm}月${dd}日`;
}

function formatDateIso(dateObj) {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function openSummaryModal() {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);

  if (dom.optSummaryToday) {
    dom.optSummaryToday.textContent = `僅今天 (${formatDateChinese(now)})`;
  }
  if (dom.optSummaryYesterday) {
    dom.optSummaryYesterday.textContent = `昨天 (${formatDateChinese(yesterday)})`;
  }

  dom.summaryDateFilter.value = 'TODAY';
  dom.summaryCustomDateGroup.style.display = 'none';
  dom.summaryCustomDate.value = formatDateIso(now);
  dom.summaryStatusFilter.value = 'PENDING';
  if (dom.summarySortOrder) {
    dom.summarySortOrder.value = 'ASC';
  }

  dom.summaryModal.style.display = 'flex';
  renderSummaryCanvas();
}

function closeSummaryModal() {
  dom.summaryModal.style.display = 'none';
}

function onSummaryDateFilterChange() {
  if (dom.summaryDateFilter.value === 'CUSTOM') {
    dom.summaryCustomDateGroup.style.display = 'flex';
  } else {
    dom.summaryCustomDateGroup.style.display = 'none';
  }
  renderSummaryCanvas();
}

function getSummaryData() {
  const dateMode = dom.summaryDateFilter.value;
  const statusMode = dom.summaryStatusFilter.value;
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);

  let targetDatePrefix = '';
  let dateDisplay = '';
  let dateSlug = '';

  if (dateMode === 'TODAY') {
    targetDatePrefix = formatDateIso(now);
    dateDisplay = formatDateChinese(now);
    dateSlug = targetDatePrefix;
  } else if (dateMode === 'YESTERDAY') {
    targetDatePrefix = formatDateIso(yesterday);
    dateDisplay = formatDateChinese(yesterday);
    dateSlug = targetDatePrefix;
  } else if (dateMode === 'CUSTOM') {
    const val = dom.summaryCustomDate.value;
    if (val) {
      targetDatePrefix = val;
      const parts = val.split('-');
      dateDisplay = `${parts[0]}年${parts[1]}月${parts[2]}日`;
      dateSlug = val;
    } else {
      targetDatePrefix = formatDateIso(now);
      dateDisplay = formatDateChinese(now);
      dateSlug = targetDatePrefix;
    }
  } else {
    dateDisplay = '歷史全期間紀錄';
    dateSlug = '全期間';
  }

  const filtered = records.filter(item => {
    // 日期過濾
    if (targetDatePrefix) {
      if (!item.createdAt || !item.createdAt.startsWith(targetDatePrefix)) {
        return false;
      }
    }
    // 狀態過濾
    if (statusMode === 'PENDING') {
      if (item.status !== 'PENDING') return false;
    }
    return true;
  });

  // 按照當日資料建立日期和時間排序 (預設由早到晚，舊至新)
  const sortOrder = dom.summarySortOrder ? dom.summarySortOrder.value : 'ASC';
  filtered.sort((a, b) => {
    const timeA = a.createdAt || '';
    const timeB = b.createdAt || '';
    return sortOrder === 'DESC' ? timeB.localeCompare(timeA) : timeA.localeCompare(timeB);
  });

  return {
    items: filtered,
    dateDisplay: dateDisplay,
    dateSlug: dateSlug,
    statusText: statusMode === 'PENDING' ? '待領取郵件' : '全部郵件'
  };
}

function renderSummaryCanvas() {
  const summary = getSummaryData();
  const items = summary.items;
  if (dom.summaryRecordsCountTag) {
    dom.summaryRecordsCountTag.textContent = `符合 ${items.length} 筆`;
  }

  const canvas = dom.summaryCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // ==========================================
  // 計算當天 / 篩選郵件中之多數經手人 (製表人)
  // ==========================================
  const handlerCounts = {};
  items.forEach(item => {
    const h = (item.handler || '').trim();
    if (h) {
      handlerCounts[h] = (handlerCounts[h] || 0) + 1;
    }
  });

  // 若當前篩選項目為 0 筆，從該日期全體登記郵件中尋找
  if (Object.keys(handlerCounts).length === 0) {
    const targetDatePrefix = summary.dateSlug && summary.dateSlug.length === 10 ? summary.dateSlug : '';
    records.forEach(item => {
      if (targetDatePrefix && item.createdAt && item.createdAt.startsWith(targetDatePrefix)) {
        const h = (item.handler || '').trim();
        if (h) handlerCounts[h] = (handlerCounts[h] || 0) + 1;
      }
    });
  }

  // 找出人數最多之經手人
  let dominantHandler = '魏啟軒'; // 預設
  let maxCount = -1;
  for (const [name, count] of Object.entries(handlerCounts)) {
    if (count > maxCount) {
      maxCount = count;
      dominantHandler = name;
    }
  }

  // ==========================================
  // 依收件人資料筆數動態縮放圖片高度與比例
  // ==========================================
  const logicalWidth = 920;
  const headerHeight = 155;
  const tableHeaderHeight = 52;
  const rowHeight = 52;
  const footerHeight = 60;
  const rowsCount = items.length > 0 ? items.length : 1;
  const logicalHeight = headerHeight + tableHeaderHeight + (rowsCount * rowHeight) + footerHeight;

  // 2x Retina 縮放提高清晰度
  const dpr = 2;
  canvas.width = logicalWidth * dpr;
  canvas.height = logicalHeight * dpr;
  canvas.style.width = '100%';
  canvas.style.maxWidth = `${logicalWidth}px`;
  canvas.style.height = 'auto';

  ctx.scale(dpr, dpr);

  // 1. 全畫布底色 (白色)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, logicalWidth, logicalHeight);

  // 2. 頂部 Header 孔雀綠漸層 (Height 155px)
  const gradient = ctx.createLinearGradient(0, 0, logicalWidth, headerHeight);
  gradient.addColorStop(0, '#006d77');
  gradient.addColorStop(1, '#0a4d53');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, logicalWidth, headerHeight);

  // 孔雀綠點綴亮線
  ctx.fillStyle = '#14b8a6';
  ctx.fillRect(0, headerHeight - 4, logicalWidth, 4);

  // 系統標題
  ctx.font = 'bold 28px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.fillText('美和科技大學收發室 信件 / 包裹收件摘要', 36, 54);

  // 篩選與日期資訊
  ctx.font = '500 18px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
  ctx.fillStyle = '#ccfbf1';
  ctx.fillText(`📅 收件日期：${summary.dateDisplay}　｜　類別狀態：${summary.statusText}　｜　總計：${items.length} 筆`, 36, 96);

  // 提醒備註
  ctx.font = '400 15px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
  ctx.fillStyle = '#a7f3d0';
  ctx.fillText('🔔 敬請以下名單之師生同仁於上班時間攜帶證件或印章至收發室簽收領取。', 36, 132);

  // 3. 表格標頭 (Height 52px, y = 155)
  const thY = headerHeight;
  ctx.fillStyle = '#f0fdfa';
  ctx.fillRect(0, thY, logicalWidth, tableHeaderHeight);

  ctx.fillStyle = '#b2e2dd';
  ctx.fillRect(0, thY + tableHeaderHeight - 1, logicalWidth, 1);

  // 3 大欄位 X 座標設定
  const col1X = 50;  // 收件人姓名
  const col2X = 330; // 收件人單位
  const col3X = 680; // 郵件類型

  ctx.font = 'bold 18px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
  ctx.fillStyle = '#006d77';
  ctx.textAlign = 'left';
  ctx.fillText('收件人姓名', col1X, thY + 34);
  ctx.fillText('收件人單位', col2X, thY + 34);
  ctx.fillText('郵件類型', col3X, thY + 34);

  // 4. 資料列繪製 (依項目高度動態向下延伸，確保每列清晰可見)
  let currentY = thY + tableHeaderHeight;

  if (items.length === 0) {
    // 無資料提示
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, currentY, logicalWidth, rowHeight);
    ctx.font = '500 17px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.fillText('📌 本日（指定篩選條件）尚無信件或包裹登記紀錄', logicalWidth / 2, currentY + 32);
    currentY += rowHeight;
  } else {
    items.forEach((item, index) => {
      // 斑馬紋交替底色
      ctx.fillStyle = index % 2 === 0 ? '#ffffff' : '#f8fafc';
      ctx.fillRect(0, currentY, logicalWidth, rowHeight);

      // 分隔底線
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, currentY + rowHeight - 1, logicalWidth, 1);

      // 欄位 1: 收件人姓名 (粗體黑字)
      ctx.font = 'bold 19px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'left';
      ctx.fillText(item.recipient || '--', col1X, currentY + 33);

      // 欄位 2: 收件人單位 (深灰字)
      ctx.font = '500 18px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
      ctx.fillStyle = '#334155';
      ctx.fillText(item.department || '--', col2X, currentY + 33);

      // 欄位 3: 郵件類型 (帶有優雅孔雀綠圓角標籤)
      const badgeText = item.mailType || '一般掛號';
      const badgeWidth = Math.max(92, ctx.measureText(badgeText).width + 24);
      const badgeHeight = 30;
      const badgeX = col3X;
      const badgeY = currentY + 11;

      // 繪製圓角標籤底色
      ctx.fillStyle = '#e6f7f5';
      drawRoundedRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 6);
      ctx.fill();
      ctx.strokeStyle = '#83c5be';
      ctx.lineWidth = 1;
      drawRoundedRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 6);
      ctx.stroke();

      // 標籤文字
      ctx.font = '600 15px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
      ctx.fillStyle = '#006d77';
      ctx.textAlign = 'center';
      ctx.fillText(badgeText, badgeX + badgeWidth / 2, badgeY + 21);

      currentY += rowHeight;
    });
  }

  // 5. 表格頁尾 Footer
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, currentY, logicalWidth, footerHeight);

  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(0, currentY, logicalWidth, 1);

  // 製表人動態顯示：若當天經手人魏啟軒居多就顯示"製表人：魏啟軒"，依此類推
  ctx.font = 'bold 16px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
  ctx.fillStyle = '#1e293b';
  ctx.textAlign = 'left';
  ctx.fillText(`美和科技大學收發室　製表人：${dominantHandler}`, 36, currentY + 36);

  ctx.font = '500 14px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'right';
  ctx.fillText(`產製時間：${formatCurrentDateTime().slice(0, 16)}`, logicalWidth - 36, currentY + 36);
}

// 輔助繪製圓角矩形
function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// 下載摘要圖片 PNG
function downloadSummaryImage() {
  const canvas = dom.summaryCanvas;
  if (!canvas) return;

  const summary = getSummaryData();
  const fileName = `美和科技大學_收件摘要_${summary.dateSlug}.png`;

  const link = document.createElement('a');
  link.download = fileName;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast(`🖼️ 收件摘要圖片已成功儲存為：${fileName}`, 'success');
}

// 複製摘要圖片到剪貼簿
function copySummaryImage() {
  const canvas = dom.summaryCanvas;
  if (!canvas) return;

  if (!navigator.clipboard || !window.ClipboardItem) {
    showToast('您的瀏覽器不支援直接複製圖片，請直接點選「下載圖片」！', 'error');
    return;
  }

  canvas.toBlob((blob) => {
    if (!blob) {
      showToast('圖片產生失敗，請重試！', 'error');
      return;
    }
    navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ]).then(() => {
      showToast('📋 收件摘要圖片已成功複製至剪貼簿！可直接於 LINE 或 Word 中貼上 (Ctrl+V)。', 'success');
    }).catch(err => {
      console.error('複製圖片失敗：', err);
      showToast('複製圖片失敗，請直接點選「下載圖片」儲存！', 'info');
    });
  }, 'image/png');
}

// ==========================================
// 生成簽收表功能 (直式 A4 簽收清冊與預覽列印)
// 欄位依序：郵件類型 -> 寄件人 -> 收件人 -> 收件人單位 -> 編號 (流水序號) -> 簽名欄
// ==========================================

function openSignSheetModal() {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);

  if (dom.optSignSheetToday) {
    dom.optSignSheetToday.textContent = `僅今天 (${formatDateChinese(now)})`;
  }
  if (dom.optSignSheetYesterday) {
    dom.optSignSheetYesterday.textContent = `昨天 (${formatDateChinese(yesterday)})`;
  }

  dom.signSheetDateFilter.value = 'TODAY';
  dom.signSheetCustomDateGroup.style.display = 'none';
  dom.signSheetCustomDate.value = formatDateIso(now);
  dom.signSheetStatusFilter.value = 'PENDING';
  if (dom.signSheetSortOrder) {
    dom.signSheetSortOrder.value = 'ASC';
  }
  dom.signSheetRowHeight.value = 'spacious';

  dom.signSheetModal.style.display = 'flex';
  renderSignSheetPreview();
}

function closeSignSheetModal() {
  dom.signSheetModal.style.display = 'none';
  document.body.classList.remove('printing-a4-sign-sheet');
}

function onSignSheetDateFilterChange() {
  if (dom.signSheetDateFilter.value === 'CUSTOM') {
    dom.signSheetCustomDateGroup.style.display = 'flex';
  } else {
    dom.signSheetCustomDateGroup.style.display = 'none';
  }
  renderSignSheetPreview();
}

function getSignSheetData() {
  const dateMode = dom.signSheetDateFilter.value;
  const statusMode = dom.signSheetStatusFilter.value;
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);

  let targetDatePrefix = '';
  let dateDisplay = '';

  if (dateMode === 'TODAY') {
    targetDatePrefix = formatDateIso(now);
    dateDisplay = formatDateChinese(now);
  } else if (dateMode === 'YESTERDAY') {
    targetDatePrefix = formatDateIso(yesterday);
    dateDisplay = formatDateChinese(yesterday);
  } else if (dateMode === 'CUSTOM') {
    const val = dom.signSheetCustomDate.value;
    if (val) {
      targetDatePrefix = val;
      const parts = val.split('-');
      dateDisplay = `${parts[0]}年${parts[1]}月${parts[2]}日`;
    } else {
      targetDatePrefix = formatDateIso(now);
      dateDisplay = formatDateChinese(now);
    }
  } else {
    dateDisplay = '歷史全期間';
  }

  const filtered = records.filter(item => {
    // 日期過濾
    if (targetDatePrefix) {
      if (!item.createdAt || !item.createdAt.startsWith(targetDatePrefix)) {
        return false;
      }
    }
    // 狀態過濾
    if (statusMode === 'PENDING') {
      if (item.status !== 'PENDING') return false;
    }
    return true;
  });

  // 嚴格依資料建立日期和時間排序 (預設由早到晚，符合簽收表登記順序)
  const sortOrder = dom.signSheetSortOrder ? dom.signSheetSortOrder.value : 'ASC';
  filtered.sort((a, b) => {
    const timeA = a.createdAt || '';
    const timeB = b.createdAt || '';
    return sortOrder === 'DESC' ? timeB.localeCompare(timeA) : timeA.localeCompare(timeB);
  });

  return {
    items: filtered,
    dateDisplay: dateDisplay,
    statusText: statusMode === 'PENDING' ? '待領取信件/包裹 (現場親筆簽名)' : '全部信件/包裹 (含已簽收備查)'
  };
}

function renderSignSheetPreview() {
  const sheetData = getSignSheetData();
  const items = sheetData.items;
  const rowHeightClass = 'row-' + (dom.signSheetRowHeight.value || 'spacious');

  if (dom.signSheetCountTag) {
    dom.signSheetCountTag.textContent = `符合 ${items.length} 筆`;
  }

  const container = dom.a4PaperPreview;
  if (!container) return;

  // 計算多數經手人
  const handlerCounts = {};
  items.forEach(item => {
    const h = (item.handler || '').trim();
    if (h) handlerCounts[h] = (handlerCounts[h] || 0) + 1;
  });
  let dominantHandler = '魏啟軒';
  let maxCount = -1;
  for (const [name, count] of Object.entries(handlerCounts)) {
    if (count > maxCount) {
      maxCount = count;
      dominantHandler = name;
    }
  }

  // 產生表格列 HTML (欄位順序：郵件類型 -> 寄件人 -> 收件人 -> 收件人單位 -> 編號 -> 簽名欄)
  let tableRowsHtml = '';

  if (items.length === 0) {
    tableRowsHtml = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px 10px; color: #64748b; font-size: 15px;">
          📌 本日（指定篩選條件）尚無待領取之信件或包裹
        </td>
      </tr>
    `;
  } else {
    items.forEach((item, index) => {
      // 簽收欄內容：若已領取，顯示輕微簽收註記；若待領取，完全留白提供舒適簽名
      let signCellContent = '';
      if (item.status === 'RECEIVED') {
        signCellContent = `<div style="font-size: 11px; color: #059669; font-weight: bold; line-height: 1.2;">[已簽收]<br>${escapeHtml(item.receivedSigner || item.recipient)}<br><span style="font-size: 10px; color: #6b7280; font-family: monospace;">${escapeHtml((item.receivedAt || '').slice(11, 16))}</span></div>`;
      }

      // 編號：依資料建立時間的登記先後（最早 = 1），不隨升降冪切換而改變
      const seqNo = (dom.signSheetSortOrder && dom.signSheetSortOrder.value === 'DESC')
        ? items.length - index
        : index + 1;

      tableRowsHtml += `
        <tr class="${rowHeightClass}">
          <td style="font-size: 12.5px; text-align: center;">${escapeHtml(item.mailType || '')}</td>
          <td style="font-size: 12.5px;">${escapeHtml(item.sender)}</td>
          <td class="col-recipient">${escapeHtml(item.recipient)}</td>
          <td style="font-size: 12.5px;">${escapeHtml(item.department)}</td>
          <td class="col-tracking" style="font-size: 13px; text-align: center;">${seqNo}</td>
          <td class="col-sign">${signCellContent}</td>
        </tr>
      `;
    });
  }

  const sortLabel = (dom.signSheetSortOrder && dom.signSheetSortOrder.value === 'DESC') ? '依建立時間 (晚至早)' : '依建立時間 (由早至晚)';

  container.innerHTML = `
    <div class="sign-sheet-title">美和科技大學收發室　信件與包裹簽收清冊</div>
    <div class="sign-sheet-subtitle">（直式 A4 行政留存專用簽收表）</div>
    <div class="sign-sheet-meta">
      <span>📅 簽收日期：${sheetData.dateDisplay}</span>
      <span>排序：${sortLabel}</span>
      <span>類別：${sheetData.statusText}</span>
      <span>總計：${items.length} 件</span>
    </div>

    <table class="sign-sheet-table">
      <thead>
        <tr>
          <th style="width: 13%;">郵件類型</th>
          <th style="width: 18%;">寄件人</th>
          <th style="width: 14%;">收件人</th>
          <th style="width: 17%;">收件人單位</th>
          <th style="width: 8%;">編號</th>
          <th style="width: 30%;">簽名欄</th>
        </tr>
      </thead>
      <tbody>
        ${tableRowsHtml}
      </tbody>
    </table>

    <div class="sign-sheet-footer">
      <span>收發室經手人：${escapeHtml(dominantHandler)}</span>
      <span>簽收點交人：______________</span>
      <span>主管核閱：______________</span>
      <span>列印時間：${formatCurrentDateTime().slice(0, 16)}</span>
    </div>
  `;
}

function doPrintSignSheet() {
  document.body.classList.add('printing-a4-sign-sheet');

  setTimeout(() => {
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-a4-sign-sheet');
    }, 1000);
  }, 100);
}

// 監聽列印事件還原
window.addEventListener('afterprint', () => {
  document.body.classList.remove('printing-a4-sign-sheet');
});
