from __future__ import annotations

import argparse
from dataclasses import dataclass, replace
from typing import Dict, Iterable, List, Tuple


COUNTRY_ORDER = ["德國", "英國", "印度", "中國", "台灣", "日本", "美國"]
PERIOD_STARTS = [1990, 1995, 2000, 2005, 2010, 2015, 2020, 2025]


@dataclass(frozen=True)
class CountryProfile:
    name: str
    export_dependence: float
    energy_import_dependence: float
    financial_openness: float
    manufacturing_weight: float
    tech_supply_chain_weight: float
    domestic_demand_buffer: float
    policy_space: float
    currency_sensitivity: float
    import_cost_exposure: float
    reserve_currency_advantage: float = 0.0
    age_structure: float = 0.5
    migration_diaspora_network: float = 0.5
    social_trust: float = 0.5
    skill_depth: float = 0.5
    diversity_coordination_load: float = 0.5
    inequality_pressure: float = 0.5


@dataclass(frozen=True)
class EconomicEvent:
    name: str
    description: str
    global_demand: float = 0.0
    energy_price: float = 0.0
    usd_rate_pressure: float = 0.0
    trade_barrier: float = 0.0
    tech_supply_chain: float = 0.0
    credit_stress: float = 0.0
    pandemic_disruption: float = 0.0
    confidence: float = 0.0


@dataclass(frozen=True)
class Reaction:
    period: str
    year: int
    event: str
    country: str
    gdp_growth_impact: float
    inflation_impact: float
    currency_impact: float
    policy_rate_bias: float
    equity_market_impact: float
    unemployment_impact: float
    current_account_impact: float
    summary: str


BASE_COUNTRIES: Dict[str, CountryProfile] = {
    "德國": CountryProfile("德國", 0.74, 0.72, 0.62, 0.78, 0.48, 0.40, 0.48, 0.52, 0.48),
    "英國": CountryProfile("英國", 0.44, 0.42, 0.82, 0.32, 0.28, 0.52, 0.46, 0.70, 0.54),
    "印度": CountryProfile("印度", 0.30, 0.76, 0.38, 0.38, 0.26, 0.82, 0.58, 0.64, 0.62),
    "中國": CountryProfile("中國", 0.58, 0.58, 0.34, 0.76, 0.62, 0.68, 0.72, 0.42, 0.44),
    "台灣": CountryProfile("台灣", 0.86, 0.86, 0.62, 0.74, 0.92, 0.34, 0.58, 0.66, 0.66),
    "日本": CountryProfile("日本", 0.50, 0.88, 0.58, 0.60, 0.52, 0.48, 0.36, 0.48, 0.58),
    "美國": CountryProfile("美國", 0.28, 0.18, 0.88, 0.34, 0.54, 0.86, 0.68, 0.30, 0.34, 0.90),
}

SOCIAL_DEMOGRAPHIC_TRAITS: Dict[str, Dict[str, float]] = {
    "德國": {
        "age_structure": 0.34,
        "migration_diaspora_network": 0.64,
        "social_trust": 0.72,
        "skill_depth": 0.80,
        "diversity_coordination_load": 0.46,
        "inequality_pressure": 0.42,
    },
    "英國": {
        "age_structure": 0.46,
        "migration_diaspora_network": 0.78,
        "social_trust": 0.62,
        "skill_depth": 0.72,
        "diversity_coordination_load": 0.56,
        "inequality_pressure": 0.58,
    },
    "印度": {
        "age_structure": 0.88,
        "migration_diaspora_network": 0.82,
        "social_trust": 0.46,
        "skill_depth": 0.58,
        "diversity_coordination_load": 0.74,
        "inequality_pressure": 0.68,
    },
    "中國": {
        "age_structure": 0.52,
        "migration_diaspora_network": 0.62,
        "social_trust": 0.54,
        "skill_depth": 0.70,
        "diversity_coordination_load": 0.42,
        "inequality_pressure": 0.56,
    },
    "台灣": {
        "age_structure": 0.38,
        "migration_diaspora_network": 0.70,
        "social_trust": 0.70,
        "skill_depth": 0.82,
        "diversity_coordination_load": 0.30,
        "inequality_pressure": 0.44,
    },
    "日本": {
        "age_structure": 0.26,
        "migration_diaspora_network": 0.40,
        "social_trust": 0.74,
        "skill_depth": 0.78,
        "diversity_coordination_load": 0.26,
        "inequality_pressure": 0.38,
    },
    "美國": {
        "age_structure": 0.58,
        "migration_diaspora_network": 0.90,
        "social_trust": 0.52,
        "skill_depth": 0.76,
        "diversity_coordination_load": 0.66,
        "inequality_pressure": 0.72,
    },
}


