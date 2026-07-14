const COUNTRY_ORDER = ["德國", "英國", "印度", "中國", "台灣", "日本", "美國"];
const PERIODS = [
  { start: 1990, label: "1990-1994", year: 1990 },
  { start: 1995, label: "1995-1999", year: 1997 },
  { start: 2000, label: "2000-2004", year: 2000 },
  { start: 2005, label: "2005-2009", year: 2008 },
  { start: 2010, label: "2010-2014", year: 2011 },
  { start: 2015, label: "2015-2019", year: 2018 },
  { start: 2020, label: "2020-2024", year: 2022 },
  { start: 2025, label: "2025-2026", year: 2026 },
];

const MAP_POINTS = {
  美國: { x: 245, y: 205, labelX: 208, labelY: 178 },
  英國: { x: 472, y: 158, labelX: 444, labelY: 132 },
  德國: { x: 504, y: 168, labelX: 510, labelY: 142 },
  印度: { x: 690, y: 278, labelX: 666, labelY: 330 },
  中國: { x: 746, y: 218, labelX: 758, labelY: 192 },
  台灣: { x: 802, y: 252, labelX: 812, labelY: 282 },
  日本: { x: 845, y: 205, labelX: 854, labelY: 178 },
};

const BASE_COUNTRIES = {
  德國: { exportDependence: 0.74, energyImportDependence: 0.72, financialOpenness: 0.62, manufacturingWeight: 0.78, techSupplyChainWeight: 0.48, domesticDemandBuffer: 0.40, policySpace: 0.48, currencySensitivity: 0.52, importCostExposure: 0.48, reserveCurrencyAdvantage: 0 },
  英國: { exportDependence: 0.44, energyImportDependence: 0.42, financialOpenness: 0.82, manufacturingWeight: 0.32, techSupplyChainWeight: 0.28, domesticDemandBuffer: 0.52, policySpace: 0.46, currencySensitivity: 0.70, importCostExposure: 0.54, reserveCurrencyAdvantage: 0 },
  印度: { exportDependence: 0.30, energyImportDependence: 0.76, financialOpenness: 0.38, manufacturingWeight: 0.38, techSupplyChainWeight: 0.26, domesticDemandBuffer: 0.82, policySpace: 0.58, currencySensitivity: 0.64, importCostExposure: 0.62, reserveCurrencyAdvantage: 0 },
  中國: { exportDependence: 0.58, energyImportDependence: 0.58, financialOpenness: 0.34, manufacturingWeight: 0.76, techSupplyChainWeight: 0.62, domesticDemandBuffer: 0.68, policySpace: 0.72, currencySensitivity: 0.42, importCostExposure: 0.44, reserveCurrencyAdvantage: 0 },
  台灣: { exportDependence: 0.86, energyImportDependence: 0.86, financialOpenness: 0.62, manufacturingWeight: 0.74, techSupplyChainWeight: 0.92, domesticDemandBuffer: 0.34, policySpace: 0.58, currencySensitivity: 0.66, importCostExposure: 0.66, reserveCurrencyAdvantage: 0 },
  日本: { exportDependence: 0.50, energyImportDependence: 0.88, financialOpenness: 0.58, manufacturingWeight: 0.60, techSupplyChainWeight: 0.52, domesticDemandBuffer: 0.48, policySpace: 0.36, currencySensitivity: 0.48, importCostExposure: 0.58, reserveCurrencyAdvantage: 0 },
  美國: { exportDependence: 0.28, energyImportDependence: 0.18, financialOpenness: 0.88, manufacturingWeight: 0.34, techSupplyChainWeight: 0.54, domesticDemandBuffer: 0.86, policySpace: 0.68, currencySensitivity: 0.30, importCostExposure: 0.34, reserveCurrencyAdvantage: 0.90 },
};

