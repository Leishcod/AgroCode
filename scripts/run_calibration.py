#!/usr/bin/env python3
"""Monte Carlo reproducible de la calibración AgroCode (solo biblioteca estándar).

Ejecutar después de ``python scripts/process_data.py``:
    python scripts/run_calibration.py

El modelo usa la mezcla lognormal de los tres regímenes ajustada a CHIRPS. La
semilla, el tamaño N y las hipótesis económicas quedan en los archivos de salida.
"""

from __future__ import annotations

import csv
import math
import random
import statistics
import sys
from pathlib import Path
from typing import Sequence


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "processed"
MODEL_FILE = DATA / "icen_regime_models.csv"
SEASON_FILE = DATA / "seasonal_calibration.csv"
N = 1_000_000
SEED = 20261113
STRIKE_MM = 140.0
EXIT_MM = 200.0
SUM_INSURED = 2_000.0  # L, S/ por ha
SAFETY_LOADING = 0.25  # lambda
EXPENSE_RATIO = 0.30  # g
FIXED_COST = 60_000.0  # S/ por año
VARIABLE_COST = 20.0  # S/ por póliza/año
PORTFOLIO_HA = 1_000
ALERT_WEIGHTS = (0.10, 0.30, 0.60)  # escenario ilustrativo de la Tabla III original
SENSITIVITY_PAIRS = ((120, 180), (130, 190), (140, 200), (150, 210), (160, 220))


def load_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as source:
        return list(csv.DictReader(source))


def load_models() -> list[dict[str, float | str]]:
    records = load_csv(MODEL_FILE)
    expected = (
        "Neutro o frío",
        "Cálido débil o moderado",
        "Cálido fuerte o extraordinario",
    )
    by_name = {row["icen_regime"]: row for row in records}
    if any(name not in by_name for name in expected):
        raise ValueError("Faltan uno o más regímenes en icen_regime_models.csv; regenere los datos.")
    return [
        {
            "name": name,
            "pi": float(by_name[name]["pi_c"]),
            "mu": float(by_name[name]["mu_c"]),
            "sigma": float(by_name[name]["sigma_c"]),
            "n": float(by_name[name]["n_seasons"]),
        }
        for name in expected
    ]


def simulate_rainfall(
    models: Sequence[dict[str, float | str]], weights: Sequence[float], n: int, seed: int,
) -> list[float]:
    if len(models) != len(weights) or not math.isclose(sum(weights), 1.0, abs_tol=1e-9):
        raise ValueError("Las ponderaciones de la mezcla deben sumar 1.")
    rng = random.Random(seed)
    cumulative = (weights[0], weights[0] + weights[1])
    rainfalls: list[float] = []
    for _ in range(n):
        draw = rng.random()
        index = 0 if draw < cumulative[0] else (1 if draw < cumulative[1] else 2)
        model = models[index]
        rainfalls.append(rng.lognormvariate(float(model["mu"]), float(model["sigma"])))
    return rainfalls


def payout(rain_mm: float, strike_mm: float, exit_mm: float) -> float:
    if rain_mm <= strike_mm:
        return 0.0
    return SUM_INSURED * min(1.0, (rain_mm - strike_mm) / (exit_mm - strike_mm))


def premium(expected_payout: float, payout_sd: float) -> float:
    return (expected_payout + SAFETY_LOADING * payout_sd) / (1 - EXPENSE_RATIO)


def metrics(rainfalls: Sequence[float], strike_mm: float, exit_mm: float) -> dict[str, float | int]:
    payouts = [payout(rain, strike_mm, exit_mm) for rain in rainfalls]
    count = len(rainfalls)
    expected = statistics.fmean(payouts)
    deviation = statistics.pstdev(payouts)
    price = premium(expected, deviation)
    ordered = sorted(payouts)

    def tail(q: float) -> tuple[float, float]:
        index = min(count - 1, math.ceil(q * count) - 1)
        tail_count = max(1, math.ceil((1 - q) * count))
        return ordered[index], statistics.fmean(ordered[-tail_count:])

    var95, tvar95 = tail(0.95)
    var99, tvar99 = tail(0.99)
    unit_contribution = price - expected - VARIABLE_COST
    break_even = math.ceil(FIXED_COST / unit_contribution) if unit_contribution > 0 else 0
    annual_premium = price * PORTFOLIO_HA
    annual_claims = expected * PORTFOLIO_HA
    annual_costs = FIXED_COST + VARIABLE_COST * PORTFOLIO_HA
    return {
        "n": count,
        "rain_mean_mm": statistics.fmean(rainfalls),
        "activation_probability": sum(r > strike_mm for r in rainfalls) / count,
        "full_payout_probability": sum(r >= exit_mm for r in rainfalls) / count,
        "expected_payout": expected,
        "payout_sd": deviation,
        "premium": price,
        "premium_pct_sum_insured": 100 * price / SUM_INSURED,
        "loss_ratio": 100 * expected / price if price else 0.0,
        "var95": var95,
        "tvar95": tvar95,
        "var99": var99,
        "tvar99": tvar99,
        "break_even_policies": break_even,
        "annual_result": annual_premium - annual_claims - annual_costs,
        "annual_premium": annual_premium,
        "annual_expected_claims": annual_claims,
        "annual_costs": annual_costs,
    }


