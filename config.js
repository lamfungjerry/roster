// 系統全域公開設定 (放置於 GitHub)
window.APP_CONFIG = {
  // 系統開始使用日期 (格式：YYYY-MM-DD)
  SYSTEM_START_DATE: '2026-07-20',
  
  // 6 位排班員工代號
  STAFF_LIST: ['Y', 'I', 'S', 'K', 'C', 'V'],

  // 星期顯示名稱
  WEEK_DAYS: ['日', '一', '二', '三', '四', '五', '六'],

  // 星期六是否需要排班：預設為 false (不排週六，自動視為休息日)
  DEFAULT_INCLUDE_SATURDAY: false,

  // Firebase 專案固定參數 (請換成你專案的值，無須填寫 apiKey)
  firebaseBase: {
    authDomain: "roster-9a699.firebaseapp.com",
    databaseURL: "https://roster-9a699-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "roster-9a699",
    storageBucket: "roster-9a699.firebasestorage.app",
    messagingSenderId: "286093798970",
    appId: "1:286093798970:web:842750f200e1ca3f684f03",
    measurementId: "G-DD7WDKYHCM"
  },

  // 資料庫儲存節點名稱
  dbPath: 'roster_data',

  // 聚焦 1~6 號更位分佈的 Super Prompt 模板
  // ★ 系統唯一 Prompt 數據源 (AI 評估指令範本) ★
  DEFAULT_PROMPT: `你現在是一位營運排班評估助手。以下是未來週期（{{DATE_RANGE}}）6 位員工（Y, I, S, K, C, V）的更表數據。
每日排更共 6 個位置。

【排班核心邏輯：數字越小越好】
「1更」為首選最佳位，「6更」為最差位。均位數字越小代表佔據越多好位。
注意：放假者不計分，實際當值者會向後順延填補均位。

【Tab 1: 基本均位與假期統計】
{{STATISTICS}}

【Tab 2: 累積盈虧分數】
(正數代表排位著數，負數代表硬食差位)
{{STATS_PNL}}

【Tab 3: 靚位與差位命中率】
(靚位:1-2更 | 平水位:3-4更 | 差位:5-6更)
{{STATS_HITRATE}}

【完整排班數據 (JSON)】
\`\`\`json
{{SCHEDULE_DATA}}
\`\`\`

請評估：
1. 綜合上述三項指標，精準分析誰長期霸佔好位，誰長期排差位？
2. 基於拉平眾人均位與盈虧的目標，請列出具體建議，在哪些日期將哪兩位員工的更位順序對調。`
};
