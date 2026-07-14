# 經濟事件反應模擬

這是一個初版、方向性的經濟模擬器，用來比較幾個主要國家在不同歷史時點面對同一個經濟事件時可能出現的相對反應。

模型把 1990 到 2026 分成 5 年區間，依照各國在不同時期的大致經濟結構調整敏感度，例如出口依賴、能源進口依賴、金融開放度、製造業比重、半導體供應鏈權重、內需緩衝與政策空間。

模型也納入「社會人口結構」參數，例如年齡結構、移民/僑民網絡、社會信任、教育技能深度、多元協調成本與所得不均壓力。這些參數用來描述政策與衝擊如何傳導到勞動市場、信心與復原速度，不把人種或血統視為固定經濟能力。

目前涵蓋國家：

- 德國
- 英國
- 印度
- 中國
- 台灣
- 日本
- 美國

目前涵蓋事件：

- 能源價格上漲
- 全球需求衰退
- 美元升息壓力
- 貿易壁壘升高
- 半導體供應鏈中斷
- 亞洲金融危機
- 網路泡沫破裂
- 全球金融危機
- 歐債危機
- 新冠疫情
- 俄烏戰爭能源衝擊

執行方式：

```bash
python3 econ_sim.py
```

互動地圖介面：

```bash
open index.html
```

也可以直接在瀏覽器打開 [index.html](/Users/mac/Documents/經濟模擬/index.html)。

公開部署到 GitHub Pages：

```bash
git init
git add .
git commit -m "Publish economic simulation map"
git branch -M main
git remote add origin https://github.com/cheni44/TheDonDon.git
git push -u origin main
```

本專案已包含 GitHub Pages Actions workflow。推上 GitHub 後，到 repo 的 `Settings > Pages`，把 `Build and deployment` 的 `Source` 選成 `GitHub Actions`。之後每次 push 到 `main` 都會自動發布。

指定公開網址：

```text
https://cheni44.github.io/TheDonDon/economic-simulation-map/
```

列出可用事件與歷史時機點：

```bash
python3 econ_sim.py --list
```

把指定事件丟到指定年份：

```bash
python3 econ_sim.py --year 2008 --event 全球金融危機
```

使用預設歷史時機點：

```bash
python3 econ_sim.py --moment 2020新冠疫情
```

調整事件強度：

```bash
python3 econ_sim.py --year 2022 --event 美元升息壓力 --intensity 1.5
```

輸出欄位是方向性分數，不是精準預測值：

- `GDP影響`：越低代表成長越承壓。
- `通膨影響`：越高代表物價壓力越大。
- `匯率影響`：越低代表本國貨幣越偏弱。
- `利率傾向`：越高代表央行越偏緊縮。
- `股市影響`：越低代表股市壓力越大。
- `失業`：越高代表失業壓力越大。
- `經常帳`：越低代表外部收支壓力越大。

社會人口參數：

- `年齡結構`：勞動人口與人口老化對復原速度的影響。
- `移民/僑民網絡`：跨境人才、資金與商業網絡的緩衝能力。
- `社會信任`：政策執行、金融信心與社會協調效率。
- `教育技能深度`：產業轉型與就業吸收能力。
- `多元協調成本`：語言、區域、制度或社會分歧帶來的政策協調難度。
- `所得不均壓力`：物價、失業與信用衝擊對社會穩定的放大效果。

下一步可以加入：

- 國家真實資料，例如出口占 GDP、能源進口依賴、政策利率、CPI。
- 多期模擬，例如第一季衝擊、第二季政策反應、第三季回復。
- 政策選項，例如降息、財政刺激、關稅反制、匯率干預。
