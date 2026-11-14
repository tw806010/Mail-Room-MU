/**
 * 美和科技大學收發室信件登記系統
 * 系統作者：魏啟軒
 * 主色調：孔雀綠 (Peacock Green)
 */

// LocalStorage 儲存鍵名
const STORAGE_KEY = 'meiho_mailroom_records_v1';

// ==========================================
// 集中設定（郵件類型沿用核心模組；經手人名單於此維護）
// ==========================================
const MAIL_TYPES = MailBackupCore.MAIL_TYPES;
const HANDLERS = ['陳銘鴻', '魏啟軒'];      // 固定經手人名單
const HANDLER_OTHER = '其他';              // 下拉選「其他」時，需手動輸入姓名
const SUMMARY_PAGE_SIZE = 40;              // 收件摘要圖片：每張圖最多筆數
const NO_NAME_TEXT = '—';                  // 查無製表人／經手人時顯示

// 系統狀態
let records = [];

// 紀錄是否為可處理的物件（資料中若混入 null 或非物件，一律略過，不讓整頁當掉）
function isRecordObject(r) {
  return r !== null && typeof r === 'object' && !Array.isArray(r);
}
function validRecords() {
  return records.filter(isRecordObject);
}
function findRecordById(id) {
  if (typeof id !== 'string' || id === '') return undefined;
  return records.find(r => isRecordObject(r) && r.id === id);
}
// 安全轉字串（欄位若被改成數字或物件也不會在 .toLowerCase() 等處拋例外）
function textOf(v) {
  return v === null || v === undefined ? '' : String(v);
}

// 依集中設定產生下拉選單選項（HTML 不再重複寫死）
function fillSelect(select, values, options) {
  if (!select) return;
  const opts = options || {};
  select.innerHTML = '';
  if (opts.allLabel) {
    const o = document.createElement('option');
    o.value = 'ALL';
    o.textContent = opts.allLabel;
    select.appendChild(o);
  }
  values.forEach(v => {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = v;
    select.appendChild(o);
  });
  if (opts.withOther) {
    const o = document.createElement('option');
    o.value = HANDLER_OTHER;
    o.textContent = `${HANDLER_OTHER} (手動輸入)`;
    select.appendChild(o);
  }
}
function populateSelects() {
  fillSelect(document.getElementById('mailType'), MAIL_TYPES);
  fillSelect(document.getElementById('editMailType'), MAIL_TYPES);
  fillSelect(document.getElementById('filterType'), MAIL_TYPES, { allLabel: '全部郵件類型' });
  fillSelect(document.getElementById('handlerSelect'), HANDLERS, { withOther: true });
  fillSelect(document.getElementById('editHandlerSelect'), HANDLERS, { withOther: true });
}

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
  summaryPager: document.getElementById('summaryPager'),
  summaryPageInfo: document.getElementById('summaryPageInfo'),
  btnSummaryPrev: document.getElementById('btnSummaryPrev'),
  btnSummaryNext: document.getElementById('btnSummaryNext'),
  emptyTitle: document.getElementById('emptyTitle'),
  emptyDesc: document.getElementById('emptyDesc'),
  printHeader: document.getElementById('printHeader'),
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
  populateSelects();
  initClock();
  loadRecords();
  bindEvents();
  renderTable();
  updateStats();
  renderBackupStatus();
  renderDataAlerts();
  document.getElementById('dataAlertBar').addEventListener('click', onDataAlertClick);
  document.getElementById('btnBackupNow').addEventListener('click', exportBackupJson);
  setInterval(renderBackupStatus, 60000); // 每分鐘重新評估是否逾 24 小時
  setInterval(checkDayRollover, 60000);   // 每分鐘檢查是否跨日
  window.addEventListener('storage', onStorageEvent);
  document.addEventListener('keydown', onGlobalKeydown);
});

// 跨過午夜自動更新：換日後「今日」統計與篩選結果需重新計算
let lastSeenDay = formatCurrentDateTime().slice(0, 10);
function checkDayRollover() {
  const today = formatCurrentDateTime().slice(0, 10);
  if (today === lastSeenDay) return;
  lastSeenDay = today;
  updateStats();
  renderTable();
}

// 多分頁同步：其他分頁修改了紀錄時，重新讀取並提醒使用者
function onStorageEvent(e) {
  if (e.storageArea && e.storageArea !== window.localStorage) return;
  if (e.key !== null && e.key !== STORAGE_KEY) return;   // key 為 null 代表整個儲存空間被清空
  reloadFromStorage();
  const editing = dom.editModal.style.display === 'flex';
  const signing = dom.quickSignModal.style.display === 'flex';
  if (editing || signing) {
    markOpenModalsStale();
    showToast('⚠️ 資料已在其他分頁更新，已重新載入。您正在處理的視窗內容可能已過期，請重新確認後再儲存。', 'error');
  } else {
    showToast('資料已在其他分頁更新，已重新載入', 'info');
  }
}

// 重新讀取儲存內容並更新畫面（同時讓儲存層的「寫入前比對」基準追上最新內容）
function reloadFromStorage() {
  dataAlerts.stale = null;
  loadRecords();
  renderDataAlerts();
  renderTable();
  updateStats();
  renderBackupStatus();
}

// 開啟中的修改／簽收視窗，加上「資料已過期」提醒
function markOpenModalsStale() {
  [dom.editModal, dom.quickSignModal].forEach(modal => {
    if (modal.style.display !== 'flex') return;
    const body = modal.querySelector('.modal-body');
    if (!body || body.querySelector('.modal-stale-note')) return;
    const note = document.createElement('div');
    note.className = 'modal-stale-note';
    note.setAttribute('role', 'alert');
    note.textContent = '⚠️ 資料已在其他分頁更新。此視窗顯示的內容可能已過期，請確認後再儲存，或關閉後重新開啟。';
    body.insertBefore(note, body.firstChild);
  });
}
function clearModalStaleNotes() {
  document.querySelectorAll('.modal-stale-note').forEach(n => n.remove());
}

// Modal 共通：Esc 關閉、開啟時焦點移到第一個輸入欄
const MODAL_CLOSERS = {
  editModal: () => closeEditModal(),
  quickSignModal: () => closeQuickSignModal(),
  restoreModal: () => closeRestoreModal(),
  integrityModal: () => closeIntegrityModal(),
  summaryModal: () => closeSummaryModal(),
  signSheetModal: () => closeSignSheetModal()
};
function onGlobalKeydown(e) {
  if (e.key !== 'Escape') return;
  const open = Object.keys(MODAL_CLOSERS)
    .map(id => document.getElementById(id))
    .filter(m => m && m.style.display === 'flex');
  if (open.length === 0) return;
  e.preventDefault();
  MODAL_CLOSERS[open[open.length - 1].id]();
}
function focusFirstField(modal) {
  if (!modal) return;
  const target = modal.querySelector(
    'input:not([type="hidden"]):not([disabled]):not([type="radio"]), select:not([disabled]), textarea:not([disabled])'
  ) || modal.querySelector('button:not([disabled])');
  if (target) target.focus();
}

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

