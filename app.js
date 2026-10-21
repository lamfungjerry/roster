let db = null;
let state = {
  startDate: '',
  weeks: 3,
  includeSaturday: false,
  schedule: [],
  activeDayIndex: 0,
  promptTemplate: window.APP_CONFIG.DEFAULT_PROMPT,
  isKeyboardCollapsed: false
};

window.addEventListener('DOMContentLoaded', () => {
  loadLocalPreferences();
  initKeyboardButtons();
  initDefaultDates();
  generateScheduleSkeleton();
  initFirebaseWithStoredKey();
});

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.innerText = msg;
  toast.classList.remove('opacity-0');
  setTimeout(() => toast.classList.add('opacity-0'), 2000);
}

function triggerHaptic() {
  if (navigator.vibrate) navigator.vibrate(35);
}

function loadLocalPreferences() {
  // 載入週六設定 (預設 false)
  const savedSat = localStorage.getItem('shift_include_saturday');
  state.includeSaturday = savedSat !== null ? (savedSat === 'true') : window.APP_CONFIG.DEFAULT_INCLUDE_SATURDAY;
  const satToggle = document.getElementById('include-sat-toggle');
  if (satToggle) satToggle.checked = state.includeSaturday;
}

function initKeyboardButtons() {
  const grid = document.getElementById('keyboard-grid');
  grid.innerHTML = '';
  window.APP_CONFIG.STAFF_LIST.forEach(staff => {
    const btn = document.createElement('button');
    btn.id = `btn-${staff}`;
    btn.className = 'h-12 rounded-xl bg-slate-900 text-white font-bold text-lg active:scale-95 transition-all shadow-sm';
    btn.innerText = staff;
    btn.onclick = () => inputStaff(staff);
    grid.appendChild(btn);
  });
}

// 展開 / 收起虛擬鍵盤
function toggleKeyboard() {
  state.isKeyboardCollapsed = !state.isKeyboardCollapsed;
  const grid = document.getElementById('keyboard-grid');
  const main = document.getElementById('main-content');
  const icon = document.getElementById('dock-icon');

  if (state.isKeyboardCollapsed) {
    grid.classList.add('hidden');
    icon.innerText = '▲';
    main.className = 'max-w-md mx-auto p-3 safe-bottom-collapsed';
  } else {
    grid.classList.remove('hidden');
    icon.innerText = '▼';
    main.className = 'max-w-md mx-auto p-3 safe-bottom-expanded';
  }
}

function initDefaultDates() {
  const d = new Date();
  const day = d.getDay();
  const diff = (day === 0 ? 1 : (8 - day));
  d.setDate(d.getDate() + diff);
  const iso = d.toISOString().split('T')[0];
  state.startDate = iso;
  document.getElementById('start-date').value = iso;
}

function onDateConfigChange() {
  state.startDate = document.getElementById('start-date').value;
  state.weeks = parseInt(document.getElementById('weeks-select').value, 10);
  generateScheduleSkeleton();
  saveCloudData();
}

function toggleSaturdaySetting() {
  state.includeSaturday = document.getElementById('include-sat-toggle').checked;
  localStorage.setItem('shift_include_saturday', state.includeSaturday);
  generateScheduleSkeleton();
  saveCloudData();
  showToast(state.includeSaturday ? '已開啟星期六排班' : '已關閉星期六排班');
}

// 判斷某日是否為休息日（週日固定休；週六看設定）
function isRestDay(dayIdx) {
  if (dayIdx === 0) return true; // 週日
  if (dayIdx === 6 && !state.includeSaturday) return true; // 週六
  return false;
}