const SOCIAL_DEMOGRAPHIC_TRAITS = {
  德國: { ageStructure: 0.34, migrationDiasporaNetwork: 0.64, socialTrust: 0.72, skillDepth: 0.80, diversityCoordinationLoad: 0.46, inequalityPressure: 0.42 },
  英國: { ageStructure: 0.46, migrationDiasporaNetwork: 0.78, socialTrust: 0.62, skillDepth: 0.72, diversityCoordinationLoad: 0.56, inequalityPressure: 0.58 },
  印度: { ageStructure: 0.88, migrationDiasporaNetwork: 0.82, socialTrust: 0.46, skillDepth: 0.58, diversityCoordinationLoad: 0.74, inequalityPressure: 0.68 },
  中國: { ageStructure: 0.52, migrationDiasporaNetwork: 0.62, socialTrust: 0.54, skillDepth: 0.70, diversityCoordinationLoad: 0.42, inequalityPressure: 0.56 },
  台灣: { ageStructure: 0.38, migrationDiasporaNetwork: 0.70, socialTrust: 0.70, skillDepth: 0.82, diversityCoordinationLoad: 0.30, inequalityPressure: 0.44 },
  日本: { ageStructure: 0.26, migrationDiasporaNetwork: 0.40, socialTrust: 0.74, skillDepth: 0.78, diversityCoordinationLoad: 0.26, inequalityPressure: 0.38 },
  美國: { ageStructure: 0.58, migrationDiasporaNetwork: 0.90, socialTrust: 0.52, skillDepth: 0.76, diversityCoordinationLoad: 0.66, inequalityPressure: 0.72 },
};

const PERIOD_ADJUSTMENTS = {
  1990: {
    德國: { domesticDemandBuffer: 0.48, policySpace: 0.62, exportDependence: 0.58 },
    英國: { manufacturingWeight: 0.42, financialOpenness: 0.66, policySpace: 0.56 },
    印度: { exportDependence: 0.16, financialOpenness: 0.14, domesticDemandBuffer: 0.72 },
    中國: { exportDependence: 0.30, financialOpenness: 0.10, techSupplyChainWeight: 0.16 },
    台灣: { techSupplyChainWeight: 0.58, exportDependence: 0.74 },
    日本: { policySpace: 0.52, financialOpenness: 0.50, domesticDemandBuffer: 0.56 },
    美國: { manufacturingWeight: 0.40, policySpace: 0.74 },
  },
  1995: {
    德國: { exportDependence: 0.62, policySpace: 0.56 },
    英國: { financialOpenness: 0.74, manufacturingWeight: 0.38 },
    印度: { exportDependence: 0.20, financialOpenness: 0.22 },
    中國: { exportDependence: 0.38, financialOpenness: 0.18, techSupplyChainWeight: 0.24 },
    台灣: { techSupplyChainWeight: 0.68, exportDependence: 0.80 },
    日本: { policySpace: 0.42, domesticDemandBuffer: 0.48 },
  },
  2000: {
    德國: { exportDependence: 0.68 },
    英國: { financialOpenness: 0.82 },
    印度: { exportDependence: 0.24, financialOpenness: 0.28, techSupplyChainWeight: 0.22 },
    中國: { exportDependence: 0.50, financialOpenness: 0.24, techSupplyChainWeight: 0.36 },
    台灣: { techSupplyChainWeight: 0.78, financialOpenness: 0.58 },
    日本: { policySpace: 0.30 },
    美國: { techSupplyChainWeight: 0.60, financialOpenness: 0.88 },
  },
  2005: {
    德國: { exportDependence: 0.78, financialOpenness: 0.66 },
    英國: { financialOpenness: 0.90 },
    印度: { exportDependence: 0.30, financialOpenness: 0.34 },
    中國: { exportDependence: 0.66, techSupplyChainWeight: 0.50 },
    台灣: { techSupplyChainWeight: 0.86 },
    日本: { exportDependence: 0.56, policySpace: 0.28 },
  },
  2010: {
    德國: { exportDependence: 0.84, energyImportDependence: 0.76 },
    英國: { policySpace: 0.36 },
    印度: { exportDependence: 0.34, financialOpenness: 0.38 },
    中國: { domesticDemandBuffer: 0.74, policySpace: 0.78, techSupplyChainWeight: 0.58 },
    台灣: { techSupplyChainWeight: 0.90 },
    日本: { policySpace: 0.22 },
    美國: { policySpace: 0.54 },
  },
  2015: {
    德國: { exportDependence: 0.86, energyImportDependence: 0.78 },
    英國: { currencySensitivity: 0.78, policySpace: 0.38 },
    印度: { domesticDemandBuffer: 0.86, financialOpenness: 0.42 },
    中國: { exportDependence: 0.58, domesticDemandBuffer: 0.76, techSupplyChainWeight: 0.66 },
    台灣: { techSupplyChainWeight: 0.94 },
    日本: { policySpace: 0.24 },
    美國: { policySpace: 0.62 },
  },
  2020: {
    德國: { energyImportDependence: 0.82, policySpace: 0.52 },
    英國: { currencySensitivity: 0.82, policySpace: 0.50 },
    印度: { domesticDemandBuffer: 0.88, policySpace: 0.60 },
    中國: { financialOpenness: 0.38, domesticDemandBuffer: 0.72 },
    台灣: { techSupplyChainWeight: 0.96, financialOpenness: 0.66 },
    日本: { energyImportDependence: 0.90, policySpace: 0.30 },
    美國: { policySpace: 0.76, reserveCurrencyAdvantage: 0.92 },
  },
  2025: {
    德國: { energyImportDependence: 0.70, policySpace: 0.42 },
    英國: { financialOpenness: 0.84, currencySensitivity: 0.76 },
    印度: { exportDependence: 0.36, domesticDemandBuffer: 0.90, financialOpenness: 0.46 },
    中國: { exportDependence: 0.52, domesticDemandBuffer: 0.64, policySpace: 0.64 },
    台灣: { techSupplyChainWeight: 0.96, exportDependence: 0.90 },
    日本: { energyImportDependence: 0.84, policySpace: 0.34 },
    美國: { policySpace: 0.58, reserveCurrencyAdvantage: 0.94 },
  },
};