// 儲存層（backup-core.js 提供；行為與原本一致，僅抽象化以利測試）
const recordStore = MailBackupCore.createStore({ storage: window.localStorage, key: STORAGE_KEY });
const corruptStash = MailBackupCore.createCorruptStash({ storage: window.localStorage });

// 資料安全警示（持續顯示直到問題排除）
const dataAlerts = { saveFail: null, corrupt: null, stale: null };
let saveLocked = false;   // 損毀原文尚未保存/下載前，暫停寫入以免覆蓋
let corruptRaw = null;    // 讀到的損毀原文

// 讀取 LocalStorage 資料
function loadRecords() {
  const result = recordStore.load();
  if (result.status === 'corrupt') {
    console.error('讀取資料失敗：', result.error);
    handleCorruptLoad(result);
  }
  records = result.records;
}

// 讀到損毀資料：先另存原文，避免之後的儲存直接蓋掉可搶救的內容
function handleCorruptLoad(result) {
  corruptRaw = result.raw;
  if (result.raw === null) {
    dataAlerts.corrupt = {
      message: '❗ 無法讀取瀏覽器儲存空間，系統內的紀錄暫時看不到。請勿重複登記，請檢查瀏覽器設定（無痕模式／封鎖網站資料）後重新整理，或使用「還原備份」。',
      actions: []
    };
    return;
  }
  const st = corruptStash.stash(result.raw);
  if (st.ok) {
    dataAlerts.corrupt = {
      message: '❗ 偵測到已損毀的紀錄資料，系統已另存原文，目前畫面為空白。請盡快使用「還原備份」載入最近一次備份，並建議下載損毀原文交給管理者。',
      actions: [{ id: 'downloadCorrupt', label: '下載損毀原文' }, { id: 'dismissCorrupt', label: '我知道了' }]
    };
  } else {
    saveLocked = true;
    dataAlerts.corrupt = {
      message: '❗ 偵測到已損毀的紀錄資料，但無法另存原文（資料過大或儲存空間不足）。為避免覆蓋，系統已暫停寫入。請先下載損毀原文，再使用「還原備份」。',
      actions: [{ id: 'downloadCorrupt', label: '下載損毀原文並解除暫停' }]
    };
  }
}