PERIOD_ADJUSTMENTS: Dict[int, Dict[str, Dict[str, float]]] = {
    1990: {
        "德國": {"domestic_demand_buffer": 0.48, "policy_space": 0.62, "export_dependence": 0.58},
        "英國": {"manufacturing_weight": 0.42, "financial_openness": 0.66, "policy_space": 0.56},
        "印度": {"export_dependence": 0.16, "financial_openness": 0.14, "domestic_demand_buffer": 0.72},
        "中國": {"export_dependence": 0.30, "financial_openness": 0.10, "tech_supply_chain_weight": 0.16},
        "台灣": {"tech_supply_chain_weight": 0.58, "export_dependence": 0.74},
        "日本": {"policy_space": 0.52, "financial_openness": 0.50, "domestic_demand_buffer": 0.56},
        "美國": {"manufacturing_weight": 0.40, "policy_space": 0.74},
    },
    1995: {
        "德國": {"export_dependence": 0.62, "policy_space": 0.56},
        "英國": {"financial_openness": 0.74, "manufacturing_weight": 0.38},
        "印度": {"export_dependence": 0.20, "financial_openness": 0.22},
        "中國": {"export_dependence": 0.38, "financial_openness": 0.18, "tech_supply_chain_weight": 0.24},
        "台灣": {"tech_supply_chain_weight": 0.68, "export_dependence": 0.80},
        "日本": {"policy_space": 0.42, "domestic_demand_buffer": 0.48},
    },
    2000: {
        "德國": {"export_dependence": 0.68},
        "英國": {"financial_openness": 0.82},
        "印度": {"export_dependence": 0.24, "financial_openness": 0.28, "tech_supply_chain_weight": 0.22},
        "中國": {"export_dependence": 0.50, "financial_openness": 0.24, "tech_supply_chain_weight": 0.36},
        "台灣": {"tech_supply_chain_weight": 0.78, "financial_openness": 0.58},
        "日本": {"policy_space": 0.30},
        "美國": {"tech_supply_chain_weight": 0.60, "financial_openness": 0.88},
    },
    2005: {
        "德國": {"export_dependence": 0.78, "financial_openness": 0.66},
        "英國": {"financial_openness": 0.90},
        "印度": {"export_dependence": 0.30, "financial_openness": 0.34},
        "中國": {"export_dependence": 0.66, "tech_supply_chain_weight": 0.50},
        "台灣": {"tech_supply_chain_weight": 0.86},
        "日本": {"export_dependence": 0.56, "policy_space": 0.28},
    },
    2010: {
        "德國": {"export_dependence": 0.84, "energy_import_dependence": 0.76},
        "英國": {"policy_space": 0.36},
        "印度": {"export_dependence": 0.34, "financial_openness": 0.38},
        "中國": {"domestic_demand_buffer": 0.74, "policy_space": 0.78, "tech_supply_chain_weight": 0.58},
        "台灣": {"tech_supply_chain_weight": 0.90},
        "日本": {"policy_space": 0.22},
        "美國": {"policy_space": 0.54},
    },
    2015: {
        "德國": {"export_dependence": 0.86, "energy_import_dependence": 0.78},
        "英國": {"currency_sensitivity": 0.78, "policy_space": 0.38},
        "印度": {"domestic_demand_buffer": 0.86, "financial_openness": 0.42},
        "中國": {"export_dependence": 0.58, "domestic_demand_buffer": 0.76, "tech_supply_chain_weight": 0.66},
        "台灣": {"tech_supply_chain_weight": 0.94},
        "日本": {"policy_space": 0.24},
        "美國": {"policy_space": 0.62},
    },
    2020: {
        "德國": {"energy_import_dependence": 0.82, "policy_space": 0.52},
        "英國": {"currency_sensitivity": 0.82, "policy_space": 0.50},
        "印度": {"domestic_demand_buffer": 0.88, "policy_space": 0.60},
        "中國": {"financial_openness": 0.38, "domestic_demand_buffer": 0.72},
        "台灣": {"tech_supply_chain_weight": 0.96, "financial_openness": 0.66},
        "日本": {"energy_import_dependence": 0.90, "policy_space": 0.30},
        "美國": {"policy_space": 0.76, "reserve_currency_advantage": 0.92},
    },
    2025: {
        "德國": {"energy_import_dependence": 0.70, "policy_space": 0.42},
        "英國": {"financial_openness": 0.84, "currency_sensitivity": 0.76},
        "印度": {"export_dependence": 0.36, "domestic_demand_buffer": 0.90, "financial_openness": 0.46},
        "中國": {"export_dependence": 0.52, "domestic_demand_buffer": 0.64, "policy_space": 0.64},
        "台灣": {"tech_supply_chain_weight": 0.96, "export_dependence": 0.90},
        "日本": {"energy_import_dependence": 0.84, "policy_space": 0.34},
        "美國": {"policy_space": 0.58, "reserve_currency_advantage": 0.94},
    },
}