const EVENTS = {
  能源價格上漲: { description: "原油、天然氣與電力成本同步上升。", globalDemand: 0, energyPrice: 1, usdRatePressure: 0, tradeBarrier: 0, techSupplyChain: 0, creditStress: 0, pandemicDisruption: 0, confidence: -0.25 },
  全球需求衰退: { description: "主要市場消費與投資放緩，外需同步下降。", globalDemand: -1, energyPrice: 0, usdRatePressure: 0, tradeBarrier: 0, techSupplyChain: 0, creditStress: 0, pandemicDisruption: 0, confidence: -0.65 },
  美元升息壓力: { description: "美國利率上行，美元走強，資金偏向美元資產。", globalDemand: 0, energyPrice: 0, usdRatePressure: 1, tradeBarrier: 0, techSupplyChain: 0, creditStress: 0, pandemicDisruption: 0, confidence: -0.20 },
  貿易壁壘升高: { description: "關稅、出口管制或制裁使跨境貿易成本上升。", globalDemand: 0, energyPrice: 0, usdRatePressure: 0, tradeBarrier: 1, techSupplyChain: 0, creditStress: 0, pandemicDisruption: 0, confidence: -0.35 },
  半導體供應鏈中斷: { description: "晶片製造、設備或關鍵材料供應受阻。", globalDemand: 0, energyPrice: 0, usdRatePressure: 0, tradeBarrier: 0, techSupplyChain: -1, creditStress: 0, pandemicDisruption: 0, confidence: -0.50 },
  亞洲金融危機: { description: "資本外流、信用緊縮與匯率貶值壓力集中於亞洲市場。", globalDemand: 0, energyPrice: 0, usdRatePressure: 0.65, tradeBarrier: 0, techSupplyChain: 0, creditStress: 0.90, pandemicDisruption: 0, confidence: -0.70 },
  網路泡沫破裂: { description: "科技股估值重挫，投資信心與高科技資本支出下降。", globalDemand: 0, energyPrice: 0, usdRatePressure: 0, tradeBarrier: 0, techSupplyChain: -0.35, creditStress: 0.35, pandemicDisruption: 0, confidence: -0.75 },
  全球金融危機: { description: "金融體系壓力、信用收縮與全球需求同步下滑。", globalDemand: -1, energyPrice: 0, usdRatePressure: 0, tradeBarrier: 0, techSupplyChain: 0, creditStress: 1, pandemicDisruption: 0, confidence: -1 },
  歐債危機: { description: "歐洲主權債壓力升高，金融信心與區域需求下降。", globalDemand: -0.45, energyPrice: 0, usdRatePressure: 0, tradeBarrier: 0, techSupplyChain: 0, creditStress: 0.75, pandemicDisruption: 0, confidence: -0.70 },
  新冠疫情: { description: "服務業停擺、供應鏈中斷、政策大幅刺激並存。", globalDemand: -0.85, energyPrice: 0, usdRatePressure: 0, tradeBarrier: 0, techSupplyChain: -0.65, creditStress: 0, pandemicDisruption: 1, confidence: -0.90 },
  俄烏戰爭能源衝擊: { description: "能源與糧食價格跳升，歐洲供應風險特別突出。", globalDemand: 0, energyPrice: 1, usdRatePressure: 0, tradeBarrier: 0.35, techSupplyChain: 0, creditStress: 0, pandemicDisruption: 0, confidence: -0.55 },
};

