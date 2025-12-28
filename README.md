薪資出勤管理系統  (Salary-Tracker)

一個基於  React  打造的輕量化薪資管理工具，專為需要精確計算「雙薪」與「勞基法加班費」的勞動者設計。除了手動紀錄工時外，系統會自動根據台灣勞基法標準計算  1.34x  與  1.67x  加班費。

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)

![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

![Lucide-React](https://img.shields.io/badge/Lucide_React-F7DF1E?style=for-the-badge)

<核心特色>

精確薪資計算：自動區分正常工時、1.34  倍加班費與  1.67  倍加班費。
靈活雙薪邏輯 ：
不滿  8  小時 ：依照實作時數給予「兩倍薪資」。
滿  8  小時：前  8  小時給予「兩倍薪資」，超過部分自動計算加班費。
自定義設定：可自由調整底薪。
數據匯出 ：一鍵格式化為  TSV，可直接貼上至  Google  Sheets  或  Excel。
本地儲存  (Local  Storage)：無需註冊帳號，所有數據儲存在你的瀏覽器中，安全隱密。
隱私模式：一鍵隱藏總金額，避免在公共場合洩漏敏感資訊。
💡 小建議：本工具數據儲存於瀏覽器，建議每月底結算後，點擊「匯出」將資料備份至 Google Sheets。

<計算邏輯說明>

本系統嚴格遵循以下邏輯進行運算：
1.  正常工作日
          正常工時 ：前  8  小時為正常時薪。
          加班前  2  小時  ：時薪  ×  1.34。
          加班第  3  小時起：時薪  ×  1.67。

2.  雙薪模式  (Double  Pay)
          實作時數  <=  8hr    ：實作時數  ×  時薪  ×  2。
          實作時數  >  8hr    ： (8  ×  時薪  ×  2)  +  加班費。
        註：確保在時數不滿  8  小時的情況下，以實際工時進行加倍，而非無條件給予  8  小時薪資。  

