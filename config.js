// 系統靜態設定檔 (可安全放置於 GitHub)
window.APP_CONFIG = {
  // 6 位排班員工代號
  STAFF_LIST: ['Y', 'I', 'S', 'K', 'C', 'V'],

  // 星期名稱
  WEEK_DAYS: ['日', '一', '二', '三', '四', '五', '六'],

  // Firebase 專案固定參數 (請換成你專案的值，無須填寫 apiKey)
  firebaseBase: {
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID-asia-southeast1.firebasedatabase.app",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
  },

  // 資料庫儲存節點 (可自訂名稱以增加隱密性)
  dbPath: 'schedule_data',

  // 預設 Super Prompt
  DEFAULT_PROMPT: `你現在是一位營運排班評估助手。以下是未來週期（{{DATE_RANGE}}）6 位員工（Y, I, S, K, C, V）的更表數據。
除週日與全日假期外，每日需要排妥 6 人。

【基本統計數據】
{{STATISTICS}}

【完整排班數據 (JSON)】
\`\`\`json
{{SCHEDULE_DATA}}
\`\`\`

請根據以上資料進行以下兩項分析與評估：
1. 出勤公平性評估：比較 6 位員工（Y, I, S, K, C, V）的實際出勤總天數是否均勻，分析各人總工作天數是否存在顯著落差。
2. 休假與分佈建議：檢視各人的個別休假與排班分佈；若出勤天數落差過大，請提出具體的微調或對調建議，以求總工作量更加平衡。`
};
