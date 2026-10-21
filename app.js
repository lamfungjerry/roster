let db = null;
let state = {
  startDate: '',
  weeks: 3,
  schedule: [],
  activeDayIndex: 0,
  promptTemplate: window.APP_CONFIG.DEFAULT_PROMPT
};

window.addEventListener('DOMContentLoaded', () => {
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

// 動態生成 6 個員工按鈕
function initKeyboardButtons() {
  const grid = document.getElementById('staff-buttons-grid');
  grid.innerHTML = '';
  window.APP_CONFIG.STAFF_LIST.forEach(staff => {
    const btn = document.createElement('button');
    btn.id = `btn-${staff}`;
    btn.className = 'h-12 rounded-xl bg-slate-900 text-white font-bold text-lg active:scale-95 transition-all shadow';
    btn.innerText = staff;
    btn.onclick = () => inputStaff(staff);
    grid.appendChild(btn);
  });
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

function generateScheduleSkeleton(existingMap = {}) {
  const list = [];
  const totalDays = state.weeks * 7;
  const start = new Date(state.startDate);

  for (let i = 0; i < totalDays; i++) {
    const curr = new Date(start);
    curr.setDate(start.getDate() + i);
    const iso = curr.toISOString().split('T')[0];
    const dayIdx = curr.getDay();
    const isSun = (dayIdx === 0);

    list.push({
      date: iso,
      dayName: window.APP_CONFIG.WEEK_DAYS[dayIdx],
      isSunday: isSun,
      isFullDayHoliday: existingMap[iso]?.isFullDayHoliday || false,
      shifts: existingMap[iso]?.shifts || []
    });
  }
  state.schedule = list;
  const firstActive = list.findIndex(d => !d.isSunday && !d.isFullDayHoliday && d.shifts.length < 6);
  state.activeDayIndex = firstActive !== -1 ? firstActive : 0;
  renderSchedule();
  updateActiveDock();
}

function renderSchedule() {
  const container = document.getElementById('schedule-container');
  container.innerHTML = '';

  state.schedule.forEach((day, idx) => {
    const isActive = (idx === state.activeDayIndex);
    const card = document.createElement('div');
    
    let borderClass = isActive 
      ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm' 
      : day.isSunday 
        ? 'bg-slate-200/40 border-slate-200/60 opacity-60' 
        : day.isFullDayHoliday 
          ? 'bg-amber-50/60 border-amber-200' 
          : 'bg-white border-slate-200/80 shadow-xs';

    card.className = `p-2.5 rounded-xl border transition-all ${borderClass}`;
    card.onclick = () => selectActiveDay(idx);

    let badge = '';
    if (day.isSunday) badge = `<span class="text-[10px] font-semibold text-slate-500">週日休</span>`;
    else if (day.isFullDayHoliday) badge = `<span class="text-[10px] font-bold text-amber-700">🌴 全休</span>`;
    else badge = `<span class="text-[10px] text-slate-400 font-medium">${day.shifts.length}/6</span>`;

    let shiftsHtml = '';
    if (!day.isSunday && !day.isFullDayHoliday) {
      shiftsHtml = `<div class="flex flex-wrap gap-1.5 mt-1.5">
        ${day.shifts.map((s, sIdx) => `
          <button onclick="event.stopPropagation(); toggleShiftStatus(${idx},${sIdx});" 
            class="px-2 py-0.5 rounded-md text-xs font-bold border ${
              s.status === 'ON' 
                ? 'bg-slate-900 text-white border-slate-900' 
                : 'bg-rose-100 text-rose-700 border-rose-300 line-through'
            }">
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

  const isLocked = active.isSunday || active.isFullDayHoliday;
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
  if (!current || current.isSunday || current.isFullDayHoliday) return;

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
  if (!current || current.isSunday) return;

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

function jumpNextDay() {
  let next = state.activeDayIndex + 1;
  while (next < state.schedule.length && state.schedule[next].isSunday) {
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

function calculateStatistics() {
  const stats = {};
  window.APP_CONFIG.STAFF_LIST.forEach(s => stats[s] = { on: 0, off: 0 });
  let totalWorkSlots = 0;

  state.schedule.forEach(day => {
    if (!day.isSunday && !day.isFullDayHoliday) {
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

function openSettingsModal() {
  const savedKey = localStorage.getItem('shift_firebase_api_key') || '';
  document.getElementById('api-key-input').value = savedKey;
  document.getElementById('prompt-template-input').value = state.promptTemplate;
  document.getElementById('settings-modal').classList.remove('hidden');
}

function closeSettingsModal() {
  document.getElementById('settings-modal').classList.add('hidden');
}

function saveApiKey() {
  const key = document.getElementById('api-key-input').value.trim();
  if (!key) {
    showToast('請輸入 API Key');
    return;
  }
  localStorage.setItem('shift_firebase_api_key', key);
  showToast('API Key 已儲存於手機');
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

// 組合本地 Key 與 config.js 進行初始化
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

    const path = window.APP_CONFIG.dbPath || 'schedule_data';
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
  const path = window.APP_CONFIG.dbPath || 'schedule_data';
  db.ref(path).set(payload).then(() => {
    document.getElementById('sync-badge').innerText = '已連線';
  });
}
