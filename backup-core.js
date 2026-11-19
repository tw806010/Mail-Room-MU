/**
 * 資料安全與備份管理 - 核心邏輯（純邏輯，不碰 DOM，可獨立測試）
 * 階段 0：儲存層抽象（可注入 storage，測試時使用假 storage）
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'meiho_mailroom_records_v1';

  /**
   * 建立儲存層。storage 需具備 getItem / setItem（預設為 window.localStorage）。
   * 不改變正式資料結構：內容仍為紀錄陣列的 JSON 字串。
   */
  function createStore(options) {
    const opts = options || {};
    const storage = opts.storage;
    const key = opts.key || STORAGE_KEY;

    // 「寫入前比對」用：記住最近一次讀取／寫入時儲存內容的原始字串（null 表示當時沒有資料）。
    // synced=false 代表尚未讀取過，此時不比對（維持舊行為）。
    let lastRaw = null;
    let synced = false;
    const normRaw = (r) => (r === undefined || r === '' ? null : r);

    // 讀取：回傳 { records, status, raw, error }
    // status: 'ok' | 'empty' | 'corrupt'；損毀時不修改儲存內容，保留 raw 供搶救
    function load() {
      let raw = null;
      try {
        raw = storage.getItem(key);
      } catch (err) {
        return { records: [], status: 'corrupt', raw: null, error: err };
      }
      lastRaw = normRaw(raw);
      synced = true;
      if (raw === null || raw === undefined || raw === '') {
        return { records: [], status: 'empty', raw: raw, error: null };
      }
      try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
          return { records: [], status: 'corrupt', raw: raw, error: new Error('儲存內容不是陣列') };
        }
        return { records: parsed, status: 'ok', raw: raw, error: null };
      } catch (err) {
        return { records: [], status: 'corrupt', raw: raw, error: err };
      }
    }

    // 寫入：回傳 { ok, error, code? }，不拋出例外。
    // 寫入前先比對儲存內容是否仍等於上次讀取／寫入的內容；若已被其他分頁改動，
    // 拒絕寫入並回傳 { ok:false, code:'STALE_DATA' }，絕不默默覆蓋。
    function save(records) {
      try {
        if (synced) {
          let current = null;
          try { current = normRaw(storage.getItem(key)); } catch (e) { current = lastRaw; }
          if (current !== lastRaw) {
            return { ok: false, code: 'STALE_DATA', error: new Error('儲存內容已被其他視窗或分頁更新') };
          }
        }
        const text = JSON.stringify(records);
        storage.setItem(key, text);
        lastRaw = text;
        synced = true;
        return { ok: true, error: null };
      } catch (err) {
        return { ok: false, error: err };
      }
    }

    // 以原始字串精確還原（用於還原失敗時回復）。raw 為空表示原本沒有資料。
    function restoreRaw(raw) {
      try {
        if (raw === null || raw === undefined) {
          if (typeof storage.removeItem === 'function') storage.removeItem(key);
          else storage.setItem(key, '[]');
        } else {
          storage.setItem(key, raw);
        }
        lastRaw = normRaw(raw);
        synced = true;
        return { ok: true, error: null };
      } catch (err) {
        return { ok: false, error: err };
      }
    }

    return { load, save, restoreRaw, key };
  }

  // ---------------------------------------------------------------
  // 階段 1：唯讀完整性檢查（絕不修改傳入的資料）
  // ---------------------------------------------------------------
  const MAIL_TYPES = ['掛號函件', '掛號包裹', '快遞包裹', '國際函件', '國際包裹', '限時掛號函件'];
  const STATUSES = ['PENDING', 'RECEIVED'];
  const REQUIRED_TEXT_FIELDS = ['trackingNo', 'mailType', 'sender', 'recipient', 'department', 'handler'];
  const DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;

  // 嚴格解析 YYYY-MM-DD HH:mm:ss，回傳 Date 或 null（會擋掉 2026-02-30 這類不存在的日期）
  function parseDateTime(str) {
    if (typeof str !== 'string') return null;
    const m = DATETIME_RE.exec(str);
    if (!m) return null;
    const [y, mo, d, h, mi, s] = m.slice(1).map(Number);
    const dt = new Date(y, mo - 1, d, h, mi, s);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d ||
        dt.getHours() !== h || dt.getMinutes() !== mi || dt.getSeconds() !== s) return null;
    return dt;
  }

  function isBlank(v) {
    return typeof v !== 'string' || v.trim() === '';
  }

  /**
   * 檢查紀錄陣列。回傳：
   * { ok, total, errorCount, warningCount, issues: [{severity, code, index, id, message}] }
   * severity: 'error'（資料有問題）| 'warning'（值得留意，不一定有誤）
   * options.now 可注入現在時間以利測試。
   */
  function checkIntegrity(records, options) {
    const now = (options && options.now) || new Date();
    const issues = [];
    const add = (severity, code, index, rec, message) => {
      issues.push({
        severity, code, index,
        id: rec && typeof rec.id === 'string' ? rec.id : null,
        message
      });
    };

    if (!Array.isArray(records)) {
      add('error', 'NOT_ARRAY', -1, null, '紀錄資料不是陣列');
      return summarize(issues, 0);
    }

    const idFirst = new Map();      // id -> 第一次出現的 index
    const keyFirst = new Map();     // 編號+建立時間 -> index
    const trackingFirst = new Map(); // 編號 -> index

    records.forEach((rec, i) => {
      if (rec === null || typeof rec !== 'object' || Array.isArray(rec)) {
        add('error', 'NOT_OBJECT', i, null, `第 ${i + 1} 筆不是有效的紀錄物件`);
        return;
      }
      const label = `第 ${i + 1} 筆`;

      // ID
      if (isBlank(rec.id)) {
        add('error', 'MISSING_ID', i, rec, `${label}缺少 ID`);
      } else if (idFirst.has(rec.id)) {
        add('error', 'DUPLICATE_ID', i, rec,
          `${label}的 ID「${rec.id}」與第 ${idFirst.get(rec.id) + 1} 筆重複`);
      } else {
        idFirst.set(rec.id, i);
      }

      // 必要欄位
      REQUIRED_TEXT_FIELDS.forEach(f => {
        if (isBlank(rec[f])) add('error', 'MISSING_FIELD', i, rec, `${label}缺少必要欄位「${f}」`);
      });

      // 郵件類型
      if (!isBlank(rec.mailType) && MAIL_TYPES.indexOf(rec.mailType) === -1) {
        add('warning', 'UNKNOWN_MAIL_TYPE', i, rec, `${label}的郵件類型「${rec.mailType}」不在標準清單內`);
      }

      // 建立日期
      const created = parseDateTime(rec.createdAt);
      if (isBlank(rec.createdAt)) {
        add('error', 'MISSING_FIELD', i, rec, `${label}缺少必要欄位「createdAt」`);
      } else if (!created) {
        add('error', 'INVALID_DATE', i, rec, `${label}的建立時間格式或日期無效：「${rec.createdAt}」`);
      } else if (created.getTime() > now.getTime()) {
        add('warning', 'FUTURE_DATE', i, rec, `${label}的建立時間晚於目前時間：「${rec.createdAt}」`);
      }

      // 領取狀態
      if (STATUSES.indexOf(rec.status) === -1) {
        add('error', 'INVALID_STATUS', i, rec, `${label}的狀態無效：「${rec.status}」`);
      } else if (rec.status === 'RECEIVED') {
        const received = parseDateTime(rec.receivedAt);
        if (isBlank(rec.receivedAt)) {
          add('error', 'RECEIVED_NO_TIME', i, rec, `${label}已領取但缺少領取時間`);
        } else if (!received) {
          add('error', 'INVALID_DATE', i, rec, `${label}的領取時間格式或日期無效：「${rec.receivedAt}」`);
        } else if (created && received.getTime() < created.getTime()) {
          add('warning', 'RECEIVED_BEFORE_CREATED', i, rec, `${label}的領取時間早於建立時間`);
        }
        if (isBlank(rec.receivedSigner)) {
          add('warning', 'RECEIVED_NO_SIGNER', i, rec, `${label}已領取但缺少簽收人`);
        }
      } else {
        if (!isBlank(rec.receivedAt) || !isBlank(rec.receivedSigner)) {
          add('warning', 'PENDING_HAS_RECEIVED_INFO', i, rec, `${label}為待領取，卻帶有領取時間或簽收人`);
        }
      }

      // 重複紀錄
      if (!isBlank(rec.trackingNo)) {
        const key = rec.trackingNo + '_' + rec.createdAt;
        if (keyFirst.has(key)) {
          add('error', 'DUPLICATE_RECORD', i, rec,
            `${label}與第 ${keyFirst.get(key) + 1} 筆的「編號＋建立時間」完全相同（疑似重複登記）`);
        } else {
          keyFirst.set(key, i);
          if (trackingFirst.has(rec.trackingNo)) {
            add('warning', 'DUPLICATE_TRACKING_NO', i, rec,
              `${label}的編號「${rec.trackingNo}」與第 ${trackingFirst.get(rec.trackingNo) + 1} 筆相同（建立時間不同）`);
          }
        }
        if (!trackingFirst.has(rec.trackingNo)) trackingFirst.set(rec.trackingNo, i);
      }
    });

    return summarize(issues, records.length);
  }

  function summarize(issues, total) {
    const errorCount = issues.filter(x => x.severity === 'error').length;
    const warningCount = issues.length - errorCount;
    return { ok: errorCount === 0, total, errorCount, warningCount, issues };
  }

  // ---------------------------------------------------------------
  // 階段 2：JSON 備份驗證（匯入前呼叫；唯讀，不寫入任何資料）
  // ---------------------------------------------------------------
  const BACKUP_SYSTEM_NAME = '美和科技大學收發室信件登記系統';
  const SUPPORTED_MAJOR_VERSION = 1;

  /**
   * 驗證備份檔文字內容。回傳：
   * { ok, format, version, backupTime, declaredTotal, recordCount,
   *   errors[], warnings[], integrity, records }
   * format: 'versioned'（現行匯出格式）| 'legacy-array'（舊版純陣列）| 'unknown'
   * errors 非空 → ok=false，records 為 null（不可還原）。
   * 為保持既有備份可用：個別紀錄的欄位瑕疵只列為警告（細節在 integrity），
   * 僅「非物件」或「編號與收件人皆缺」視為致命錯誤（與舊版匯入規則一致）。
   */
  function validateBackup(text) {
    const errors = [];
    const warnings = [];
    const result = {
      ok: false, format: 'unknown', version: null, backupTime: null,
      declaredTotal: null, recordCount: 0, errors, warnings, integrity: null, records: null,
      handlers: null
    };
    const fail = (code, message) => errors.push({ code, message });
    const warn = (code, message) => warnings.push({ code, message });

    if (typeof text !== 'string' || text.trim() === '') {
      fail('EMPTY_FILE', '備份檔是空的');
      return result;
    }
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1); // 去除 BOM

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      fail('INVALID_JSON', '檔案不是有效的 JSON（可能已損毀或被截斷）');
      return result;
    }

    let records;
    if (Array.isArray(parsed)) {
      result.format = 'legacy-array';
      records = parsed;
      warn('LEGACY_ARRAY', '這是舊版純陣列備份，沒有版本、備份時間與筆數資訊，無法核對完整性');
    } else if (parsed !== null && typeof parsed === 'object') {
      if (!Array.isArray(parsed.records)) {
        fail('NO_RECORDS_ARRAY', '找不到 records 紀錄陣列，不是本系統的備份檔');
        return result;
      }
      result.format = 'versioned';
      records = parsed.records;

      // 版本
      if (parsed.version === undefined || parsed.version === null) {
        warn('NO_VERSION', '備份檔沒有版本資訊');
      } else {
        const major = parseInt(String(parsed.version), 10);
        result.version = String(parsed.version);
        if (!/^\d+(\.\d+)*$/.test(String(parsed.version)) || major !== SUPPORTED_MAJOR_VERSION) {
          fail('UNSUPPORTED_VERSION',
            `不支援的備份版本「${parsed.version}」（本系統支援 ${SUPPORTED_MAJOR_VERSION}.x）`);
        }
      }

      // 來源系統
      if (parsed.system !== undefined && parsed.system !== BACKUP_SYSTEM_NAME) {
        warn('SYSTEM_MISMATCH', `備份來源系統名稱「${parsed.system}」與本系統不同`);
      }

      // 備份時間
      if (typeof parsed.backupTime === 'string' && parsed.backupTime.trim() !== '') {
        result.backupTime = parsed.backupTime;
        if (!parseDateTime(parsed.backupTime)) warn('INVALID_BACKUP_TIME', `備份時間格式異常：「${parsed.backupTime}」`);
      } else {
        warn('NO_BACKUP_TIME', '備份檔沒有備份時間');
      }

      // 筆數核對（可偵測檔案被截斷或手動刪改）
      if (parsed.totalRecords === undefined || parsed.totalRecords === null) {
        warn('NO_TOTAL', '備份檔沒有記載總筆數，無法核對');
      } else {
        result.declaredTotal = parsed.totalRecords;
        if (parsed.totalRecords !== records.length) {
          fail('COUNT_MISMATCH',
            `備份檔記載 ${parsed.totalRecords} 筆，實際只有 ${records.length} 筆（檔案可能不完整）`);
        }
      }
    } else {
      fail('UNKNOWN_FORMAT', '備份檔內容不是物件或陣列');
      return result;
    }

    result.recordCount = records.length;

    // 經手人名單（選填；舊備份沒有此欄位，還原時不會動到現有名單）
    if (result.format === 'versioned' && Array.isArray(parsed.handlers)) {
      result.handlers = normalizeHandlers(parsed.handlers);
    }

    // 致命的紀錄錯誤
    records.forEach((r, i) => {
      if (r === null || typeof r !== 'object' || Array.isArray(r)) {
        fail('RECORD_NOT_OBJECT', `第 ${i + 1} 筆不是有效的紀錄物件`);
      } else if (isBlank(r.trackingNo) && isBlank(r.recipient)) {
        fail('RECORD_NO_IDENTIFIER', `第 ${i + 1} 筆同時缺少編號與收件人`);
      }
    });

    // 完整檢查（其餘瑕疵降為警告）
    result.integrity = checkIntegrity(records);
    if (result.integrity.errorCount > 0 || result.integrity.warningCount > 0) {
      warn('RECORD_ISSUES',
        `紀錄檢查發現 ${result.integrity.errorCount} 個錯誤、${result.integrity.warningCount} 個警告，請於預覽中確認`);
    }

    if (records.length === 0) {
      warn('EMPTY_BACKUP', '備份檔內沒有任何紀錄；若選擇「完全覆蓋」將清空目前資料');
    }

    result.ok = errors.length === 0;
    result.records = result.ok ? records : null;
    return result;
  }

  // ---------------------------------------------------------------
  // 階段 3：備份提醒（狀態存放於獨立鍵，不碰正式資料）
  // ---------------------------------------------------------------
  const META_KEY = 'meiho_mailroom_backup_meta_v1';
  const REMIND_AFTER_HOURS = 24;

  function formatDateTime(d) {
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
      `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }

  /**
   * 備份中繼資料：{ lastExportAt, lastExportCount, changesSinceExport }
   * 讀取遇到損毀時回到預設值，所有方法皆不拋例外。
   */
  function createBackupMeta(options) {
    const storage = options.storage;
    const key = options.key || META_KEY;

    function defaults() {
      return { lastExportAt: null, lastExportCount: null, changesSinceExport: 0 };
    }

    function load() {
      try {
        const raw = storage.getItem(key);
        if (!raw) return defaults();
        const m = JSON.parse(raw);
        if (!m || typeof m !== 'object' || Array.isArray(m)) return defaults();
        const changes = Number.isInteger(m.changesSinceExport) && m.changesSinceExport >= 0
          ? m.changesSinceExport : 0;
        return {
          lastExportAt: typeof m.lastExportAt === 'string' ? m.lastExportAt : null,
          lastExportCount: Number.isInteger(m.lastExportCount) ? m.lastExportCount : null,
          changesSinceExport: changes
        };
      } catch (err) {
        return defaults();
      }
    }

    function write(meta) {
      try {
        storage.setItem(key, JSON.stringify(meta));
        return true;
      } catch (err) {
        return false;
      }
    }

    // 成功匯出備份後呼叫：記錄時間並歸零變更數
    function markExported(recordCount, now) {
      return write({
        lastExportAt: formatDateTime(now || new Date()),
        lastExportCount: recordCount,
        changesSinceExport: 0
      });
    }

    // 資料成功寫入（新增 / 修改 / 簽收 / 還原）後呼叫
    function markChanged() {
      const m = load();
      m.changesSinceExport += 1;
      return write(m);
    }

    /**
     * 計算目前提醒狀態。level：
     * 'ok'     已備份且無未備份變更
     * 'info'   超過 24 小時，但期間沒有變更
     * 'notice' 備份後有變更（未滿 24 小時）
     * 'warn'   超過 24 小時且有未備份變更
     * 'danger' 從未備份過，且系統內有資料
     */
    function getStatus(recordCount, now) {
      const m = load();
      const nowDate = now || new Date();
      const last = m.lastExportAt ? parseDateTime(m.lastExportAt) : null;
      const status = {
        level: 'ok', lastExportAt: last ? m.lastExportAt : null, lastExportCount: m.lastExportCount,
        hoursSince: null, unsavedChanges: m.changesSinceExport, overdue: false,
        clockSkew: false, message: ''
      };

      if (!last) {
        status.lastExportAt = null;
        if (recordCount > 0) {
          status.level = 'danger';
          status.message = `尚未備份過，目前有 ${recordCount} 筆紀錄只存在這個瀏覽器中，建議立即匯出完整備份`;
        } else {
          status.message = '目前沒有資料，尚無需備份';
        }
        return status;
      }

      let hours = (nowDate.getTime() - last.getTime()) / 3600000;
      if (hours < 0) { status.clockSkew = true; hours = 0; }
      status.hoursSince = hours;
      status.overdue = hours >= REMIND_AFTER_HOURS;
      const changes = m.changesSinceExport;

      if (status.overdue && changes > 0) {
        status.level = 'warn';
        status.message = `距上次備份已超過 ${REMIND_AFTER_HOURS} 小時，且有 ${changes} 項未備份的變更，請盡快備份`;
      } else if (status.overdue) {
        status.level = 'info';
        status.message = `距上次備份已超過 ${REMIND_AFTER_HOURS} 小時（期間沒有資料變更）`;
      } else if (changes > 0) {
        status.level = 'notice';
        status.message = `上次備份後有 ${changes} 項未備份的變更`;
      } else {
        status.message = '資料已完整備份';
      }
      if (status.clockSkew) status.message += '（電腦時間早於上次備份時間，請檢查系統時鐘）';
      return status;
    }

    return { load, markExported, markChanged, getStatus, key };
  }

  // ---------------------------------------------------------------
  // 階段 4：還原預覽、差異比較、受保護的還原流程
  // ---------------------------------------------------------------
  const COMPARE_FIELDS = ['trackingNo', 'mailType', 'sender', 'recipient', 'department',
    'handler', 'remark', 'createdAt', 'status', 'receivedAt', 'receivedSigner'];

  const norm = (v) => (v === null || v === undefined ? '' : v);
  const keyOf = (r) => `${r.trackingNo}_${r.createdAt}`;
  const isRec = (r) => r !== null && typeof r === 'object' && !Array.isArray(r);

  /**
   * 比較現有紀錄與備份紀錄（唯讀）。配對規則與既有「合併」一致：
   * 以 id 相同，或「編號＋建立時間」相同視為同一筆。
   * 回傳 { added, identical, changed:[{current,incoming,fields}], duplicateInBackup, onlyInCurrent }
   */
  function diffRecords(current, incoming) {
    const byId = new Map();
    const byKey = new Map();
    current.forEach((r, i) => {
      if (!isRec(r)) return;
      if (r.id !== undefined && r.id !== null && !byId.has(r.id)) byId.set(r.id, i);
      if (!byKey.has(keyOf(r))) byKey.set(keyOf(r), i);
    });

    const out = { added: [], identical: [], changed: [], duplicateInBackup: [], onlyInCurrent: [] };
    const matched = new Set();
    const seenIds = new Set();
    const seenKeys = new Set();

    incoming.forEach((inc) => {
      if (!isRec(inc)) return;
      let idx;
      if (inc.id !== undefined && inc.id !== null && byId.has(inc.id)) idx = byId.get(inc.id);
      else if (byKey.has(keyOf(inc))) idx = byKey.get(keyOf(inc));

      if (idx !== undefined) {
        matched.add(idx);
        const cur = current[idx];
        const fields = COMPARE_FIELDS.filter(f => norm(cur[f]) !== norm(inc[f]));
        if (fields.length === 0) out.identical.push(inc);
        else out.changed.push({ current: cur, incoming: inc, fields });
        return;
      }
      const dupId = inc.id !== undefined && inc.id !== null && seenIds.has(inc.id);
      if (dupId || seenKeys.has(keyOf(inc))) {
        out.duplicateInBackup.push(inc);
        return;
      }
      if (inc.id !== undefined && inc.id !== null) seenIds.add(inc.id);
      seenKeys.add(keyOf(inc));
      out.added.push(inc);
    });

    current.forEach((r, i) => { if (!matched.has(i)) out.onlyInCurrent.push(r); });
    return out;
  }

  /**
   * 預先計算還原後的結果（純函式，不寫入）。mode: 'merge' | 'replace'
   * 回傳 { mode, resultRecords, summary }
   */
  // 產生新的唯一 ID，格式同登記時的 'MAIL_' + 時間戳 + '_' + 隨機碼
  function defaultIdFactory() {
    return 'MAIL_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
  }

  /**
   * 為缺少 ID（空值／非字串）或 ID 與前面紀錄重複的備份紀錄補上新的唯一 ID。
   * 不修改傳入的陣列與物件（被補 ID 的紀錄會以複本取代）。
   * reservedIds：不可使用的既有 ID（例如目前系統內的 ID）。
   * 回傳 { records, generatedIds:Set, fixedMissing, fixedDuplicate }
   */
  function ensureUniqueIds(records, options) {
    const opts = options || {};
    const factory = opts.idFactory || defaultIdFactory;
    const used = new Set(opts.reservedIds || []);
    const generatedIds = new Set();
    let fixedMissing = 0, fixedDuplicate = 0;
    const seen = new Set();

    const fresh = () => {
      let id;
      let guard = 0;
      do { id = factory(); guard++; } while ((used.has(id) || seen.has(id)) && guard < 1000);
      if (used.has(id) || seen.has(id)) id = id + '_' + guard; // 工廠一直回傳相同值時的保險
      return id;
    };

    // 先登記所有「有效且第一次出現」的 ID，避免新 ID 撞到後面才出現的既有 ID
    const firstIdx = new Map();
    records.forEach((r, i) => {
      if (isRec(r) && typeof r.id === 'string' && r.id.trim() !== '' && !firstIdx.has(r.id)) firstIdx.set(r.id, i);
    });
    firstIdx.forEach((i, id) => seen.add(id));

    const out = records.map((r, i) => {
      if (!isRec(r)) return r;
      const hasId = typeof r.id === 'string' && r.id.trim() !== '';
      if (hasId && firstIdx.get(r.id) === i) return r;
      const id = fresh();
      seen.add(id);
      generatedIds.add(id);
      if (hasId) fixedDuplicate++; else fixedMissing++;
      return Object.assign({}, r, { id });
    });
    return { records: out, generatedIds, fixedMissing, fixedDuplicate };
  }

  function planRestore(current, incomingRaw, mode, options) {
    if (mode !== 'merge' && mode !== 'replace') throw new Error('未知的還原模式：' + mode);
    // 備份檔中缺 ID／ID 重複的紀錄，先補上新的唯一 ID（原始備份內容不被修改）
    const reserved = [];
    current.forEach(r => { if (isRec(r) && typeof r.id === 'string') reserved.push(r.id); });
    const fixed = ensureUniqueIds(incomingRaw, {
      reservedIds: reserved, idFactory: options && options.idFactory
    });
    const incoming = fixed.records;

    const diff = diffRecords(current, incoming);
    let resultRecords;
    const summary = {
      mode, before: current.length,
      added: diff.added.length,
      identical: diff.identical.length,
      changedFound: diff.changed.length,
      duplicateInBackup: diff.duplicateInBackup.length,
      overwritten: 0, removed: 0, keptCurrent: 0, after: 0, idsFixed: 0
    };
    if (mode === 'merge') {
      resultRecords = current.concat(diff.added);
      const t = (x) => (isRec(x) && typeof x.createdAt === 'string' ? x.createdAt : '');
      resultRecords.sort((a, b) => t(b).localeCompare(t(a)));
      summary.keptCurrent = diff.changed.length; // 合併時衝突一律保留現有版本
    } else {
      resultRecords = incoming.slice();
      summary.overwritten = diff.changed.length;
      summary.removed = diff.onlyInCurrent.length;
    }
    summary.after = resultRecords.length;
    // 只計算真的會寫入結果的紀錄（合併時被判定為重複而略過的不算）
    summary.idsFixed = resultRecords.filter(r => isRec(r) && fixed.generatedIds.has(r.id)).length;
    return { mode, resultRecords, summary, diff };
  }

  /**
   * 受保護的還原。必要條件：
   *  - options.preBackupConfirmed === true（呼叫端已讓使用者保存目前資料）
   *  - 完全覆蓋另需 options.overwriteConfirmed === true（二次確認）
   * 流程：重讀儲存 → 比對是否與記憶體一致 → 寫入 → 重新讀取驗證 → 不符則回復原始字串。
   * 回傳 { ok, stage, code, message, plan, verification, rolledBack, records }
   */
  function executeRestore(options) {
    const { store, currentRecords, incoming, mode } = options;
    const fail = (stage, code, message, extra) =>
      Object.assign({ ok: false, stage, code, message, rolledBack: false, plan: null, verification: null, records: null }, extra || {});

    if (options.preBackupConfirmed !== true) {
      return fail('precheck', 'PRE_BACKUP_REQUIRED', '還原前必須先保存目前資料');
    }
    if (mode === 'replace' && options.overwriteConfirmed !== true) {
      return fail('precheck', 'OVERWRITE_NOT_CONFIRMED', '完全覆蓋需要二次確認');
    }
    if (mode !== 'merge' && mode !== 'replace') {
      return fail('precheck', 'BAD_MODE', '未知的還原模式');
    }
    if (!Array.isArray(incoming)) {
      return fail('precheck', 'BAD_INPUT', '備份資料無效');
    }

    // 以儲存中的實際內容為準，避免在其他視窗已變更資料時覆蓋掉新資料
    const before = store.load();
    if (before.status === 'ok' && JSON.stringify(before.records) !== JSON.stringify(currentRecords)) {
      return fail('precheck', 'STALE_DATA', '儲存的資料與畫面不一致（可能在其他視窗已被修改），請重新整理頁面後再試');
    }
    const baseRecords = before.status === 'ok' ? before.records : [];
    const plan = planRestore(baseRecords, incoming, mode);

    const w = store.save(plan.resultRecords);
    if (!w.ok && w.code === 'STALE_DATA') {
      return fail('write', 'STALE_DATA', '儲存的資料剛剛被其他視窗修改，為避免覆蓋已中止，請重新整理頁面後再試', { plan });
    }
    if (!w.ok) {
      // 寫入失敗：setItem 未成功，原資料應保持不變，仍檢查一次
      const chk = store.load();
      const intact = chk.raw === before.raw;
      return fail('write', 'WRITE_FAILED',
        '儲存失敗（可能瀏覽器儲存空間不足），原有資料' + (intact ? '未受影響' : '狀態異常，請立即檢查'),
        { plan, error: w.error, rolledBack: false });
    }

    const after = store.load();
    const problems = [];
    if (after.status !== 'ok') problems.push('還原後重新讀取失敗');
    else {
      if (after.records.length !== plan.resultRecords.length) {
        problems.push(`筆數不符：預期 ${plan.resultRecords.length}，實際 ${after.records.length}`);
      }
      if (JSON.stringify(after.records) !== JSON.stringify(plan.resultRecords)) {
        problems.push('重新讀取的內容與預期不一致');
      }
    }
    const verification = { ok: problems.length === 0, problems, count: after.records.length };

    if (!verification.ok) {
      const rb = store.restoreRaw(before.raw);
      const again = store.load();
      const restored = rb.ok && again.raw === before.raw;
      return fail('verify', 'VERIFY_FAILED',
        '還原後驗證失敗，' + (restored ? '已自動回復為還原前的資料' : '自動回復也失敗，請立即使用還原前保存的備份檔'),
        { plan, verification, rolledBack: restored });
    }

    return {
      ok: true, stage: 'done', code: 'OK', message: '還原完成並通過驗證',
      plan, verification, rolledBack: false, records: after.records
    };
  }

  // ---------------------------------------------------------------
  // 階段 5：儲存失敗防護與損毀資料保存
  // ---------------------------------------------------------------
  const CORRUPT_STASH_KEY = 'meiho_mailroom_corrupt_stash_v1';
  const STASH_MAX_ENTRIES = 3;
  const STASH_MAX_CHARS = 2000000;

  // 將儲存例外轉為使用者看得懂的原因
  function classifySaveError(err) {
    const name = err && err.name ? String(err.name) : '';
    const code = err && typeof err.code === 'number' ? err.code : null;
    if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED' || code === 22 || code === 1014) {
      return { kind: 'quota', message: '瀏覽器儲存空間已滿' };
    }
    if (name === 'SecurityError') {
      return { kind: 'security', message: '瀏覽器禁止存取儲存空間（可能是無痕模式或已封鎖網站資料）' };
    }
    return { kind: 'unknown', message: '瀏覽器儲存發生未知錯誤' };
  }

  /**
   * 損毀資料保存區：讀到損毀的原始字串時，先另存一份再讓系統繼續運作，
   * 避免下一次儲存直接蓋掉可供搶救的原文。保留最新 3 份，內容相同不重複存。
   */
  function createCorruptStash(options) {
    const storage = options.storage;
    const key = options.key || CORRUPT_STASH_KEY;

    function list() {
      try {
        const raw = storage.getItem(key);
        if (!raw) return [];
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr)) return [];
        return arr.filter(e => e && typeof e.raw === 'string' && typeof e.savedAt === 'string');
      } catch (err) {
        return [];
      }
    }

    // 回傳 { ok, reason }；reason: 'duplicate'（已存過）| 'too_large' | 'write_failed' | 'empty'
    function stash(raw, now) {
      if (typeof raw !== 'string' || raw === '') return { ok: false, reason: 'empty' };
      if (raw.length > STASH_MAX_CHARS) return { ok: false, reason: 'too_large' };
      const entries = list();
      if (entries.some(e => e.raw === raw)) return { ok: true, reason: 'duplicate' };
      entries.unshift({ savedAt: formatDateTime(now || new Date()), raw });
      try {
        storage.setItem(key, JSON.stringify(entries.slice(0, STASH_MAX_ENTRIES)));
        return { ok: true, reason: null };
      } catch (err) {
        return { ok: false, reason: 'write_failed' };
      }
    }

    function clear() {
      try {
        if (typeof storage.removeItem === 'function') storage.removeItem(key);
        else storage.setItem(key, '[]');
        return true;
      } catch (err) {
        return false;
      }
    }

    return { list, stash, clear, key };
  }

  // ---------------------------------------------------------------
  // CSV 匯出（防 Excel 科學記號與公式注入）
  // ---------------------------------------------------------------
  const CSV_FORMULA_START = /^[=+\-@\t\r\n]/;

  // 一般欄位：以 = + - @ Tab 或換行開頭者，前面加單引號避免被當成公式
  function toCsvField(val) {
    if (val === null || val === undefined) return '""';
    let s = String(val);
    if (CSV_FORMULA_START.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }

  // 編號欄：輸出為 ="9820012345"，Excel 會視為文字（保留開頭的 0、避免科學記號）。
  // 內容中的雙引號會加倍，字串字面值內的 = + - @ 不會被當成公式執行。
  function toCsvTextFormula(val) {
    if (val === null || val === undefined || val === '') return '""';
    const inner = String(val).replace(/[\r\n]+/g, ' ').replace(/"/g, '""');   // Excel 公式內的字串字面值
    const formula = '="' + inner + '"';
    return '"' + formula.replace(/"/g, '""') + '"';                          // 再依 CSV 規則包一層
  }

  // ---------------------------------------------------------------
  // 登記防呆：相同編號且待領取的既有紀錄
  // ---------------------------------------------------------------
  function findPendingDuplicate(records, trackingNo) {
    const t = String(trackingNo === null || trackingNo === undefined ? '' : trackingNo).trim().toLowerCase();
    if (!t || !Array.isArray(records)) return null;
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      if (isRec(r) && r.status === 'PENDING' && String(r.trackingNo === undefined || r.trackingNo === null ? '' : r.trackingNo).trim().toLowerCase() === t) {
        return r;
      }
    }
    return null;
  }

  // 同一天（dayStr 為 YYYY-MM-DD）內已登記過相同編號的紀錄（不分領取狀態、不分大小寫）；沒有則回傳 null
  function findSameDayDuplicate(records, trackingNo, dayStr) {
    const t = String(trackingNo === null || trackingNo === undefined ? '' : trackingNo).trim().toLowerCase();
    if (!t || !dayStr || !Array.isArray(records)) return null;
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      if (!isRec(r) || typeof r.createdAt !== 'string' || r.createdAt.slice(0, 10) !== dayStr) continue;
      if (String(r.trackingNo === undefined || r.trackingNo === null ? '' : r.trackingNo).trim().toLowerCase() === t) return r;
    }
    return null;
  }

  // ---------------------------------------------------------------
  // 分頁（收件摘要圖片：每張圖最多 N 筆）
  // ---------------------------------------------------------------
  function paginate(items, pageSize, page) {
    const size = Math.max(1, pageSize | 0);
    const total = items.length;
    const pages = Math.max(1, Math.ceil(total / size));
    const p = Math.min(Math.max(1, page | 0 || 1), pages);
    const start = (p - 1) * size;
    return { page: p, pages, pageSize: size, total, start, items: items.slice(start, start + size) };
  }

  // ---------------------------------------------------------------
  // 異動紀錄（updatedAt / history，皆為選填新增欄位）
  // ---------------------------------------------------------------
  const TRACKED_FIELDS = COMPARE_FIELDS;

  // 比較兩個紀錄物件的追蹤欄位，回傳 { 欄位: { from, to } }（沒有差異則為空物件）
  function diffFields(before, after) {
    const changes = {};
    TRACKED_FIELDS.forEach(f => {
      if (norm(before[f]) !== norm(after[f])) changes[f] = { from: norm(before[f]), to: norm(after[f]) };
    });
    return changes;
  }

  // 在紀錄上加入一筆異動（就地修改該紀錄物件）。changes 為空時不記錄，回傳 false。
  function appendHistory(record, action, changes, at) {
    if (!changes || Object.keys(changes).length === 0) return false;
    if (!Array.isArray(record.history)) record.history = [];
    record.history.push({ at, action, changes });
    record.updatedAt = at;
    return true;
  }

  // ---------------------------------------------------------------
  // 經手人名單（存於獨立鍵，不屬於紀錄陣列，不改變紀錄格式）
  // ---------------------------------------------------------------
  const HANDLERS_KEY = 'meiho_mailroom_handlers_v1';
  const HANDLER_OTHER_LABEL = '其他';   // 下拉選單保留字，不可當作經手人姓名
  const HANDLER_MAX_LENGTH = 30;

  // 正規化名單：只留字串、去前後空白、去重、排除空白與保留字，並限制長度
  function normalizeHandlers(list) {
    const out = [];
    if (!Array.isArray(list)) return out;
    list.forEach(v => {
      if (typeof v !== 'string') return;
      const name = v.trim();
      if (!name || name === HANDLER_OTHER_LABEL || name.length > HANDLER_MAX_LENGTH) return;
      if (out.indexOf(name) === -1) out.push(name);
    });
    return out;
  }

  // 由既有紀錄的 handler 欄位產生名單（依出現次數多到少；次數相同者依首次出現順序）
  function handlersFromRecords(records) {
    const counts = new Map();
    (Array.isArray(records) ? records : []).forEach(r => {
      if (!isRec(r) || typeof r.handler !== 'string') return;
      const name = r.handler.trim();
      if (name) counts.set(name, (counts.get(name) || 0) + 1);
    });
    const names = Array.from(counts.keys());
    names.sort((a, b) => counts.get(b) - counts.get(a));   // Array.sort 為穩定排序
    return normalizeHandlers(names);
  }

  // 聯集（保留 a 的順序，再接上 b 中沒有的）
  function mergeHandlers(a, b) {
    return normalizeHandlers([].concat(normalizeHandlers(a), normalizeHandlers(b)));
  }

  /**
   * 經手人名單儲存。load() 回傳 { list, exists }：
   * exists=false 代表從未儲存過（呼叫端可依既有紀錄產生初始名單）。所有方法不拋例外。
   */
  function createHandlerStore(options) {
    const storage = options.storage;
    const key = options.key || HANDLERS_KEY;
    function load() {
      try {
        const raw = storage.getItem(key);
        if (raw === null || raw === undefined || raw === '') return { list: [], exists: false };
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return { list: [], exists: false };
        return { list: normalizeHandlers(parsed), exists: true };
      } catch (err) {
        return { list: [], exists: false };
      }
    }
    function save(list) {
      try {
        storage.setItem(key, JSON.stringify(normalizeHandlers(list)));
        return true;
      } catch (err) {
        return false;
      }
    }
    return { load, save, key };
  }

  // ---------------------------------------------------------------
  // 收件人自動完成：由歷史紀錄比對（純函式，不修改傳入資料）
  // ---------------------------------------------------------------
  function toText(v) { return v === null || v === undefined ? '' : String(v); }

  /**
   * 依輸入文字找出過去登記過的收件人。姓名「包含」輸入文字即符合（不分大小寫）。
   * 每位收件人帶出「最近一次登記」的單位。排序：開頭符合 → 登記次數多 → 最近使用。
   * 回傳 [{ name, department, count }]，最多 limit 筆。
   */
  function suggestRecipients(records, query, limit) {
    const q = toText(query).trim().toLowerCase();
    if (!q || !Array.isArray(records)) return [];
    const byName = new Map();
    records.forEach(r => {
      if (!isRec(r)) return;
      const name = toText(r.recipient).trim();
      if (!name || name.toLowerCase().indexOf(q) === -1) return;
      const at = toText(r.createdAt);
      const e = byName.get(name);
      if (!e) {
        byName.set(name, { name, department: toText(r.department).trim(), count: 1, last: at });
      } else {
        e.count += 1;
        if (at >= e.last) { e.last = at; e.department = toText(r.department).trim(); }
      }
    });
    const list = Array.from(byName.values());
    const starts = (e) => (e.name.toLowerCase().indexOf(q) === 0 ? 0 : 1);
    list.sort((a, b) =>
      (starts(a) - starts(b)) || (b.count - a.count) || b.last.localeCompare(a.last) || a.name.localeCompare(b.name));
    return list.slice(0, Math.max(1, limit | 0 || 8)).map(e => ({ name: e.name, department: e.department, count: e.count }));
  }

  const api = {
    findSameDayDuplicate,
    suggestRecipients,
    HANDLERS_KEY, HANDLER_OTHER_LABEL, HANDLER_MAX_LENGTH,
    normalizeHandlers, handlersFromRecords, mergeHandlers, createHandlerStore,
    ensureUniqueIds, toCsvField, toCsvTextFormula, findPendingDuplicate, paginate,
    diffFields, appendHistory, TRACKED_FIELDS,
    STORAGE_KEY, createStore,
    MAIL_TYPES, STATUSES, parseDateTime, checkIntegrity,
    BACKUP_SYSTEM_NAME, validateBackup,
    META_KEY, REMIND_AFTER_HOURS, createBackupMeta,
    COMPARE_FIELDS, diffRecords, planRestore, executeRestore,
    CORRUPT_STASH_KEY, STASH_MAX_ENTRIES, STASH_MAX_CHARS, classifySaveError, createCorruptStash
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.MailBackupCore = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