EVENTS: Dict[str, EconomicEvent] = {
    "能源價格上漲": EconomicEvent("能源價格上漲", "原油、天然氣與電力成本同步上升。", energy_price=1.0, confidence=-0.25),
    "全球需求衰退": EconomicEvent("全球需求衰退", "主要市場消費與投資放緩，外需同步下降。", global_demand=-1.0, confidence=-0.65),
    "美元升息壓力": EconomicEvent("美元升息壓力", "美國利率上行，美元走強，資金偏向美元資產。", usd_rate_pressure=1.0, confidence=-0.20),
    "貿易壁壘升高": EconomicEvent("貿易壁壘升高", "關稅、出口管制或制裁使跨境貿易成本上升。", trade_barrier=1.0, confidence=-0.35),
    "半導體供應鏈中斷": EconomicEvent("半導體供應鏈中斷", "晶片製造、設備或關鍵材料供應受阻。", tech_supply_chain=-1.0, confidence=-0.50),
    "亞洲金融危機": EconomicEvent("亞洲金融危機", "資本外流、信用緊縮與匯率貶值壓力集中於亞洲市場。", usd_rate_pressure=0.65, credit_stress=0.90, confidence=-0.70),
    "網路泡沫破裂": EconomicEvent("網路泡沫破裂", "科技股估值重挫，投資信心與高科技資本支出下降。", tech_supply_chain=-0.35, credit_stress=0.35, confidence=-0.75),
    "全球金融危機": EconomicEvent("全球金融危機", "金融體系壓力、信用收縮與全球需求同步下滑。", global_demand=-1.0, credit_stress=1.0, confidence=-1.0),
    "歐債危機": EconomicEvent("歐債危機", "歐洲主權債壓力升高，金融信心與區域需求下降。", global_demand=-0.45, credit_stress=0.75, confidence=-0.70),
    "新冠疫情": EconomicEvent("新冠疫情", "服務業停擺、供應鏈中斷、政策大幅刺激並存。", global_demand=-0.85, tech_supply_chain=-0.65, pandemic_disruption=1.0, confidence=-0.90),
    "俄烏戰爭能源衝擊": EconomicEvent("俄烏戰爭能源衝擊", "能源與糧食價格跳升，歐洲供應風險特別突出。", energy_price=1.0, trade_barrier=0.35, confidence=-0.55),
}


HISTORICAL_MOMENTS: Dict[str, Tuple[int, str]] = {
    "1990油價衝擊": (1990, "能源價格上漲"),
    "1997亞洲金融危機": (1997, "亞洲金融危機"),
    "2000網路泡沫": (2000, "網路泡沫破裂"),
    "2008金融海嘯": (2008, "全球金融危機"),
    "2011歐債危機": (2011, "歐債危機"),
    "2018貿易戰": (2018, "貿易壁壘升高"),
    "2020新冠疫情": (2020, "新冠疫情"),
    "2022俄烏能源": (2022, "俄烏戰爭能源衝擊"),
    "2022美元升息": (2022, "美元升息壓力"),
    "2023半導體管制": (2023, "半導體供應鏈中斷"),
}


def clamp(value: float, floor: float = -5.0, ceiling: float = 5.0) -> float:
    return max(floor, min(ceiling, value))