function downloadCorruptRaw() {
  if (corruptRaw === null) return;
  const blob = new Blob([corruptRaw], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `美和科技大學收發室_損毀資料原文_${formatCurrentDateTime().replace(/[-: ]/g, '').slice(0, 12)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  saveLocked = false;
  if (dataAlerts.corrupt) {
    dataAlerts.corrupt.actions = [{ id: 'downloadCorrupt', label: '再次下載損毀原文' }, { id: 'dismissCorrupt', label: '我知道了' }];
    dataAlerts.corrupt.message = '❗ 損毀原文已下載。請盡快使用「還原備份」載入最近一次備份。';
  }
  renderDataAlerts();
  showToast('損毀原文已下載，已解除暫停寫入。', 'info');
}

function renderDataAlerts() {
  const box = document.getElementById('dataAlertBar');
  if (!box) return;
  box.innerHTML = '';
  Object.keys(dataAlerts).forEach(k => {
    const al = dataAlerts[k];
    if (!al) return;
    const item = document.createElement('div');
    item.className = 'data-alert-item';
    item.setAttribute('role', 'alert');
    const msg = document.createElement('div');
    msg.className = 'data-alert-message';
    msg.textContent = al.message;
    item.appendChild(msg);
    al.actions.forEach(act => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-outline data-alert-btn';
      btn.dataset.alertAction = act.id;
      btn.textContent = act.label;
      item.appendChild(btn);
    });
    box.appendChild(item);
  });
}

function onDataAlertClick(e) {
  const btn = e.target.closest('[data-alert-action]');
  if (!btn) return;
  const act = btn.dataset.alertAction;
  if (act === 'emergency') downloadBackupFile('美和科技大學收發室_緊急備份');
  else if (act === 'downloadCorrupt') downloadCorruptRaw();
  else if (act === 'dismissCorrupt') { dataAlerts.corrupt = null; renderDataAlerts(); }
  else if (act === 'reloadData') {
    reloadFromStorage();
    showToast('已重新載入最新資料，請再確認後重新操作。', 'info');
  }
}

// 其他分頁已改動資料：拒絕寫入，持續警示並提供「重新載入」，絕不默默覆蓋
function reportStaleData() {
  dataAlerts.stale = {
    message: '⚠️ 資料已在其他視窗或分頁被更新，為避免覆蓋對方的資料，這次的變更沒有儲存。請按「重新載入」取得最新資料後，再重新操作一次。',
    actions: [{ id: 'reloadData', label: '重新載入' }]
  };
  renderDataAlerts();
  showToast('⚠️ 資料已在其他分頁更新，本次變更未儲存，請按「重新載入」。', 'error');
  markOpenModalsStale();
}

// 儲存失敗：明確警告，保留畫面資料並提供緊急匯出
function reportSaveFailure(message) {
  const firstTime = !dataAlerts.saveFail;
  dataAlerts.saveFail = {
    message: `❗ 最近一次儲存失敗：${message}。該次操作「沒有」被記錄（表單內容仍保留，請勿當成已完成）。請先按「緊急匯出備份」保存目前已儲存的資料，再排除問題後重新送出。`,
    actions: [{ id: 'emergency', label: '緊急匯出備份' }]
  };
  renderDataAlerts();
  showToast('❌ 儲存失敗！這次的操作沒有被記錄，請先匯出緊急備份。', 'error');
  if (firstTime) alert(`❌ 儲存失敗\n\n原因：${message}\n\n這次的操作沒有被記錄（表單內容仍保留，畫面已回到最後一次成功儲存的狀態）。請按頁面上方的「緊急匯出備份」保存目前資料，排除問題後重新送出。`);
}

// 寫入並在失敗時還原記憶體中的變更，讓畫面永遠等於已儲存的狀態；失敗時回傳 false
function persistOrRollback(rollback) {
  if (saveRecords()) return true;
  try { rollback(); } catch (err) { console.error('還原記憶體變更失敗：', err); }
  renderTable();
  updateStats();
  return false;
}

// 寫入 LocalStorage
function saveRecords() {
  if (saveLocked) {
    reportSaveFailure('為避免覆蓋可搶救的損毀資料，儲存已暫停（請先下載損毀原文）');
    return false;
  }
  const result = recordStore.save(records);
  if (!result.ok && result.code === 'STALE_DATA') {
    reportStaleData();
    return false;
  }
  if (!result.ok) {
    console.error('儲存資料失敗：', result.error);
    reportSaveFailure(MailBackupCore.classifySaveError(result.error).message);
  } else {
    if (dataAlerts.saveFail) {
      dataAlerts.saveFail = null;
      renderDataAlerts();
      showToast('✅ 儲存已恢復正常，目前資料已寫入。', 'success');
    }
    backupMeta.markChanged();
    renderBackupStatus();
  }
  return result.ok;
}
// 備份提醒（狀態存於獨立鍵，不影響正式資料）
const backupMeta = MailBackupCore.createBackupMeta({ storage: window.localStorage });

function renderBackupStatus() {
  const bar = document.getElementById('backupStatusBar');
  if (!bar) return;
  const s = backupMeta.getStatus(records.length);
  const icons = { ok: '✅', info: 'ℹ️', notice: '📝', warn: '⚠️', danger: '🚨' };
  bar.className = 'backup-status-bar level-' + s.level;
  document.getElementById('backupStatusIcon').textContent = icons[s.level] || '💾';
  document.getElementById('backupStatusMessage').textContent = s.message;
  const last = s.lastExportAt
    ? `最後匯出：${s.lastExportAt}（${s.lastExportCount === null ? '?' : s.lastExportCount} 筆）　未備份變更：${s.unsavedChanges} 項`
    : '最後匯出：尚無紀錄';
  document.getElementById('backupStatusDetail').textContent = last;
}

// 綁定事件監聽
function bindEvents() {
  // 經手人下拉連動手動輸入 (登記表單)
  dom.handlerSelect.addEventListener('change', (e) => {
    if (e.target.value === HANDLER_OTHER) {
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

  // 表格按鈕：事件委派（按鈕只帶 data-action / data-id，不再使用 inline onclick）
  dom.mailTableBody.addEventListener('click', onTableActionClick);

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
  dom.summaryCustomDate.addEventListener('input', onSummaryFilterChange);
  dom.summaryStatusFilter.addEventListener('change', onSummaryFilterChange);
  dom.summarySortOrder.addEventListener('change', onSummaryFilterChange);
  dom.btnDownloadSummaryImage.addEventListener('click', downloadSummaryImage);
  dom.btnCopySummaryImage.addEventListener('click', copySummaryImage);
  dom.btnSummaryPrev.addEventListener('click', () => changeSummaryPage(-1));
  dom.btnSummaryNext.addEventListener('click', () => changeSummaryPage(1));

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
  document.getElementById('btnIntegrityCheck').addEventListener('click', openIntegrityModal);
  document.getElementById('btnIntegrityClose').addEventListener('click', closeIntegrityModal);
  document.getElementById('btnIntegrityOk').addEventListener('click', closeIntegrityModal);
  document.querySelectorAll('input[name="restoreMode"]').forEach(r =>
    r.addEventListener('change', renderRestoreDiff));

  // 列印清冊
  dom.btnPrint.addEventListener('click', () => {
    updatePrintHeader();
    window.print();
  });
  // 也涵蓋以 Ctrl+P 直接列印的情況（簽收表模式不使用清冊抬頭）
  window.addEventListener('beforeprint', () => {
    if (!document.body.classList.contains('printing-a4-sign-sheet')) updatePrintHeader();
  });

  // 示範資料載入按鈕
  dom.btnLoadSample.addEventListener('click', loadSampleData);

  // 編輯 Modal 經手人下拉連動
  dom.editHandlerSelect.addEventListener('change', (e) => {
    if (e.target.value === HANDLER_OTHER) {
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

// 必填欄位檢查（trim 後不可為空）。第一個空白的欄位會顯示錯誤並取得焦點；全部通過回傳 true
function requireFilled(fields) {
  for (const [el, label] of fields) {
    if (!el.value.trim()) {
      showToast(`請填寫「${label}」（不可只輸入空白）！`, 'error');
      el.focus();
      return false;
    }
  }
  return true;
}

// 讀取經手人：選「其他」時，手動輸入欄必填，不可默默變成「其他經手人」
function readHandlerValue(selectEl, otherEl) {
  if (selectEl.value !== HANDLER_OTHER) return selectEl.value;
  const name = otherEl.value.trim();
  if (!name) {
    showToast('經手人選擇「其他」時，請輸入經手人姓名！', 'error');
    otherEl.focus();
    return null;
  }
  return name;
}

// 處理登記送出
function handleRegisterSubmit(e) {
  e.preventDefault();

  if (!requireFilled([
    [dom.trackingNo, '掛號函件 / 包裹編號'],
    [dom.sender, '寄件人'],
    [dom.recipient, '收件人'],
    [dom.department, '收件人所屬單位']
  ])) return;

  const handler = readHandlerValue(dom.handlerSelect, dom.handlerOther);
  if (handler === null) return;

  const trackingNo = dom.trackingNo.value.trim();
  const mailType = dom.mailType.value;
  const sender = dom.sender.value.trim();
  const recipient = dom.recipient.value.trim();
  const department = dom.department.value.trim();
  const remark = dom.remark.value.trim();

  // 防止重複刷條碼：相同編號且仍待領取的紀錄已存在時，先請使用者確認
  const dup = MailBackupCore.findPendingDuplicate(records, trackingNo);
  if (dup) {
    const ok = confirm(
      `此編號已於 ${textOf(dup.createdAt)} 登記給 ${textOf(dup.recipient)}（狀態：待領取），確定要再登記一次嗎？`);
    if (!ok) {
      dom.trackingNo.focus();
      dom.trackingNo.select();
      return;
    }
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

  // 新紀錄排在最前；儲存失敗時復原，且不清空表單、不顯示成功訊息
  records.unshift(newRecord);
  const saved = persistOrRollback(() => {
    const i = records.indexOf(newRecord);
    if (i >= 0) records.splice(i, 1);
  });
  if (!saved) return;

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

  return validRecords().filter(item => {
    // 關鍵字搜尋 (編號、收件人、寄件人、單位、經手人、領取人)
    if (searchTerm) {
      const matchSearch = [item.trackingNo, item.recipient, item.department, item.sender, item.handler, item.receivedSigner]
        .some(v => textOf(v).toLowerCase().includes(searchTerm));
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
      const recordDateStr = textOf(item.createdAt).slice(0, 10);
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
    if (records.length === 0) {
      // 系統內完全沒有紀錄：才提供「載入示範資料」
      dom.emptyTitle.textContent = '目前尚無任何信件/包裹紀錄';
      dom.emptyDesc.textContent = '您可以使用上方表單進行第一筆郵件登記。';
      dom.btnLoadSample.style.display = '';
    } else {
      // 已有紀錄但篩選後為 0 筆：不可出現示範資料按鈕
      dom.emptyTitle.textContent = '沒有符合篩選條件的紀錄';
      dom.emptyDesc.textContent = '請放寬搜尋關鍵字或篩選條件後再試。';
      dom.btnLoadSample.style.display = 'none';
    }
    dom.recordCountInfo.textContent = '顯示 0 筆紀錄';
    return;
  }

  dom.emptyState.style.display = 'none';
  dom.btnLoadSample.style.display = 'none';
  dom.recordCountInfo.textContent = `顯示 ${filtered.length} 筆紀錄 (共 ${validRecords().length} 筆歷史紀錄)`;

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

    // 按鈕只帶 data-action / data-id（值經 escapeHtml），由 mailTableBody 事件委派處理
    const safeId = escapeHtml(item.id);
    const actionSignBtn = isReceived
      ? `<button type="button" class="btn-action-edit" data-action="revert" data-id="${safeId}" title="還原為待領取狀態">取消簽收</button>`
      : `<button type="button" class="btn-action-sign" data-action="sign" data-id="${safeId}">🖊️ 簽收領取</button>`;

    // 修改按鈕 (保留修改按鈕，不設刪除按鈕)
    const actionEditBtn = `<button type="button" class="btn-action-edit" data-action="edit" data-id="${safeId}">✏️ 修改</button>`;

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

// 表格按鈕事件委派
function onTableActionClick(e) {
  const btn = e.target.closest('button[data-action]');
  if (!btn || !dom.mailTableBody.contains(btn)) return;
  const id = btn.dataset.id;
  if (!id) {
    showToast('此筆紀錄缺少 ID，無法操作。請按「資料檢查」確認，或重新還原備份（還原時會自動補上 ID）。', 'error');
    return;
  }
  const action = btn.dataset.action;
  if (action === 'sign') openQuickSignModal(id);
  else if (action === 'revert') revertSignStatus(id);
  else if (action === 'edit') openEditModal(id);
}

// 更新統計卡片數字
function updateStats() {
  const todayStr = formatCurrentDateTime().slice(0, 10);
  const list = validRecords();

  const todayCount = list.filter(r => textOf(r.createdAt).startsWith(todayStr)).length;
  const pendingCount = list.filter(r => r.status === 'PENDING').length;
  const receivedCount = list.filter(r => r.status === 'RECEIVED').length;
  const totalCount = list.length;

  dom.statTodayCount.textContent = todayCount;
  dom.statPendingCount.textContent = pendingCount;
  dom.statReceivedCount.textContent = receivedCount;
  dom.statTotalCount.textContent = totalCount;
}

// 紀錄快照與復原（儲存失敗時把記憶體中的紀錄還原成修改前）
function snapshotRecord(record) {
  return JSON.parse(JSON.stringify(record));
}
function restoreSnapshot(record, snapshot) {
  Object.keys(record).forEach(k => { delete record[k]; });
  Object.assign(record, snapshot);
}

// 開啟快速簽收 Modal
function openQuickSignModal(id) {
  const record = findRecordById(id);
  if (!record) {
    showToast('找不到這筆紀錄，可能已在其他分頁更新，請重新載入。', 'error');
    return;
  }

  clearModalStaleNotes();
  dom.signRecordId.value = record.id;
  dom.signSummaryNo.textContent = record.trackingNo;
  dom.signSummaryRecipient.textContent = record.recipient;
  dom.signSummaryDept.textContent = record.department;
  // 預設簽收人為本人
  dom.signerInput.value = record.recipient;

  dom.quickSignModal.style.display = 'flex';
  dom.signerInput.focus();
  dom.signerInput.select();
}

function closeQuickSignModal() {
  dom.quickSignModal.style.display = 'none';
  clearModalStaleNotes();
}

function handleSignConfirm(e) {
  e.preventDefault();
  const id = dom.signRecordId.value;
  const signer = dom.signerInput.value.trim() || '本人';

  const record = findRecordById(id);
  if (!record) {
    showToast('找不到這筆紀錄，可能已在其他分頁更新，請重新載入。', 'error');
    return;
  }

  const before = snapshotRecord(record);
  const nowStr = formatCurrentDateTime();
  record.status = 'RECEIVED';
  record.receivedAt = nowStr;
  record.receivedSigner = signer;
  MailBackupCore.appendHistory(record, 'sign', MailBackupCore.diffFields(before, record), nowStr);

  // 儲存失敗：還原、保留視窗，且不顯示成功訊息
  if (!persistOrRollback(() => restoreSnapshot(record, before))) return;

  renderTable();
  updateStats();
  closeQuickSignModal();
  showToast(`✅ 已完成簽收：【${record.recipient}】 (簽收人: ${signer})`, 'success');
}

// 取消簽收狀態（復原為待領取）
function revertSignStatus(id) {
  const record = findRecordById(id);
  if (!record) {
    showToast('找不到這筆紀錄，可能已在其他分頁更新，請重新載入。', 'error');
    return;
  }

  if (!confirm(`確定要將【${record.recipient}】的郵件還原為「待領取」狀態嗎？`)) return;

  const before = snapshotRecord(record);
  const nowStr = formatCurrentDateTime();
  record.status = 'PENDING';
  record.receivedAt = null;
  record.receivedSigner = '';
  MailBackupCore.appendHistory(record, 'unsign', MailBackupCore.diffFields(before, record), nowStr);

  if (!persistOrRollback(() => restoreSnapshot(record, before))) return;

  renderTable();
  updateStats();
  showToast(`已將【${record.recipient}】的狀態還原為待領取`, 'info');
}

// 開啟修改 Modal
function openEditModal(id) {
  const record = findRecordById(id);
  if (!record) {
    showToast('找不到這筆紀錄，可能已在其他分頁更新，請重新載入。', 'error');
    return;
  }

  clearModalStaleNotes();
  dom.editRecordId.value = record.id;
  dom.editTrackingNo.value = textOf(record.trackingNo);

  // 郵件類型：若舊資料的類型不在標準清單內，暫時補上該選項，避免儲存時被默默改掉
  dom.editMailType.querySelectorAll('option[data-temp]').forEach(o => o.remove());
  const mt = record.mailType || MAIL_TYPES[0];
  if (!MAIL_TYPES.includes(mt)) {
    const o = document.createElement('option');
    o.value = mt;
    o.textContent = `${mt}（非標準類型）`;
    o.dataset.temp = '1';
    dom.editMailType.appendChild(o);
  }
  dom.editMailType.value = mt;

  // 經手人設定
  if (HANDLERS.includes(record.handler)) {
    dom.editHandlerSelect.value = record.handler;
    dom.editHandlerOtherGroup.style.display = 'none';
    dom.editHandlerOther.required = false;
    dom.editHandlerOther.value = '';
  } else {
    dom.editHandlerSelect.value = HANDLER_OTHER;
    dom.editHandlerOtherGroup.style.display = 'flex';
    dom.editHandlerOther.required = true;
    dom.editHandlerOther.value = textOf(record.handler);
  }

  dom.editSender.value = textOf(record.sender);
  dom.editRecipient.value = textOf(record.recipient);
  dom.editDepartment.value = textOf(record.department);
  dom.editRemark.value = textOf(record.remark);

  // 狀態
  if (record.status === 'RECEIVED') {
    dom.radioStatusReceived.checked = true;
    dom.editReceivedInfoGroup.style.display = 'flex';
    dom.editReceivedSigner.value = record.receivedSigner || record.recipient || '';
  } else {
    dom.radioStatusPending.checked = true;
    dom.editReceivedInfoGroup.style.display = 'none';
    dom.editReceivedSigner.value = '';
  }

  dom.editModal.style.display = 'flex';
  focusFirstField(dom.editModal);
}

function closeEditModal() {
  dom.editModal.style.display = 'none';
  clearModalStaleNotes();
}

function handleEditSave(e) {
  e.preventDefault();
  const id = dom.editRecordId.value;
  const record = findRecordById(id);
  if (!record) {
    showToast('找不到這筆紀錄，可能已在其他分頁更新，請重新載入。', 'error');
    return;
  }

  // 與登記表單一致：trim 後不可為空
  if (!requireFilled([
    [dom.editTrackingNo, '掛號函件 / 包裹編號'],
    [dom.editSender, '寄件人'],
    [dom.editRecipient, '收件人'],
    [dom.editDepartment, '收件人所屬單位']
  ])) return;

  const handler = readHandlerValue(dom.editHandlerSelect, dom.editHandlerOther);
  if (handler === null) return;

  const trackingNo = dom.editTrackingNo.value.trim();
  const mailType = dom.editMailType.value;
  const sender = dom.editSender.value.trim();
  const recipient = dom.editRecipient.value.trim();
  const department = dom.editDepartment.value.trim();
  const remark = dom.editRemark.value.trim();

  const isReceived = document.querySelector('input[name="editStatusRadio"]:checked').value === 'RECEIVED';
  const receivedSigner = dom.editReceivedSigner.value.trim();

  const before = snapshotRecord(record);
  const nowStr = formatCurrentDateTime();

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
      record.receivedAt = nowStr;
    }
    record.status = 'RECEIVED';
    record.receivedSigner = receivedSigner || recipient;
  } else {
    record.status = 'PENDING';
    record.receivedAt = null;
    record.receivedSigner = '';
  }

  const changes = MailBackupCore.diffFields(before, record);
  if (Object.keys(changes).length === 0) {
    restoreSnapshot(record, before);
    closeEditModal();
    showToast('沒有任何變更。', 'info');
    return;
  }
  MailBackupCore.appendHistory(record, 'edit', changes, nowStr);

  // 儲存失敗：還原、保留視窗讓使用者重試，且不顯示成功訊息
  if (!persistOrRollback(() => restoreSnapshot(record, before))) return;

  renderTable();
  updateStats();
  closeEditModal();
  showToast('💾 資料修改已儲存！', 'success');
}

// ---- 列印清冊抬頭（僅列印時顯示）----
function selectedOptionText(select) {
  const o = select.options[select.selectedIndex];
  return o ? o.textContent.trim() : '';
}
function describeFilters() {
  const parts = [];
  const kw = dom.searchInput.value.trim();
  if (kw) parts.push(`關鍵字「${kw}」`);
  if (dom.filterType.value !== 'ALL') parts.push(`類型：${selectedOptionText(dom.filterType)}`);
  if (dom.filterStatus.value !== 'ALL') parts.push(`狀態：${selectedOptionText(dom.filterStatus).replace(/^[^一-鿿]+/, '')}`);
  if (dom.filterDate.value !== 'ALL') parts.push(`日期：${selectedOptionText(dom.filterDate)}`);
  return parts.length ? parts.join('；') : '無（顯示全部紀錄）';
}
function updatePrintHeader() {
  if (!dom.printHeader) return;
  const count = getFilteredRecords().length;
  dom.printHeader.innerHTML =
    '<div class="print-title">美和科技大學收發室 信件登記清冊</div>' +
    `<div class="print-meta">列印時間：${escapeHtml(formatCurrentDateTime())}　｜　共 ${count} 筆</div>` +
    `<div class="print-meta">篩選條件：${escapeHtml(describeFilters())}</div>`;
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
  csvRows.push(headers.map(MailBackupCore.toCsvField).join(','));

  filtered.forEach((r, idx) => {
    const statusText = r.status === 'RECEIVED' ? '已領取' : '待領取';
    const row = [
      idx + 1,
      statusText,
      null,                 // 編號欄於下方以 ="…" 文字格式輸出
      r.mailType || '',
      r.recipient || '',
      r.department || '',
      r.sender || '',
      r.handler || '',
      r.createdAt || '',
      r.receivedSigner || '',
      r.receivedAt || '',
      r.remark || ''
    ].map(MailBackupCore.toCsvField);
    // 編號：="9820012345"，Excel 會當成文字（不變科學記號、不掉開頭的 0）
    row[2] = MailBackupCore.toCsvTextFormula(r.trackingNo);
    csvRows.push(row.join(','));
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

// 產生並下載備份檔（格式與既有匯出完全相同），同時更新備份提醒狀態
function downloadBackupFile(filePrefix) {
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
  downloadLink.download = `${filePrefix}_${dateStr}.json`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(url);

  backupMeta.markExported(records.length);
  renderBackupStatus();
}

// 匯出完整系統備份 (.json)
function exportBackupJson() {
  if (records.length === 0) {
    if (!confirm('目前系統內尚無任何登記紀錄，確定要匯出空的備份檔嗎？')) {
      return;
    }
  }

  downloadBackupFile('美和科技大學收發室_系統完整備份');

  showToast(`💾 系統完整備份檔已成功匯出 (共 ${records.length} 筆)！請妥善保存於電腦中。`, 'success');
}

// 選擇備份檔案：先驗證，再顯示還原預覽（此階段完全不寫入任何資料）
function handleBackupFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const validation = MailBackupCore.validateBackup(evt.target.result);
      pendingRestoreData = {
        validation: validation,
        records: validation.records,
        fileName: file.name
      };
      openRestorePreview();
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

const RESTORE_FIELD_LABELS = {
  trackingNo: '編號', mailType: '類型', sender: '寄件人', recipient: '收件人', department: '單位',
  handler: '經手人', remark: '備註', createdAt: '建立時間', status: '狀態',
  receivedAt: '領取時間', receivedSigner: '簽收人'
};

function getSelectedRestoreMode() {
  const checked = document.querySelector('input[name="restoreMode"]:checked');
  return checked ? checked.value : 'merge';
}

// 顯示還原預覽：驗證結果 + 差異比較 + 還原後統計
function openRestorePreview() {
  const pending = pendingRestoreData;
  const v = pending.validation;

  document.getElementById('restoreSummaryFile').textContent = pending.fileName;
  dom.restoreSummaryTime.textContent = v.backupTime || (v.format === 'legacy-array' ? '舊版備份（無時間資訊）' : '未知');
  dom.restoreSummaryCount.textContent = v.recordCount;
  dom.restoreSummaryCurrent.textContent = records.length;

  const msgs = [];
  v.errors.forEach(x => msgs.push(`<div class="restore-msg error">❌ ${escapeHtml(x.message)}</div>`));
  v.warnings.forEach(x => msgs.push(`<div class="restore-msg warn">⚠️ ${escapeHtml(x.message)}</div>`));
  document.getElementById('restoreValidation').innerHTML = msgs.join('');

  document.getElementById('restorePreviewArea').style.display = v.ok ? '' : 'none';
  dom.btnRestoreConfirm.disabled = !v.ok;
  if (v.ok) renderRestoreDiff();

  dom.restoreModal.style.display = 'flex';
  focusFirstField(dom.restoreModal);
}

function describeRecord(r) {
  return `${escapeHtml(r.trackingNo || '(無編號)')}／${escapeHtml(r.recipient || '(無收件人)')}`;
}

function renderRestoreDiff() {
  const pending = pendingRestoreData;
  if (!pending || !pending.records) return;
  const mode = getSelectedRestoreMode();
  const plan = MailBackupCore.planRestore(records, pending.records, mode);
  const s = plan.summary;
  const d = plan.diff;
  const LIMIT = 20;

  const lines = [];
  lines.push(`<div>還原後系統將有 <span class="num">${s.after}</span> 筆（目前 ${s.before} 筆）</div><ul>`);
  lines.push(`<li>新增 <span class="num">${s.added}</span> 筆備份中才有的紀錄</li>`);
  lines.push(`<li>內容完全相同 ${s.identical} 筆（無變動）</li>`);
  if (mode === 'merge') {
    lines.push(`<li>與現有內容不同 ${s.keptCurrent} 筆：<strong>保留現有版本</strong>，不會被備份覆蓋</li>`);
  } else {
    lines.push(`<li>與現有內容不同 <span class="${s.overwritten ? 'danger' : 'num'}">${s.overwritten}</span> 筆：<strong>將被備份內容覆蓋</strong></li>`);
    lines.push(`<li>現有但備份中沒有 <span class="${s.removed ? 'danger' : 'num'}">${s.removed}</span> 筆：<strong>將被移除</strong></li>`);
  }
  if (s.duplicateInBackup) lines.push(`<li>備份檔內重複 ${s.duplicateInBackup} 筆（不重複匯入）</li>`);
  if (s.idsFixed) lines.push(`<li>將自動補上 <span class="num">${s.idsFixed}</span> 筆 ID（備份中缺少或重複的 ID；原始備份檔不會被修改）</li>`);
  lines.push('</ul>');

  const detail = (title, items, fmt) => {
    if (!items.length) return;
    const shown = items.slice(0, LIMIT).map(x => `<li>${fmt(x)}</li>`).join('');
    const more = items.length > LIMIT ? `<li>…另有 ${items.length - LIMIT} 筆未列出</li>` : '';
    lines.push(`<details><summary>${title}（${items.length}）</summary><ul>${shown}${more}</ul></details>`);
  };
  detail('內容不同的紀錄', d.changed, x => {
    const diffs = x.fields.map(f =>
      `${RESTORE_FIELD_LABELS[f] || f}：${escapeHtml(String(x.current[f] ?? ''))} → ${escapeHtml(String(x.incoming[f] ?? ''))}`).join('；');
    return `${describeRecord(x.current)}　${diffs}`;
  });
  if (mode === 'replace') detail('將被移除的現有紀錄', d.onlyInCurrent, describeRecord);
  detail('將新增的紀錄', d.added, describeRecord);

  document.getElementById('restoreDiffBox').innerHTML = lines.join('');
}

// 資料完整性檢查（唯讀）：只產生報告，不修改任何資料
function openIntegrityModal() {
  const res = MailBackupCore.checkIntegrity(records);
  const LIMIT = 100;
  const summary = document.getElementById('integritySummary');
  summary.innerHTML = res.total === 0
    ? '目前沒有任何紀錄可檢查。'
    : `共檢查 <span class="num">${res.total}</span> 筆：` +
      (res.ok && res.warningCount === 0
        ? '<span class="num">✅ 未發現任何問題</span>'
        : `<span class="${res.errorCount ? 'danger' : 'num'}">${res.errorCount} 個錯誤</span>、${res.warningCount} 個警告`);

  const shown = res.issues
    .slice().sort((x, y) => (x.severity === y.severity ? x.index - y.index : x.severity === 'error' ? -1 : 1))
    .slice(0, LIMIT)
    .map(x => `<div class="restore-msg ${x.severity === 'error' ? 'error' : 'warn'}">${x.severity === 'error' ? '❌' : '⚠️'} ${escapeHtml(x.message)}</div>`);
  if (res.issues.length > LIMIT) shown.push(`<div class="restore-note">…另有 ${res.issues.length - LIMIT} 項未列出</div>`);
  document.getElementById('integrityIssues').innerHTML = shown.join('');
  document.getElementById('integrityModal').style.display = 'flex';
  focusFirstField(document.getElementById('integrityModal'));
}

function closeIntegrityModal() {
  document.getElementById('integrityModal').style.display = 'none';
}

function closeRestoreModal() {
  dom.restoreModal.style.display = 'none';
  pendingRestoreData = null;
}

// 執行還原：確認 → 先下載目前資料備份 → （覆蓋需二次確認）→ 寫入 → 重新讀取驗證 → 失敗自動回復
function executeRestore() {
  const pending = pendingRestoreData;
  if (!pending || !pending.validation || !pending.validation.ok || !Array.isArray(pending.records)) {
    closeRestoreModal();
    return;
  }

  if (saveLocked) {
    alert('為避免覆蓋可搶救的損毀資料，請先按頁面上方的「下載損毀原文」，再進行還原。');
    return;
  }

  const mode = getSelectedRestoreMode();
  const plan = MailBackupCore.planRestore(records, pending.records, mode);
  const s = plan.summary;

  const firstMsg = mode === 'replace'
    ? `⚠️ 您選擇「完全覆蓋」！\n\n目前 ${s.before} 筆 → 還原後 ${s.after} 筆\n將覆蓋內容不同的 ${s.overwritten} 筆，並移除備份檔中沒有的 ${s.removed} 筆。\n\n按「確定」後，系統會先下載一份「還原前自動備份」檔。`
    : `即將以「合併」方式還原：\n新增 ${s.added} 筆，還原後共 ${s.after} 筆（現有 ${s.before} 筆）。\n\n按「確定」後，系統會先下載一份「還原前自動備份」檔。`;
  if (!confirm(firstMsg)) return;

  // 還原前先保存目前資料（資料為空時沒有東西可保存）
  if (records.length > 0) {
    downloadBackupFile('美和科技大學收發室_還原前自動備份');
  }

  if (mode === 'replace') {
    const secondMsg = `🔴 最後確認\n\n還原前自動備份檔已下載（共 ${s.before} 筆）。請確認瀏覽器已成功儲存該檔案。\n\n確定要以備份檔完全取代目前資料嗎？此動作無法由本系統復原。`;
    if (!confirm(secondMsg)) {
      showToast('已取消還原，目前資料未被變更（還原前備份檔已下載）。', 'info');
      return;
    }
  }

  const result = MailBackupCore.executeRestore({
    store: recordStore,
    currentRecords: records,
    incoming: pending.records,
    mode: mode,
    preBackupConfirmed: true,
    overwriteConfirmed: mode === 'replace'
  });

  if (!result.ok) {
    console.error('還原失敗：', result);
    const extra = result.verification && result.verification.problems.length
      ? '\n\n' + result.verification.problems.join('\n') : '';
    alert(`❌ 還原未完成\n\n${result.message}${extra}`);
    return;
  }

  // 以重新讀取並驗證過的資料更新畫面
  records = result.records;
  dataAlerts.corrupt = null;   // 已成功還原並驗證，損毀警示解除
  dataAlerts.saveFail = null;
  renderDataAlerts();
  backupMeta.markChanged();
  renderTable();
  updateStats();
  renderBackupStatus();
  closeRestoreModal();

  const after = MailBackupCore.checkIntegrity(records);
  const note = after.errorCount ? `（資料檢查發現 ${after.errorCount} 個問題）` : '';
  showToast(`✅ 還原完成並通過驗證：目前共 ${result.verification.count} 筆，新增 ${s.added} 筆${note}。`, 'success');
}

// 載入示範測試資料
function loadSampleData() {
  // 示範資料只用於全新、完全沒有紀錄的系統；已有紀錄時不可混入正式資料
  if (records.length > 0) {
    showToast('系統內已有紀錄，不可載入示範資料（避免混入正式紀錄）。', 'error');
    return;
  }
  if (!confirm('示範資料寫入後無法刪除（本系統不提供刪除功能）。\n\n確定要載入 6 筆示範資料嗎？')) return;

  const runId = Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
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

  // 每次載入產生唯一 ID（SAMPLE_<批次>_<序號>），避免重複載入造成相同 ID
  sampleList.forEach(s => { s.id = s.id.replace('SAMPLE_', `SAMPLE_${runId}_`); });

  const previous = records;
  records = sampleList.concat(records);
  if (!persistOrRollback(() => { records = previous; })) return;
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

  summaryPage = 1;
  dom.summaryModal.style.display = 'flex';
  focusFirstField(dom.summaryModal);
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
  onSummaryFilterChange();
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

  const filtered = validRecords().filter(item => {
    // 日期過濾
    if (targetDatePrefix) {
      if (!textOf(item.createdAt).startsWith(targetDatePrefix)) {
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
    const timeA = textOf(a.createdAt);
    const timeB = textOf(b.createdAt);
    return sortOrder === 'DESC' ? timeB.localeCompare(timeA) : timeA.localeCompare(timeB);
  });

  return {
    items: filtered,
    dateDisplay: dateDisplay,
    dateSlug: dateSlug,
    dateMode: dateMode,
    statusMode: statusMode,
    statusText: statusMode === 'PENDING' ? '待領取郵件' : '全部郵件'
  };
}

// 目前畫布所呈現的頁面資訊（下載檔名使用）
let summaryPage = 1;
let summaryRenderToken = 0;
let summaryView = { page: 1, pages: 1, dateSlug: '' };

// 篩選條件改變：回到第 1 頁重新繪製
function onSummaryFilterChange() {
  summaryPage = 1;
  renderSummaryCanvas();
}

function changeSummaryPage(delta) {
  summaryPage += delta;
  renderSummaryCanvas();
}

// 等待字型載入完成再繪製，避免用到備用字型（最多等 3 秒，離線時不會卡住）
async function ensureFontsReady() {
  if (!document.fonts || !document.fonts.load) return;
  const wait = Promise.all([
    document.fonts.load('bold 28px "Noto Sans TC"', '美和收件人'),
    document.fonts.load('500 18px "Noto Sans TC"', '美和收件人'),
    document.fonts.ready
  ]).catch(() => {});
  await Promise.race([wait, new Promise(resolve => setTimeout(resolve, 3000))]);
}

// 文字過長時截斷並加「…」，避免壓到隔壁欄位（需先設定好 ctx.font）
function fitText(ctx, text, maxWidth) {
  const s = textOf(text);
  if (ctx.measureText(s).width <= maxWidth) return s;
  let lo = 0, hi = s.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (ctx.measureText(s.slice(0, mid) + '…').width <= maxWidth) lo = mid; else hi = mid - 1;
  }
  return s.slice(0, lo) + '…';
}

// 依筆數找出多數經手人；沒有任何經手人資料時回傳 null（畫面顯示「—」，不寫死人名）
function dominantHandlerOf(items) {
  const counts = {};
  items.forEach(item => {
    const h = textOf(item.handler).trim();
    if (h) counts[h] = (counts[h] || 0) + 1;
  });
  let best = null;
  let max = -1;
  for (const [name, count] of Object.entries(counts)) {
    if (count > max) { max = count; best = name; }
  }
  return best;
}

async function renderSummaryCanvas() {
  const token = ++summaryRenderToken;
  const summary = getSummaryData();
  const paged = MailBackupCore.paginate(summary.items, SUMMARY_PAGE_SIZE, summaryPage);
  summaryPage = paged.page;
  const items = paged.items;

  if (dom.summaryRecordsCountTag) {
    dom.summaryRecordsCountTag.textContent = paged.pages > 1
      ? `符合 ${paged.total} 筆（每張圖最多 ${SUMMARY_PAGE_SIZE} 筆，共 ${paged.pages} 張）`
      : `符合 ${paged.total} 筆`;
  }
  if (dom.summaryPager) {
    dom.summaryPager.style.display = paged.pages > 1 ? 'flex' : 'none';
    dom.summaryPageInfo.textContent = `第 ${paged.page} / ${paged.pages} 頁`;
    dom.btnSummaryPrev.disabled = paged.page <= 1;
    dom.btnSummaryNext.disabled = paged.page >= paged.pages;
  }

  const canvas = dom.summaryCanvas;
  if (!canvas) return;

  await ensureFontsReady();
  if (token !== summaryRenderToken) return;   // 期間又有新的繪製請求，放棄這一次

  const ctx = canvas.getContext('2d');
  const FONT = '"Noto Sans TC", "Microsoft JhengHei", sans-serif';

  // 製表人：以「整個篩選結果」中經手次數最多者；若篩選結果為空，改看該日期全部登記
  let dominantHandler = dominantHandlerOf(summary.items);
  if (!dominantHandler && summary.dateSlug && summary.dateSlug.length === 10) {
    dominantHandler = dominantHandlerOf(
      validRecords().filter(r => textOf(r.createdAt).startsWith(summary.dateSlug)));
  }
  const handlerText = dominantHandler || NO_NAME_TEXT;

  // ==========================================
  // 依本頁資料筆數動態縮放圖片高度與比例
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
  ctx.font = `bold 28px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.fillText('美和科技大學收發室 信件 / 包裹收件摘要', 36, 54);

  // 篩選與日期資訊
  const pageNote = paged.pages > 1 ? `　｜　第 ${paged.page}/${paged.pages} 頁` : '';
  ctx.font = `500 18px ${FONT}`;
  ctx.fillStyle = '#ccfbf1';
  ctx.fillText(
    fitText(ctx, `📅 收件日期：${summary.dateDisplay}　｜　類別狀態：${summary.statusText}　｜　總計：${paged.total} 筆${pageNote}`, logicalWidth - 72),
    36, 96);

  // 提醒備註
  ctx.font = `400 15px ${FONT}`;
  ctx.fillStyle = '#a7f3d0';
  ctx.fillText('🔔 敬請以下名單之師生同仁於上班時間攜帶證件或印章至收發室簽收領取。', 36, 132);

  // 3. 表格標頭 (Height 52px, y = 155)
  const thY = headerHeight;
  ctx.fillStyle = '#f0fdfa';
  ctx.fillRect(0, thY, logicalWidth, tableHeaderHeight);

  ctx.fillStyle = '#b2e2dd';
  ctx.fillRect(0, thY + tableHeaderHeight - 1, logicalWidth, 1);

  // 3 大欄位 X 座標與可用寬度
  const col1X = 50;  const col1W = 260;  // 收件人姓名
  const col2X = 330; const col2W = 330;  // 收件人單位
  const col3X = 680; const col3W = 204;  // 郵件類型

  ctx.font = `bold 18px ${FONT}`;
  ctx.fillStyle = '#006d77';
  ctx.textAlign = 'left';
  ctx.fillText('收件人姓名', col1X, thY + 34);
  ctx.fillText('收件人單位', col2X, thY + 34);
  ctx.fillText('郵件類型', col3X, thY + 34);

  // 4. 資料列繪製
  let currentY = thY + tableHeaderHeight;

  if (items.length === 0) {
    // 無資料提示：依實際篩選條件顯示日期與狀態，不固定寫「本日」
    const word = summary.statusMode === 'PENDING' ? '待領取之' : '';
    const emptyText = summary.dateMode === 'ALL'
      ? `📌 歷史全期間尚無${word}信件或包裹登記紀錄`
      : `📌 ${summary.dateDisplay} 尚無${word}信件或包裹登記紀錄`;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, currentY, logicalWidth, rowHeight);
    ctx.font = `500 17px ${FONT}`;
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.fillText(fitText(ctx, emptyText, logicalWidth - 72), logicalWidth / 2, currentY + 32);
    currentY += rowHeight;
  } else {
    items.forEach((item, index) => {
      // 斑馬紋交替底色
      ctx.fillStyle = index % 2 === 0 ? '#ffffff' : '#f8fafc';
      ctx.fillRect(0, currentY, logicalWidth, rowHeight);

      // 分隔底線
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, currentY + rowHeight - 1, logicalWidth, 1);

      // 欄位 1: 收件人姓名 (粗體黑字)；過長則截斷加「…」
      ctx.font = `bold 19px ${FONT}`;
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'left';
      ctx.fillText(fitText(ctx, item.recipient || '--', col1W), col1X, currentY + 33);

      // 欄位 2: 收件人單位 (深灰字)
      ctx.font = `500 18px ${FONT}`;
      ctx.fillStyle = '#334155';
      ctx.fillText(fitText(ctx, item.department || '--', col2W), col2X, currentY + 33);

      // 欄位 3: 郵件類型 (帶有優雅孔雀綠圓角標籤)
      ctx.font = `600 15px ${FONT}`;
      const badgeText = fitText(ctx, item.mailType || '一般掛號', col3W - 24);
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

  // 製表人動態顯示：依篩選結果中經手次數最多者；查無資料時顯示「—」
  ctx.font = `bold 16px ${FONT}`;
  ctx.fillStyle = '#1e293b';
  ctx.textAlign = 'left';
  ctx.fillText(fitText(ctx, `美和科技大學收發室　製表人：${handlerText}`, 520), 36, currentY + 36);

  ctx.font = `500 14px ${FONT}`;
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'right';
  ctx.fillText(`產製時間：${formatCurrentDateTime().slice(0, 16)}`, logicalWidth - 36, currentY + 36);

  summaryView = { page: paged.page, pages: paged.pages, dateSlug: summary.dateSlug };
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

  // 多張圖時，檔名加上頁碼（例如 _第1頁.png），避免後一張覆蓋前一張
  const summary = getSummaryData();
  const pageTag = summaryView.pages > 1 ? `_第${summaryView.page}頁` : '';
  const fileName = `美和科技大學_收件摘要_${summary.dateSlug}${pageTag}.png`;

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
  focusFirstField(dom.signSheetModal);
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

  const filtered = validRecords().filter(item => {
    // 日期過濾
    if (targetDatePrefix) {
      if (!textOf(item.createdAt).startsWith(targetDatePrefix)) {
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
    const timeA = textOf(a.createdAt);
    const timeB = textOf(b.createdAt);
    return sortOrder === 'DESC' ? timeB.localeCompare(timeA) : timeA.localeCompare(timeB);
  });

  return {
    items: filtered,
    dateDisplay: dateDisplay,
    dateMode: dateMode,
    statusMode: statusMode,
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

  // 計算多數經手人；沒有資料時顯示「—」，不寫死人名
  const dominantHandler = dominantHandlerOf(items) || NO_NAME_TEXT;

  // 產生表格列 HTML (欄位順序：郵件類型 -> 寄件人 -> 收件人 -> 收件人單位 -> 編號 -> 簽名欄)
  let tableRowsHtml = '';

  if (items.length === 0) {
    // 依實際篩選條件說明，不固定寫「本日」
    const word = sheetData.statusMode === 'PENDING' ? '待領取之' : '';
    const emptyMsg = sheetData.dateMode === 'ALL'
      ? `目前沒有${word || '任何'}信件或包裹`
      : `${sheetData.dateDisplay}尚無${word}信件或包裹`;
    tableRowsHtml = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px 10px; color: #64748b; font-size: 15px;">
          📌 ${escapeHtml(emptyMsg)}
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