const state = {
  country: "台灣",
  periodStart: 2020,
  eventName: "半導體供應鏈中斷",
  intensity: 1,
};

function clamp(value, floor = -5, ceiling = 5) {
  return Math.max(floor, Math.min(ceiling, value));
}

function signed(value) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
}

function profileFor(country, periodStart) {
  return {
    ...BASE_COUNTRIES[country],
    ...SOCIAL_DEMOGRAPHIC_TRAITS[country],
    ...(PERIOD_ADJUSTMENTS[periodStart]?.[country] ?? {}),
  };
}

function scaledEvent(eventName, intensity) {
  const event = EVENTS[eventName];
  return Object.fromEntries(Object.entries(event).map(([key, value]) => (
    typeof value === "number" ? [key, value * intensity] : [key, value]
  )));
}

function simulate(countryName, periodStart, eventName, intensity) {
  const country = profileFor(countryName, periodStart);
  const event = scaledEvent(eventName, intensity);
  const externalExposure = country.exportDependence * -event.globalDemand
    + country.manufacturingWeight * event.tradeBarrier
    + country.techSupplyChainWeight * -event.techSupplyChain;
  const energyStress = country.energyImportDependence * event.energyPrice;
  const financialStress = country.financialOpenness * (event.usdRatePressure + event.creditStress * 0.75);
  const buffer = country.domesticDemandBuffer * 0.55 + country.policySpace * 0.45;
  const socialResilience = country.socialTrust * 0.34
    + country.skillDepth * 0.26
    + country.migrationDiasporaNetwork * 0.18
    + country.ageStructure * 0.12
    - country.inequalityPressure * 0.16
    - country.diversityCoordinationLoad * 0.10;
  const laborFlexibility = country.ageStructure * 0.44
    + country.skillDepth * 0.36
    + country.migrationDiasporaNetwork * 0.20;
  const coordinationDrag = country.diversityCoordinationLoad * 0.22
    + country.inequalityPressure * 0.26;

  const gdp = event.globalDemand * country.exportDependence * 1.45
    - energyStress * 0.70
    - event.tradeBarrier * country.manufacturingWeight * 0.86
    + event.techSupplyChain * country.techSupplyChainWeight * 0.98
    - event.creditStress * country.financialOpenness * 0.72
    - event.pandemicDisruption * (1.0 - country.domesticDemandBuffer * 0.45)
    + event.confidence * 0.50
    + buffer * 0.30
    + socialResilience * 0.22
    - coordinationDrag * Math.max(event.creditStress + event.pandemicDisruption + event.tradeBarrier, 0) * 0.18;
  const inflation = energyStress * 1.42
    + event.tradeBarrier * country.importCostExposure
    + event.usdRatePressure * country.currencySensitivity * 0.52
    + event.globalDemand * 0.24
    + event.pandemicDisruption * country.importCostExposure * 0.35
    + country.inequalityPressure * Math.max(event.energyPrice + event.tradeBarrier, 0) * 0.10;
  const currency = -financialStress * country.currencySensitivity * 1.15
    - energyStress * 0.34
    - externalExposure * 0.23
    + country.policySpace * 0.22
    + event.usdRatePressure * country.reserveCurrencyAdvantage;
  const policyRate = inflation * 0.60
    + event.usdRatePressure * 0.35
    - Math.max(-gdp, 0) * 0.24
    - event.creditStress * 0.15
    + country.policySpace * 0.08
    + country.socialTrust * 0.05;
  const equity = gdp * 1.08
    - inflation * 0.36
    - financialStress * 0.62
    + event.confidence * 1.12
    + socialResilience * 0.25;
  const unemployment = Math.max(-gdp, 0) * 0.55
    + event.creditStress * 0.18
    + event.pandemicDisruption * 0.35
    + country.inequalityPressure * 0.12
    - laborFlexibility * 0.14;
  const currentAccount = -energyStress * 0.56
    + event.globalDemand * country.exportDependence * 0.60
    - event.tradeBarrier * country.exportDependence * 0.38
    + currency * 0.12;

  return {
    country,
    values: {
      GDP: clamp(gdp),
      通膨: clamp(inflation),
      匯率: clamp(currency),
      利率: clamp(policyRate),
      股市: clamp(equity),
      失業: clamp(unemployment, 0, 5),
      經常帳: clamp(currentAccount),
    },
  };
}