def period_for_year(year: int) -> int:
    if year < 1990 or year > 2026:
        raise ValueError("年份必須介於 1990 到 2026。")
    return max(start for start in PERIOD_STARTS if start <= year)


def period_label(period_start: int) -> str:
    end = 2026 if period_start == 2025 else period_start + 4
    return f"{period_start}-{end}"


def profile_for(country_name: str, year: int) -> CountryProfile:
    period = period_for_year(year)
    profile = BASE_COUNTRIES[country_name]
    traits = SOCIAL_DEMOGRAPHIC_TRAITS[country_name]
    updates = PERIOD_ADJUSTMENTS.get(period, {}).get(country_name, {})
    return replace(profile, **traits, **updates)


def event_with_intensity(event: EconomicEvent, intensity: float) -> EconomicEvent:
    return EconomicEvent(
        name=event.name,
        description=event.description,
        global_demand=event.global_demand * intensity,
        energy_price=event.energy_price * intensity,
        usd_rate_pressure=event.usd_rate_pressure * intensity,
        trade_barrier=event.trade_barrier * intensity,
        tech_supply_chain=event.tech_supply_chain * intensity,
        credit_stress=event.credit_stress * intensity,
        pandemic_disruption=event.pandemic_disruption * intensity,
        confidence=event.confidence * intensity,
    )


def simulate_reaction(country: CountryProfile, event: EconomicEvent, year: int) -> Reaction:
    period = period_for_year(year)
    external_exposure = (
        country.export_dependence * -event.global_demand
        + country.manufacturing_weight * event.trade_barrier
        + country.tech_supply_chain_weight * -event.tech_supply_chain
    )
    energy_stress = country.energy_import_dependence * event.energy_price
    financial_stress = country.financial_openness * (event.usd_rate_pressure + event.credit_stress * 0.75)
    buffer = country.domestic_demand_buffer * 0.55 + country.policy_space * 0.45
    social_resilience = (
        country.social_trust * 0.34
        + country.skill_depth * 0.26
        + country.migration_diaspora_network * 0.18
        + country.age_structure * 0.12
        - country.inequality_pressure * 0.16
        - country.diversity_coordination_load * 0.10
    )
    labor_flexibility = country.age_structure * 0.44 + country.skill_depth * 0.36 + country.migration_diaspora_network * 0.20
    coordination_drag = country.diversity_coordination_load * 0.22 + country.inequality_pressure * 0.26

    gdp = (
        event.global_demand * country.export_dependence * 1.45
        - energy_stress * 0.70
        - event.trade_barrier * country.manufacturing_weight * 0.86
        + event.tech_supply_chain * country.tech_supply_chain_weight * 0.98
        - event.credit_stress * country.financial_openness * 0.72
        - event.pandemic_disruption * (1.0 - country.domestic_demand_buffer * 0.45)
        + event.confidence * 0.50
        + buffer * 0.30
        + social_resilience * 0.22
        - coordination_drag * max(event.credit_stress + event.pandemic_disruption + event.trade_barrier, 0.0) * 0.18
    )
    inflation = (
        energy_stress * 1.42
        + event.trade_barrier * country.import_cost_exposure
        + event.usd_rate_pressure * country.currency_sensitivity * 0.52
        + event.global_demand * 0.24
        + event.pandemic_disruption * country.import_cost_exposure * 0.35
        + country.inequality_pressure * max(event.energy_price + event.trade_barrier, 0.0) * 0.10
    )
    currency = (
        -financial_stress * country.currency_sensitivity * 1.15
        - energy_stress * 0.34
        - external_exposure * 0.23
        + country.policy_space * 0.22
        + event.usd_rate_pressure * country.reserve_currency_advantage
    )
    policy_rate = (
        inflation * 0.60
        + event.usd_rate_pressure * 0.35
        - max(-gdp, 0.0) * 0.24
        - event.credit_stress * 0.15
        + country.policy_space * 0.08
        + country.social_trust * 0.05
    )
    equity = (
        gdp * 1.08
        - inflation * 0.36
        - financial_stress * 0.62
        + event.confidence * 1.12
        + social_resilience * 0.25
    )
    unemployment = (
        max(-gdp, 0.0) * 0.55
        + event.credit_stress * 0.18
        + event.pandemic_disruption * 0.35
        + country.inequality_pressure * 0.12
        - labor_flexibility * 0.14
    )
    current_account = (
        -energy_stress * 0.56
        + event.global_demand * country.export_dependence * 0.60
        - event.trade_barrier * country.export_dependence * 0.38
        + currency * 0.12
    )

    return Reaction(
        period=period_label(period),
        year=year,
        event=event.name,
        country=country.name,
        gdp_growth_impact=clamp(gdp),
        inflation_impact=clamp(inflation),
        currency_impact=clamp(currency),
        policy_rate_bias=clamp(policy_rate),
        equity_market_impact=clamp(equity),
        unemployment_impact=clamp(unemployment, 0.0, 5.0),
        current_account_impact=clamp(current_account),
        summary=make_summary(gdp, inflation, currency, policy_rate, equity, unemployment),
    )


