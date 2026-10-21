// 系統全域公開設定 (放置於 GitHub)
window.APP_CONFIG = {
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
  DEFAULT_PROMPT: `你現在是一位營運排班評估助手。以下是未來週期（{{DATE_RANGE}}）6 位員工（Y, I, S, K, C, V）的更表數據。
每日均排滿 6 人，分別對應第 1 至第 6 號更位。

【1~6 號更位分佈統計數據】
{{STATISTICS}}

【完整排班數據 (JSON)】
\`\`\`json
{{SCHEDULE_DATA}}
\`\`\`

請針對 6 位員工在「第 1 至第 6 號更位」的分配進行深度公平性評估：
1. 更位分佈公平性：分析每位員工在 1~6 號位置的分配是否均勻。是否有特定員工過度集中在某些更位（例如過多排在 1 號位或 6 號位）？
2. 極端值與偏離檢測：指出偏離平均期望值最大的更位分配情況。
3. 對調與輪換建議：若更位分配存在顯著不均，請列出具體建議在哪些日期將哪兩位員工的更位順序對調，以達成全體更位輪替的公平。`
};