def adaptation_rows(rainfalls: Sequence[float], baseline: dict[str, float | int]) -> list[dict[str, float | int]]:
    rows: list[dict[str, float | int]] = []
    base_premium = float(baseline["premium"])
    base_expected = float(baseline["expected_payout"])
    for theta in (0.05, 0.10, 0.20):
        ka = STRIKE_MM * (1 + theta)
        sa = EXIT_MM * (1 + theta)
        adapted = metrics(rainfalls, ka, sa)
        discount = (base_premium - float(adapted["premium"])) / base_premium if base_premium else 0
        rows.append({
            "theta": theta,
            "ka_mm": ka,
            "sa_mm": sa,
            "expected_payout": adapted["expected_payout"],
            "premium": adapted["premium"],
            "discount_pct": discount,
            "activation_probability": adapted["activation_probability"],
            "full_payout_probability": adapted["full_payout_probability"],
            "expected_payout_change_pct": (float(adapted["expected_payout"]) / base_expected - 1) if base_expected else 0,
        })
    theta10 = rows[1]
    adapted_ep = float(theta10["expected_payout"])
    adapted_premium = float(theta10["premium"])
    for adoption in (0.30, 0.60):
        portfolio_ep_per_ha = (1 - adoption) * base_expected + adoption * adapted_ep
        portfolio_premium_per_ha = (1 - adoption) * base_premium + adoption * adapted_premium
        rows.append({
            "theta": 0.10,
            "adoption": adoption,
            "portfolio_expected_payout": portfolio_ep_per_ha * PORTFOLIO_HA,
            "portfolio_premium": portfolio_premium_per_ha * PORTFOLIO_HA,
            "portfolio_result": (
                portfolio_premium_per_ha - portfolio_ep_per_ha - VARIABLE_COST
            ) * PORTFOLIO_HA - FIXED_COST,
        })
    return rows