def make_summary(gdp: float, inflation: float, currency: float, policy_rate: float, equity: float, unemployment: float) -> str:
    growth = "成長承壓" if gdp < -0.45 else "成長略受影響" if gdp < 0.20 else "成長具韌性"
    prices = "通膨升溫" if inflation > 0.50 else "物價壓力有限" if inflation > -0.20 else "通膨降溫"
    fx = "匯率偏弱" if currency < -0.40 else "匯率大致穩定" if currency < 0.30 else "匯率偏強"
    rates = "央行偏緊縮" if policy_rate > 0.45 else "央行偏觀望" if policy_rate > -0.25 else "央行偏寬鬆"
    stocks = "股市承壓" if equity < -0.55 else "股市震盪" if equity < 0.25 else "股市相對有撐"
    jobs = "失業壓力升高" if unemployment > 0.70 else "就業壓力可控"
    return f"{growth}，{prices}，{fx}，{rates}，{stocks}，{jobs}"


def simulate(year: int, event_name: str, intensity: float = 1.0, countries: Iterable[str] = COUNTRY_ORDER) -> List[Reaction]:
    if event_name not in EVENTS:
        known = "、".join(EVENTS)
        raise ValueError(f"未知事件：{event_name}。可用事件：{known}")
    event = event_with_intensity(EVENTS[event_name], intensity)
    return [simulate_reaction(profile_for(country, year), event, year) for country in countries]


def print_table(reactions: List[Reaction]) -> None:
    if not reactions:
        return
    first = reactions[0]
    event = EVENTS[first.event]
    print(f"\n時點：{first.year}（5年區間：{first.period}）")
    print(f"事件：{event.name}")
    print(f"說明：{event.description}\n")
    print("國家 | GDP | 通膨 | 匯率 | 利率 | 股市 | 失業 | 經常帳 | 摘要")
    print("--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---")
    for r in reactions:
        print(
            f"{r.country} | {r.gdp_growth_impact:+.2f} | {r.inflation_impact:+.2f} | "
            f"{r.currency_impact:+.2f} | {r.policy_rate_bias:+.2f} | {r.equity_market_impact:+.2f} | "
            f"{r.unemployment_impact:+.2f} | {r.current_account_impact:+.2f} | {r.summary}"
        )


def print_moments() -> None:
    print("可用歷史時機點：")
    for name, (year, event_name) in HISTORICAL_MOMENTS.items():
        print(f"- {name}: {year}, {event_name}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="以 1990-2026 的 5 年歷史區間模擬各國面對重大事件的反應。")
    parser.add_argument("--year", type=int, default=2022, help="事件丟入的年份，範圍 1990-2026。")
    parser.add_argument("--event", default="全球金融危機", choices=sorted(EVENTS), help="要模擬的重大事件。")
    parser.add_argument("--intensity", type=float, default=1.0, help="事件強度，1.0 代表標準情境。")
    parser.add_argument("--moment", choices=sorted(HISTORICAL_MOMENTS), help="使用預設歷史時機點，例如 2008金融海嘯。")
    parser.add_argument("--list", action="store_true", help="列出可用事件與歷史時機點。")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.list:
        print("可用事件：")
        for name in sorted(EVENTS):
            print(f"- {name}")
        print()
        print_moments()
        return

    year = args.year
    event_name = args.event
    if args.moment:
        year, event_name = HISTORICAL_MOMENTS[args.moment]

    reactions = simulate(year=year, event_name=event_name, intensity=args.intensity)
    print_table(reactions)


if __name__ == "__main__":
    main()