function buildMap() {
  const group = document.querySelector("#countryMarkers");
  group.innerHTML = COUNTRY_ORDER.map((country) => {
    const point = MAP_POINTS[country];
    return `
      <g class="country-marker" data-country="${country}" tabindex="0" role="button" aria-label="${country}">
        <line x1="${point.x}" y1="${point.y}" x2="${point.labelX}" y2="${point.labelY}" stroke="rgba(32,38,36,.45)" stroke-width="2"></line>
        <circle class="marker-dot" cx="${point.x}" cy="${point.y}" r="12"></circle>
        <text class="marker-label" x="${point.labelX}" y="${point.labelY}">${country}</text>
      </g>
    `;
  }).join("");

  group.querySelectorAll(".country-marker").forEach((marker) => {
    marker.addEventListener("click", () => {
      state.country = marker.dataset.country;
      render();
    });
    marker.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        state.country = marker.dataset.country;
        render();
      }
    });
  });
}

function buildControls() {
  const periodSelect = document.querySelector("#periodSelect");
  periodSelect.innerHTML = PERIODS.map((period) => `<option value="${period.start}">${period.label}</option>`).join("");
  periodSelect.value = String(state.periodStart);
  periodSelect.addEventListener("change", () => {
    state.periodStart = Number(periodSelect.value);
    render();
  });

  const eventSelect = document.querySelector("#eventSelect");
  eventSelect.innerHTML = Object.keys(EVENTS).map((name) => `<option value="${name}">${name}</option>`).join("");
  eventSelect.value = state.eventName;
  eventSelect.addEventListener("change", () => {
    state.eventName = eventSelect.value;
    render();
  });

  const intensitySlider = document.querySelector("#intensitySlider");
  intensitySlider.addEventListener("input", () => {
    state.intensity = Number(intensitySlider.value);
    render();
  });
}

function metricTone(name, value) {
  if (name === "通膨" || name === "失業" || name === "利率") {
    return value > 0.5 ? "negative" : value < -0.2 ? "positive" : "neutral";
  }
  return value < -0.35 ? "negative" : value > 0.25 ? "positive" : "neutral";
}

