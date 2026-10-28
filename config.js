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

  // Firebase 專案固定參數
  firebaseBase: {
    apiKey: AIzaSyA6B-U_ffPcDnGhaeizwYh_uMsi4oAKaPo,
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
  DEFAULT_PROMPT: `你現在是一位絕對中立的「HR 排班審計核數師」。我的角色是排更者，請你根據以下實際數據，嚴格審查這份更表是否存在「偏心 (Favoritism)」或「針對 (Targeting)」。

【基本時空與背景設定】
- 審查週期：{{DATE_RANGE}}
- 團隊名單：共 6 位員工（Y, I, S, K, C, V），每日排更上限為 6 個位置。
- 隱藏的全休日：若 JSON 數據中缺失了某個日期，代表該日為「全休日」，無須理會及計算。
- 週末豁免機制：星期六及星期日的排班會如常顯示在 JSON 中，但系統在底層計算「累積盈虧」及「命中率」時，已絕對剔除週末的數據（即週末當值不計分）。你只需核對平日(一至五)的數據關聯。

【底層運算邏輯與數字解讀】
1. 基礎分數與順延：更位第1更為1分(最輕鬆)，第6更為6分(最辛苦)。當平日 JSON 顯示某員工為「(休假)」，當值人數減少，其餘當值員工的更位分數會被迫「向後順延」(如4人當值需承受3,4,5,6分)，這會動態拉高大市基準均位。
2. 累積盈虧 (PnL)：公式為 [ (動態基準均位 × 當值日數) - 實際總得分 ]。
   - 顯著正數：代表實際承受的辛苦遠低於基準，長期霸佔靚位，有「被偏心」嫌疑。
   - 顯著負數：代表實際承受的辛苦遠高於基準，長期硬食爛更，有「被針對」或過度剝削嫌疑。
3. 命中率：靚=第1-2更(舒服)；平=第3-4更(中等)；差=第5-6更(極辛苦)。用作檢視是否有員工數字上平均，但實際遭遇「極端跳躍排班」。

【你的審核任務】
1. 揪出特權與針對：直接點名誰是最大得益者(盈虧嚴重偏正)？誰是最大受害者(盈虧嚴重偏負 + 差更命中率極高)？
2. 深度剖析：分析員工吃苦是因為「人手短缺的客觀無奈(當日多人休假)」，還是「排班者的刻意安排(針對)」？
3. 公平度評級與警告：給出 1-100 分的綜合公平度評分。若發現明顯不公，請對我(排更者)發出嚴厲的修正警告及具體補償建議。

【統計數據】
{{STATISTICS}}
{{STATS_PNL}}
{{STATS_HITRATE}}

【每日排班 JSON】
{{SCHEDULE_DATA}}`
};