def write_csv(path: Path, rows: Sequence[dict[str, object]]) -> None:
    fields: list[str] = []
    for row in rows:
        for key in row:
            if key not in fields:
                fields.append(key)
    with path.open("w", encoding="utf-8-sig", newline="") as target:
        writer = csv.DictWriter(target, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def fmt(value: float | int, digits: int = 2) -> str:
    return f"{value:,.{digits}f}"


def build_report(
    models: Sequence[dict[str, float | str]],
    baseline: dict[str, float | int],
    alert: dict[str, float | int],
    adaptations: Sequence[dict[str, float | int]],
    sensitivity: Sequence[dict[str, float | int]],
    stress: Sequence[dict[str, float | int | str]],
    regime_exceedance: dict[str, float],
    historic_rain: dict[int, float],
) -> str:
    lines = [
        "# Resultados Monte Carlo de la calibración AgroCode",
        "",
        f"- Simulaciones por escenario: **N = {N:,}**; semilla base: **{SEED}**.",
        f"- K = **{STRIKE_MM:.0f} mm**; S = **{EXIT_MM:.0f} mm**; L = **S/ {SUM_INSURED:,.0f}/ha**.",
        f"- λ = {SAFETY_LOADING:.2f}; g = {EXPENSE_RATIO:.0%}; F = S/ {FIXED_COST:,.0f}; cv = S/ {VARIABLE_COST:.0f}; H = {PORTFOLIO_HA:,} ha.",
        "- R se simula desde lognormales por régimen, ponderadas por frecuencias ICEN empíricas de 45 temporadas CHIRPS.",
        "- Prima Π = (E[P] + λ·σP)/(1−g); no se aplica un subsidio adicional a la prima adaptada.",
        "",
        "## Parámetros calibrados por régimen",
        "",
        "| Régimen | n | πc | mc (mm) | μc | σc | Pr(R>K) estimada |",
        "|---|---:|---:|---:|---:|---:|---:|",
    ]
    for model in models:
        lines.append(
            f"| {model['name']} | {int(model['n'])} | {fmt(float(model['pi']) * 100)}% | "
            f"{fmt(math.exp(float(model['mu'])))} | {fmt(float(model['mu']), 5)} | "
            f"{fmt(float(model['sigma']), 5)} | {fmt(regime_exceedance[str(model['name'])] * 100)}% |"
        )
    lines.extend([
        "",
        "## Resultados principales",
        "",
        "| Indicador | Climatológico empírico | Alerta ilustrativa (10/30/60%) |",
        "|---|---:|---:|",
    ])
    metric_names = (
        ("rain_mean_mm", "Lluvia media simulada (mm)"),
        ("activation_probability", "Probabilidad de activación"),
        ("full_payout_probability", "Probabilidad de pago total"),
        ("expected_payout", "E[P] (S/ por ha)"),
        ("payout_sd", "σP (S/ por ha)"),
        ("premium", "Prima Π (S/ por ha)"),
        ("premium_pct_sum_insured", "Prima como % de L"),
        ("loss_ratio", "LR"),
        ("var95", "VaR 95% (S/ por ha)"),
        ("tvar95", "TVaR 95% (S/ por ha)"),
        ("var99", "VaR 99% (S/ por ha)"),
        ("tvar99", "TVaR 99% (S/ por ha)"),
        ("break_even_policies", "Punto de equilibrio N* pólizas"),
        ("annual_result", "Resultado anual U (S/, cartera)"),
    )
    for key, label in metric_names:
        left, right = baseline[key], alert[key]
        if key in {"activation_probability", "full_payout_probability"}:
            lines.append(f"| {label} | {fmt(float(left) * 100)}% | {fmt(float(right) * 100)}% |")
        elif key in {"premium_pct_sum_insured", "loss_ratio"}:
            lines.append(f"| {label} | {fmt(float(left))}% | {fmt(float(right))}% |")
        else:
            lines.append(f"| {label} | {fmt(float(left))} | {fmt(float(right))} |")
    lines.extend([
        "",
        "El escenario de alerta conserva las ponderaciones hipotéticas 10/30/60% que ya figuraban en la Tabla III; no son frecuencias observadas.",
        "",
        "## Incentivo de adaptación",
        "",
        "| θ | Ka / Sa (mm) | E[P] (S/ha) | Π (S/ha) | δ sobre Π | P(activación) | P(pago total) |",
        "|---:|---:|---:|---:|---:|---:|---:|",
    ])
    for row in adaptations:
        if "ka_mm" not in row:
            continue
        lines.append(
            f"| {float(row['theta']):.0%} | {fmt(float(row['ka_mm']), 0)} / {fmt(float(row['sa_mm']), 0)} | "
            f"{fmt(float(row['expected_payout']))} | {fmt(float(row['premium']))} | "
            f"{fmt(float(row['discount_pct']) * 100)}% | {fmt(float(row['activation_probability']) * 100)}% | "
            f"{fmt(float(row['full_payout_probability']) * 100)}% |"
        )
    lines.extend([
        "",
        "| Adopción (θ=10%) | Prima cartera (S/) | Pagos esperados (S/) | U anual (S/) |",
        "|---:|---:|---:|---:|",
    ])
    for row in adaptations:
        if "adoption" not in row:
            continue
        lines.append(
            f"| {float(row['adoption']):.0%} | {fmt(float(row['portfolio_premium']))} | "
            f"{fmt(float(row['portfolio_expected_payout']))} | {fmt(float(row['portfolio_result']))} |"
        )
    lines.extend([
        "",
        "## Sensibilidad a K/S (misma muestra Monte Carlo)",
        "",
        "| K / S (mm) | Activación | E[P] (S/ha) | σP (S/ha) | Π (S/ha) |",
        "|---:|---:|---:|---:|---:|",
    ])
    for row in sensitivity:
        lines.append(
            f"| {float(row['strike_mm']):.0f} / {float(row['exit_mm']):.0f} | "
            f"{fmt(float(row['activation_probability']) * 100)}% | {fmt(float(row['expected_payout']))} | "
            f"{fmt(float(row['payout_sd']))} | {fmt(float(row['premium']))} |"
        )
    lines.extend([
        "",
        "## Estrés catastrófico",
        "",
        "| Caso | R (mm) | Pago por ha (S/) | Pago cartera (S/) | Pago / primas anuales |",
        "|---|---:|---:|---:|---:|",
    ])
    for row in stress:
        lines.append(
            f"| {row['case']} | {fmt(float(row['rain_mm']))} | {fmt(float(row['payout_per_ha']))} | "
            f"{fmt(float(row['portfolio_loss']))} | {fmt(float(row['loss_to_premium_multiple']))}× |"
        )
    lines.extend([
        "",
        "## Escenarios históricos CHIRPS",
        "",
        "| Temporada | R observado (mm) |",
        "|---|---:|",
    ])
    for year, rain in sorted(historic_rain.items()):
        lines.append(f"| {year - 1}-{str(year)[-2:]} | {rain:.1f} |")
    lines.extend([
        "",
        "Los parámetros por régimen se estiman con 28, 10 y 7 temporadas, respectivamente. "
        "Los resultados cálidos tienen incertidumbre muestral alta; la simulación cuantifica la distribución ajustada, "
        "no elimina esa incertidumbre ni sustituye intervalos bootstrap o validación actuarial.",
        "",
        "El punto de equilibrio usa N* = ceil(F/(Π−E[P]−cv)) y U = H·(Π−E[P]−cv)−F. "
        "El cálculo descuenta F y cv de forma explícita para mantener la convención de la Tabla I.",
        "",
    ])
    return "\n".join(lines)


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    models = load_models()
    seasons = load_csv(SEASON_FILE)
    if len(seasons) != 45:
        raise ValueError(f"Se esperaban 45 temporadas completas; se encontraron {len(seasons)}.")
    weights = [float(model["pi"]) for model in models]
    if not math.isclose(sum(weights), 1.0, abs_tol=1e-9):
        raise ValueError(f"Las probabilidades ICEN no suman 1: {weights}")

    base_rain = simulate_rainfall(models, weights, N, SEED)
    base_metrics = metrics(base_rain, STRIKE_MM, EXIT_MM)
    alert_rain = simulate_rainfall(models, ALERT_WEIGHTS, N, SEED + 1)
    alert_metrics = metrics(alert_rain, STRIKE_MM, EXIT_MM)

    by_regime = {
        str(model["name"]): (float(model["mu"]), float(model["sigma"]))
        for model in models
    }
    exceedance = {
        name: 0.5 * math.erfc((math.log(STRIKE_MM) - mu) / (sigma * math.sqrt(2)))
        for name, (mu, sigma) in by_regime.items()
    }
    adapt = adaptation_rows(base_rain, base_metrics)
    sensitivity: list[dict[str, float | int]] = []
    for k_mm, s_mm in SENSITIVITY_PAIRS:
        result = metrics(base_rain, k_mm, s_mm)
        sensitivity.append({"strike_mm": k_mm, "exit_mm": s_mm, **result})

    premiums = float(base_metrics["premium"]) * PORTFOLIO_HA
    historic_rain = {int(row["season_year"]): float(row["rain_mm"]) for row in seasons}
    selected_historic = {
        year: historic_rain[year]
        for year in (1998, 2017, 2023)
        if year in historic_rain
    }
    stress_cases: list[tuple[str, float]] = [("Pago máximo", EXIT_MM)]
    stress_cases.extend((f"CHIRPS {year - 1}-{str(year)[-2:]}", rain) for year, rain in selected_historic.items())
    stress = []
    for case, rain in stress_cases:
        per_ha = payout(rain, STRIKE_MM, EXIT_MM)
        portfolio_loss = per_ha * PORTFOLIO_HA
        stress.append({
            "case": case,
            "rain_mm": rain,
            "payout_per_ha": per_ha,
            "portfolio_loss": portfolio_loss,
            "annual_premium_income": premiums,
            "loss_to_premium_multiple": portfolio_loss / premiums if premiums else 0,
        })

    summary_rows = [
        {"scenario": "Climatológico empírico", "weights": "/".join(f"{x:.2f}" for x in weights), **base_metrics},
        {"scenario": "Alerta ilustrativa", "weights": "0.10/0.30/0.60", **alert_metrics},
    ]
    write_csv(DATA / "monte_carlo_summary.csv", summary_rows)
    write_csv(DATA / "adaptation_sensitivity.csv", adapt)
    write_csv(DATA / "premium_sensitivity.csv", sensitivity)
    write_csv(DATA / "stress_test.csv", stress)
    report = build_report(models, base_metrics, alert_metrics, adapt, sensitivity, stress, exceedance, selected_historic)
    (DATA / "monte_carlo_report.md").write_text(report, encoding="utf-8")
    print(report)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, KeyError, ZeroDivisionError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