function metricNote(name, value) {
  const notes = {
    GDP: value < -0.45 ? "成長承壓" : value > 0.2 ? "成長具韌性" : "小幅波動",
    通膨: value > 0.5 ? "物價壓力升高" : value < -0.2 ? "通膨降溫" : "物價壓力有限",
    匯率: value < -0.4 ? "本幣偏弱" : value > 0.3 ? "本幣偏強" : "大致穩定",
    利率: value > 0.45 ? "央行偏緊縮" : value < -0.25 ? "央行偏寬鬆" : "偏觀望",
    股市: value < -0.55 ? "風險資產承壓" : value > 0.25 ? "相對有撐" : "震盪",
    失業: value > 0.7 ? "就業壓力升高" : "就業壓力可控",
    經常帳: value < -0.35 ? "外部收支壓力" : value > 0.25 ? "外部收支改善" : "變化有限",
  };
  return notes[name];
}

function renderMetrics(values) {
  document.querySelector("#metrics").innerHTML = Object.entries(values).map(([name, value]) => `
    <article class="metric ${metricTone(name, value)}">
      <span>${name}</span>
      <strong>${signed(value)}</strong>
      <small>${metricNote(name, value)}</small>
    </article>
  `).join("");
}

function renderBars(values) {
  document.querySelector("#barChart").innerHTML = Object.entries(values).map(([name, value]) => {
    const width = Math.min(Math.abs(value) / 3, 1) * 50;
    const direction = value >= 0 ? "positive" : "negative";
    return `
      <div class="bar-row">
        <div class="bar-label">${name}</div>
        <div class="bar-track">
          <div class="bar-fill ${direction}" style="width: ${width}%"></div>
        </div>
        <div class="bar-value">${signed(value)}</div>
      </div>
    `;
  }).join("");
}

function renderProfile(profile) {
  const labels = {
    exportDependence: "出口依賴",
    energyImportDependence: "能源進口",
    financialOpenness: "金融開放",
    manufacturingWeight: "製造業",
    techSupplyChainWeight: "科技供應鏈",
    domesticDemandBuffer: "內需緩衝",
    policySpace: "政策空間",
    currencySensitivity: "匯率敏感",
    ageStructure: "年齡結構",
    migrationDiasporaNetwork: "僑民網絡",
    socialTrust: "社會信任",
    skillDepth: "技能深度",
    diversityCoordinationLoad: "多元協調",
    inequalityPressure: "不均壓力",
  };
  document.querySelector("#profileGrid").innerHTML = Object.entries(labels).map(([key, label]) => `
    <div class="profile-item">
      <span>${label}</span>
      <div class="mini-track"><div class="mini-fill" style="width:${profile[key] * 100}%"></div></div>
    </div>
  `).join("");
}

function riskLabel(values) {
  const pressure = -values.GDP - values.股市 + values.失業 + Math.max(values.通膨, 0) * 0.5;
  if (pressure > 3) return ["高度壓力", "stress-high"];
  if (pressure < 1) return ["低度壓力", "stress-low"];
  return ["中度壓力", ""];
}

function render() {
  const period = PERIODS.find((item) => item.start === state.periodStart);
  const result = simulate(state.country, state.periodStart, state.eventName, state.intensity);
  const values = result.values;
  const [badgeText, badgeClass] = riskLabel(values);

  document.querySelector("#selectedCountryChip").textContent = state.country;
  document.querySelector("#resultTitle").textContent = `${state.country} · ${period.label}`;
  document.querySelector("#eventSummary").textContent = EVENTS[state.eventName].description;
  document.querySelector("#intensityValue").textContent = `${state.intensity.toFixed(1)}x`;
  document.querySelector("#riskBadge").textContent = badgeText;
  document.querySelector("#riskBadge").className = `score-badge ${badgeClass}`;
  document.querySelector("#profileNote").textContent = `${state.country} 在 ${period.label} 的結構參數會改變事件衝擊傳導。`;

  document.querySelectorAll(".country-marker").forEach((marker) => {
    marker.classList.toggle("active", marker.dataset.country === state.country);
  });

  renderMetrics(values);
  renderBars(values);
  renderProfile(result.country);
}

buildMap();
buildControls();
render();