function generateScheduleSkeleton(existingMap = {}) {
  const list = [];
  const totalDays = state.weeks * 7;
  const start = new Date(state.startDate);

  for (let i = 0; i < totalDays; i++) {
    const curr = new Date(start);
    curr.setDate(start.getDate() + i);
    const iso = curr.toISOString().split('T')[0];
    const dayIdx = curr.getDay();
    const isAutoRest = isRestDay(dayIdx);

    list.push({
      date: iso,
      dayIdx: dayIdx,
      dayName: window.APP_CONFIG.WEEK_DAYS[dayIdx],
      isRest: isAutoRest,
      isFullDayHoliday: existingMap[iso]?.isFullDayHoliday || false,
      shifts: existingMap[iso]?.shifts || []
    });
  }
  state.schedule = list;

  const firstActive = list.findIndex(d => !d.isRest && !d.isFullDayHoliday && d.shifts.length < 6);
  state.activeDayIndex = firstActive !== -1 ? firstActive : 0;
  renderSchedule();
  updateActiveDock();
}

// 渲染卡片：等寬標籤、無刪除線
function renderSchedule() {
  const container = document.getElementById('schedule-container');
  container.innerHTML = '';

  state.schedule.forEach((day, idx) => {
    const isActive = (idx === state.activeDayIndex);
    const card = document.createElement('div');

    let borderClass = isActive 
      ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm' 
      : day.isRest 
        ? 'bg-slate-200/40 border-slate-200/60 opacity-60' 
        : day.isFullDayHoliday 
          ? 'bg-amber-50/70 border-amber-200' 
          : 'bg-white border-slate-200/80 shadow-xs';

    card.className = `p-2.5 rounded-xl border transition-all ${borderClass}`;
    card.onclick = () => selectActiveDay(idx);

    let badge = '';
    if (day.isRest) {
      badge = `<span class="text-[10px] font-semibold text-slate-500">週${day.dayName}休</span>`;
    } else if (day.isFullDayHoliday) {
      badge = `<span class="text-[10px] font-bold text-amber-700">🌴 全休</span>`;
    } else {
      badge = `<span class="text-[10px] text-slate-400 font-medium">${day.shifts.length}/6</span>`;
    }

    let shiftsHtml = '';
    if (!day.isRest && !day.isFullDayHoliday) {
      shiftsHtml = `<div class="flex flex-wrap gap-1.5 mt-2">
        ${day.shifts.map((s, sIdx) => `
          <button onclick="event.stopPropagation(); toggleShiftStatus(${idx},${sIdx});" 
            class="staff-badge ${s.status === 'ON' ? 'staff-badge-on' : 'staff-badge-off'}">
            ${s.staff}${s.status === 'OFF' ? '休' : ''}
          </button>
        `).join('')}
      </div>`;
    }

    card.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold ${isActive ? 'text-indigo-600 font-black' : 'text-slate-700'}">
          ${day.date.substring(5)} (${day.dayName})
        </span>
        ${badge}
      </div>
      ${shiftsHtml}
    `;
    container.appendChild(card);
  });
}

function selectActiveDay(idx) {
  state.activeDayIndex = idx;
  renderSchedule();
  updateActiveDock();
}

function updateActiveDock() {
  const active = state.schedule[state.activeDayIndex];
  const label = document.getElementById('active-day-label');
  if (!active) {
    label.innerText = '--';
    return;
  }
  label.innerText = `${active.date.substring(5)} (${active.dayName})`;

  const isLocked = active.isRest || active.isFullDayHoliday;
  const enteredStaff = active.shifts.map(s => s.staff);

  window.APP_CONFIG.STAFF_LIST.forEach(staff => {
    const btn = document.getElementById(`btn-${staff}`);
    if (!btn) return;
    const alreadyEntered = enteredStaff.includes(staff);
    if (isLocked || alreadyEntered) {
      btn.disabled = true;
      btn.classList.add('opacity-20', 'pointer-events-none');
    } else {
      btn.disabled = false;
      btn.classList.remove('opacity-20', 'pointer-events-none');
    }
  });
}

function inputStaff(staff) {
  triggerHaptic();
  const current = state.schedule[state.activeDayIndex];
  if (!current || current.isRest || current.isFullDayHoliday) return;

  if (!current.shifts.some(s => s.staff === staff)) {
    current.shifts.push({ staff: staff, status: 'ON' });
  }

  if (current.shifts.length >= 6) {
    jumpNextDay();
  } else {
    renderSchedule();
    updateActiveDock();
  }
  debounceSave();
}

function toggleShiftStatus(dayIdx, shiftIdx) {
  triggerHaptic();
  const shift = state.schedule[dayIdx].shifts[shiftIdx];
  shift.status = (shift.status === 'ON' ? 'OFF' : 'ON');
  renderSchedule();
  debounceSave();
}

function toggleActiveFullHoliday() {
  triggerHaptic();
  const current = state.schedule[state.activeDayIndex];
  if (!current || current.isRest) return;

  current.isFullDayHoliday = !current.isFullDayHoliday;
  if (current.isFullDayHoliday) {
    current.shifts = [];
    jumpNextDay();
  } else {
    renderSchedule();
    updateActiveDock();
  }
  debounceSave();
}

function clearActiveDay() {
  const current = state.schedule[state.activeDayIndex];
  if (!current) return;
  current.shifts = [];
  current.isFullDayHoliday = false;
  renderSchedule();
  updateActiveDock();
  debounceSave();
}

// 跳到下一個需要排班的工作日（自動跳過公休日）
function jumpNextDay() {
  let next = state.activeDayIndex + 1;
  while (next < state.schedule.length && state.schedule[next].isRest) {
    next++;
  }
  if (next < state.schedule.length) state.activeDayIndex = next;
  renderSchedule();
  updateActiveDock();
  setTimeout(() => {
    const container = document.getElementById('schedule-container');
    if (container.children[state.activeDayIndex]) {
      container.children[state.activeDayIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 50);
}

// 電腦批次匯入解析器
function openImportModal() {
  document.getElementById('import-text-input').value = '';
  document.getElementById('import-modal').classList.remove('hidden');
}

function closeImportModal() {
  document.getElementById('import-modal').classList.add('hidden');
}

function fillImportExample() {
  const example = `Y I S K C V\nC V K Y I S\nV休 C Y S I K\n全休\nS K C V Y I`;
  document.getElementById('import-text-input').value = example;
}

function executeBatchImport() {
  const rawText = document.getElementById('import-text-input').value.trim();
  if (!rawText) {
    showToast('請先貼入內容');
    return;
  }

  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  let lineIdx = 0;

  for (let i = 0; i < state.schedule.length; i++) {
    const day = state.schedule[i];
    if (day.isRest) continue; // 自動跳過週日與週六

    if (lineIdx >= lines.length) break;

    const line = lines[lineIdx++];
    if (line.includes('全休') || line.toUpperCase().includes('HOLIDAY')) {
      day.isFullDayHoliday = true;
      day.shifts = [];
      continue;
    }

    // 解析該行 6 個代號 (支援空格、Tab、逗號)
    const tokens = line.split(/[\s,]+/).filter(t => t.length > 0);
    const parsedShifts = [];

    tokens.forEach(tok => {
      const match = tok.match(/([A-Za-z])/);
      if (match) {
        const staffChar = match[1].toUpperCase();
        if (window.APP_CONFIG.STAFF_LIST.includes(staffChar)) {
          const isOff = tok.includes('休') || tok.toUpperCase().includes('OFF');
          parsedShifts.push({
            staff: staffChar,
            status: isOff ? 'OFF' : 'ON'
          });
        }
      }
    });

    if (parsedShifts.length > 0) {
      day.isFullDayHoliday = false;
      day.shifts = parsedShifts.slice(0, 6);
    }
  }

  renderSchedule();
  updateActiveDock();
  saveCloudData();
  closeImportModal();
  showToast('✅ 匯入成功並已同步');
}

// 統計計算
function calculateStatistics() {
  const stats = {};
  window.APP_CONFIG.STAFF_LIST.forEach(s => stats[s] = { on: 0, off: 0 });
  let totalWorkSlots = 0;

  state.schedule.forEach(day => {
    if (!day.isRest && !day.isFullDayHoliday) {
      day.shifts.forEach(shift => {
        if (shift.status === 'ON') {
          stats[shift.staff].on++;
          totalWorkSlots++;
        } else if (shift.status === 'OFF') {
          stats[shift.staff].off++;
        }
      });
    }
  });
  const avgWorkDays = (totalWorkSlots / 6).toFixed(1);
  return { stats, avgWorkDays };
}

function openStatsModal() {
  const { stats, avgWorkDays } = calculateStatistics();
  let html = `
    <div class="mb-3 p-2.5 bg-indigo-50 rounded-xl text-xs text-indigo-900 flex justify-between items-center">
      <span>6 人平均出勤：</span>
      <span class="text-sm font-extrabold text-indigo-600">${avgWorkDays} 天</span>
    </div>
    <div class="border border-slate-200 rounded-xl overflow-hidden text-xs">
      <table class="w-full text-center">
        <thead class="bg-slate-50 text-slate-500 border-b">
          <tr>
            <th class="py-1.5">員工</th>
            <th class="py-1.5">實出勤</th>
            <th class="py-1.5">輪休</th>
            <th class="py-1.5">落差</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
  `;
  window.APP_CONFIG.STAFF_LIST.forEach(staff => {
    const s = stats[staff];
    const diff = (s.on - avgWorkDays).toFixed(1);
    const diffStr = diff > 0 ? `+${diff}` : diff;
    const isImbalance = Math.abs(diff) >= 2;
    html += `
      <tr>
        <td class="py-2 font-bold text-slate-800">${staff}</td>
        <td class="py-2 font-semibold text-slate-900">${s.on}</td>
        <td class="py-2 text-slate-500">${s.off}</td>
        <td class="py-2 ${isImbalance ? 'text-amber-600 font-bold' : 'text-slate-400'}">${diffStr}</td>
      </tr>
    `;
  });
  html += `</tbody></table></div>`;
  document.getElementById('stats-content').innerHTML = html;
  document.getElementById('stats-modal').classList.remove('hidden');
}

function closeStatsModal() {
  document.getElementById('stats-modal').classList.add('hidden');
}

async function copySuperPrompt() {
  const { stats, avgWorkDays } = calculateStatistics();
  const dateRangeStr = `${state.schedule[0]?.date || ''} 至 ${state.schedule[state.schedule.length - 1]?.date || ''}`;

  let statText = `【週期出勤統計 (平均：${avgWorkDays} 天)】\n`;
  window.APP_CONFIG.STAFF_LIST.forEach(st => {
    const diff = (stats[st].on - avgWorkDays).toFixed(1);
    statText += `員工 ${st}：出勤 ${stats[st].on} 天 | 輪休 ${stats[st].off} 天 | 落差 ${diff > 0 ? '+' : ''}${diff}\n`;
  });

  const jsonPayload = JSON.stringify({
    period: dateRangeStr,
    staff: window.APP_CONFIG.STAFF_LIST,
    schedule: state.schedule.map(d => ({
      date: d.date,
      dayOfWeek: d.dayName,
      isFullDayHoliday: d.isFullDayHoliday,
      shifts: d.shifts
    }))
  }, null, 2);

  let finalPrompt = state.promptTemplate
    .replace('{{DATE_RANGE}}', dateRangeStr)
    .replace('{{STATISTICS}}', statText)
    .replace('{{SCHEDULE_DATA}}', jsonPayload);

  try {
    await navigator.clipboard.writeText(finalPrompt);
    showToast('✅ 已複製！可前往貼上');
  } catch (err) {
    showToast('請手動選取複製');
  }
}

// 設定與 Key 隱私顯示控制
function openSettingsModal() {
  const hasKey = !!localStorage.getItem('shift_firebase_api_key');
  const savedBox = document.getElementById('key-saved-container');
  const inputBox = document.getElementById('key-input-container');
  const cancelBtn = document.getElementById('cancel-key-btn');
  const keyInput = document.getElementById('api-key-input');

  keyInput.value = ''; // 永遠清空，絕不顯示真實 Key

  if (hasKey) {
    savedBox.classList.remove('hidden');
    inputBox.classList.add('hidden');
    cancelBtn.classList.remove('hidden');
  } else {
    savedBox.classList.add('hidden');
    inputBox.classList.remove('hidden');
    cancelBtn.classList.add('hidden');
  }

  document.getElementById('prompt-template-input').value = state.promptTemplate;
  document.getElementById('include-sat-toggle').checked = state.includeSaturday;
  document.getElementById('settings-modal').classList.remove('hidden');
}

function closeSettingsModal() {
  document.getElementById('settings-modal').classList.add('hidden');
}

function showKeyInputForm() {
  document.getElementById('key-saved-container').classList.add('hidden');
  document.getElementById('key-input-container').classList.remove('hidden');
}

function hideKeyInputForm() {
  document.getElementById('key-saved-container').classList.remove('hidden');
  document.getElementById('key-input-container').classList.add('hidden');
}

function saveApiKey() {
  const key = document.getElementById('api-key-input').value.trim();
  if (!key) {
    showToast('請輸入新 Key');
    return;
  }
  localStorage.setItem('shift_firebase_api_key', key);
  showToast('Key 已安全更新');
  setTimeout(() => location.reload(), 600);
}

function savePromptTemplate() {
  const val = document.getElementById('prompt-template-input').value;
  state.promptTemplate = val;
  localStorage.setItem('shift_prompt_template', val);
  if (db) db.ref('config/promptTemplate').set(val);
  showToast('Prompt 模板已更新');
  closeSettingsModal();
}

function resetDefaultPrompt() {
  document.getElementById('prompt-template-input').value = window.APP_CONFIG.DEFAULT_PROMPT;
}

// 初始化 Firebase
function initFirebaseWithStoredKey() {
  const promptSaved = localStorage.getItem('shift_prompt_template');
  if (promptSaved) state.promptTemplate = promptSaved;

  const apiKey = localStorage.getItem('shift_firebase_api_key');
  if (!apiKey) {
    document.getElementById('sync-badge').innerText = '未綁定 Key (點此)';
    document.getElementById('sync-badge').className = 'text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium cursor-pointer';
    return;
  }

  try {
    const fullConfig = {
      ...window.APP_CONFIG.firebaseBase,
      apiKey: apiKey
    };

    if (!firebase.apps.length) firebase.initializeApp(fullConfig);
    db = firebase.database();
    
    document.getElementById('sync-badge').innerText = '同步中...';
    document.getElementById('sync-badge').className = 'text-[11px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium cursor-pointer';

    const path = window.APP_CONFIG.dbPath || 'roster_data';
    db.ref(path).once('value').then(snap => {
      if (snap.exists()) {
        const val = snap.val();
        state.startDate = val.startDate || state.startDate;
        state.weeks = val.weeks || state.weeks;
        document.getElementById('start-date').value = state.startDate;
        document.getElementById('weeks-select').value = state.weeks;
        
        const map = {};
        (val.schedule || []).forEach(d => {
          map[d.date] = { shifts: d.shifts, isFullDayHoliday: d.isFullDayHoliday };
        });
        generateScheduleSkeleton(map);
      }
      document.getElementById('sync-badge').innerText = '已連線';
      document.getElementById('sync-badge').className = 'text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium cursor-pointer';
    }).catch(() => {
      document.getElementById('sync-badge').innerText = '連線異常';
      document.getElementById('sync-badge').className = 'text-[11px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-medium cursor-pointer';
    });

  } catch (e) {
    console.error(e);
  }
}

let saveTimeout = null;
function debounceSave() {
  if (!db) return;
  document.getElementById('sync-badge').innerText = '儲存中...';
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveCloudData, 800);
}

function saveCloudData() {
  if (!db) return;
  const payload = {
    startDate: state.startDate,
    weeks: state.weeks,
    schedule: state.schedule,
    updatedAt: new Date().toISOString()
  };
  const path = window.APP_CONFIG.dbPath || 'roster_data';
  db.ref(path).set(payload).then(() => {
    document.getElementById('sync-badge').innerText = '已連線';
  });
}
