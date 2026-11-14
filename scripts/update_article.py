#!/usr/bin/env python3
"""Actualiza resultados del artículo usando python-docx y los CSV calibrados.

Los cambios se limitan al texto de runs ya existentes. No se reconstruyen tablas,
columnas, estilos ni secciones. Ejecutar después de ambos scripts de calibración.
"""

from __future__ import annotations

import csv
import math
from pathlib import Path

from docx import Document
from docx.text.paragraph import Paragraph


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "processed"
DOC_PATH = ROOT / "docs" / "Articulo_IEEE_Seguro_Parametrico_FINAL.docx"
BACKUP_PATH = ROOT / "docs" / "Articulo_IEEE_Seguro_Parametrico_BACKUP.docx"
SUM_INSURED = 2_000.0


def read_rows(name: str) -> list[dict[str, str]]:
    with (DATA / name).open(encoding="utf-8-sig", newline="") as source:
        return list(csv.DictReader(source))


def set_runs(paragraph: Paragraph, parts: list[str]) -> None:
    runs = paragraph.runs
    if len(runs) != len(parts):
        raise ValueError(f"La estructura de runs cambió en el párrafo {paragraph.text[:70]!r}.")
    for run, value in zip(runs, parts):
        run.text = value


def set_cell(cell, value: str) -> None:
    runs = [run for paragraph in cell.paragraphs for run in paragraph.runs]
    if not runs:
        raise ValueError("Una celda objetivo no tiene runs editables.")
    runs[0].text = value
    for run in runs[1:]:
        run.text = ""


def one_paragraph(document, marker: str) -> Paragraph:
    matches = [paragraph for paragraph in document.paragraphs if marker in paragraph.text]
    if len(matches) != 1:
        raise ValueError(f"Se esperaba un párrafo con {marker!r}; encontrados: {len(matches)}.")
    return matches[0]


def num(value: str | float, digits: int = 1) -> str:
    return f"{float(value):,.{digits}f}"


def pct(value: str | float, digits: int = 2) -> str:
    return f"{float(value) * 100:.{digits}f} %"


def main() -> None:
    if not DOC_PATH.is_file() or not BACKUP_PATH.is_file():
        raise FileNotFoundError("El DOCX original y su copia BACKUP deben existir antes de editar.")
    summary = {row["scenario"]: row for row in read_rows("monte_carlo_summary.csv")}
    baseline = summary["Climatológico empírico"]
    alert = summary["Alerta ilustrativa"]
    regimes = {row["icen_regime"]: row for row in read_rows("icen_regime_models.csv")}
    adaptations = read_rows("adaptation_sensitivity.csv")
    adaptation_by_theta = {round(float(row["theta"]), 2): row for row in adaptations if row["ka_mm"]}
    adoption_rows = {round(float(row["adoption"]), 2): row for row in adaptations if row["adoption"]}
    sensitivity_rows = {
        int(float(row["strike_mm"])): row for row in read_rows("premium_sensitivity.csv")
    }
    stress = read_rows("stress_test.csv")
    yields = read_rows("midagri_yield_t_ha.csv")
    rice_piura = next(
        float(row["yield_t_ha"])
        for row in yields
        if row["region"].casefold() == "piura" and row["crop"].strip().casefold() == "arroz cáscara"
    )
    seasonal = {int(row["season_year"]): float(row["rain_mm"]) for row in read_rows("seasonal_calibration.csv")}

    document = Document(DOC_PATH)
    if len(document.tables) != 5:
        raise ValueError(f"El artículo debe tener 5 tablas principales; encontradas: {len(document.tables)}.")

    # Abstract: se conserva la división visual existente del exponente 10^6.
    set_runs(document.paragraphs[4], [
        "Abstract— Este trabajo diseña un seguro paramétrico agrícola por índice de precipitación para arroz cáscara en Piura ante El Niño Costero. La calibración empírica preliminar usa 45 temporadas completas CHIRPS (ventana diciembre–abril) y una validación diaria frente a 45,804 pares SENAMHI (r = 0.2073, sesgo = 0.48 mm/día, RMSE = 5.50 mm/día). Se ajusta una mezcla lognormal en tres regímenes ICEN y se evalúa el contrato con K = 140 mm, S = 200 mm y N = 10",
        "6",
        f" temporadas simuladas. En el escenario climatológico, E[P] = S/ {num(baseline['expected_payout'])}/ha, Π = S/ {num(baseline['premium'])}/ha ({num(baseline['premium_pct_sum_insured'])} % de L), el equilibrio es N* = {baseline['break_even_policies']} pólizas y el descuento para θ = 10 % es {pct(adaptation_by_theta[0.10]['discount_pct'])}. Para 1,000 ha, U = S/ {num(baseline['annual_result'], 0)}; el pago catastrófico equivale a {num(float(stress[0]['loss_to_premium_multiple']))} veces las primas anuales. Los resultados son preliminares por el tamaño de la serie y no estiman el riesgo de base sin rendimientos históricos multianuales.",
    ])

    # Sección II-A3: validación real y tratamiento explícito de cobertura.
    set_runs(document.paragraphs[21], [
        "3) Control de calidad y validación:",
        " la comparación diaria de CHIRPS con SENAMHI, tras excluir -99.9, produjo r de Pearson = 0.2073, sesgo SENAMHI−CHIRPS = 0.48 mm/día y RMSE = 5.50 mm/día en 45,804 pares válidos. Es una validación indicativa entre precipitación areal y mediciones puntuales:",
    ])
    set_runs(document.paragraphs[24], [
        "con R̂",
        "i",
        " el índice satelital y R",
        "i",
        " el observado en la estación i. La calibración estacional conserva las 45 ventanas CHIRPS completas entre diciembre y abril; la ventana inicial incompleta se excluyó. Los centinelas -99.9 de SENAMHI se trataron como ausentes y no como precipitación cero.",
    ])

    # Sección II-B1: describe el ajuste que realmente se ejecutó, sin afirmar pruebas no realizadas.
    set_runs(document.paragraphs[31], [
        "donde ",
        "Φ",
        " es la distribución normal estándar. Se ajusta provisionalmente una lognormal por máxima verosimilitud sobre R > 0 en cada uno de los tres regímenes agrupados. Con 28, 10 y 7 temporadas, respectivamente, estos parámetros son exploratorios; AIC/BIC, pruebas de Kolmogorov–Smirnov y Anderson–Darling, bootstrap y refinamiento GPD de cola quedan para una serie ampliada.",
    ])
    set_runs(document.paragraphs[34], [
        "con N = 10",
        "6",
        f" se obtiene un error estándar Monte Carlo de S/ {num(float(baseline['payout_sd']) / math.sqrt(int(baseline['n'])), 2)} por ha para E[P] climatológico (aprox. {num(100 * float(baseline['payout_sd']) / math.sqrt(int(baseline['n'])) / float(baseline['expected_payout']), 2)} % relativo).",
    ])

    # Configuración y tablas I–V; solo se reemplaza texto en runs/celdas existentes.
    set_runs(document.paragraphs[72], [
        "Se simulan N = 10",
        "6",
        " temporadas con semilla fija. La Tabla I presenta los parámetros del contrato y la Tabla II la calibración de los tres regímenes ICEN con 45 temporadas completas CHIRPS. ",
        "La calibración es empírica preliminar",
        "; la validación diaria con SENAMHI es indicativa y las estimaciones de los regímenes cálidos tienen incertidumbre muestral alta.",
    ])
    table1, table2, table3, table4, table5 = document.tables
    set_cell(table1.rows[0].cells[2], "Valor calibrado preliminar")
    set_cell(table1.rows[1].cells[2], "Piura (Estaciones: Miraflores, Morropón, Mallares, Bernal)")
    set_cell(table1.rows[2].cells[2], "Arroz cáscara")
    set_cell(table1.rows[5].cells[2], "140 mm")
    set_cell(table1.rows[6].cells[2], "200 mm")
    set_cell(table1.rows[10].cells[2], f"S/ {num(baseline['premium'])} por ha")
    set_cell(table1.rows[14].cells[2], "10 % (escenario evaluado)")

    regime_order = (
        "Neutro o frío",
        "Cálido débil o moderado",
        "Cálido fuerte o extraordinario",
    )
    for row_index, name in enumerate(regime_order, start=1):
        model = regimes[name]
        set_cell(table2.rows[row_index].cells[0], name)
        set_cell(table2.rows[row_index].cells[1], f"{float(model['pi_c']):.4f} (n={model['n_seasons']})")
        set_cell(table2.rows[row_index].cells[2], num(model["median_mc_mm"], 2))
        set_cell(table2.rows[row_index].cells[3], num(model["sigma_c"], 4))
        set_cell(table2.rows[row_index].cells[4], pct(model["prob_r_gt_strike"]))

    set_cell(table3.rows[0].cells[1], "Climatológico calibrado")
    set_cell(table3.rows[0].cells[2], "Alerta ilustrativa")
    set_cell(table3.rows[1].cells[0], "Probabilidades πc (frío / cálido débil-moderado / cálido fuerte-extraordinario)")
    set_cell(table3.rows[1].cells[1], "0.6222 / 0.2222 / 0.1556")
    set_cell(table3.rows[1].cells[2], "0.10 / 0.30 / 0.60 (supuesto)")
    set_cell(table3.rows[2].cells[0], "P(activación) / P(pago total)")
    set_cell(table3.rows[2].cells[1], f"{pct(baseline['activation_probability'])} / {pct(baseline['full_payout_probability'])}")
    set_cell(table3.rows[2].cells[2], f"{pct(alert['activation_probability'])} / {pct(alert['full_payout_probability'])}")
    for row_index, key in ((3, "expected_payout"), (4, "payout_sd"), (5, "premium")):
        set_cell(table3.rows[row_index].cells[1], num(baseline[key]))
        set_cell(table3.rows[row_index].cells[2], num(alert[key]))
    set_cell(table3.rows[6].cells[1], f"{num(baseline['premium_pct_sum_insured'])} %")
    set_cell(table3.rows[6].cells[2], f"{num(alert['premium_pct_sum_insured'])} %")

    for row_index, theta in enumerate((0.0, 0.05, 0.10, 0.20), start=1):
        if theta == 0:
            ka, sa = 140.0, 200.0
            expected_payout = float(baseline["expected_payout"])
            price = float(baseline["premium"])
            discount = None
        else:
            model = adaptation_by_theta[theta]
            ka, sa = float(model["ka_mm"]), float(model["sa_mm"])
            expected_payout = float(model["expected_payout"])
            price = float(model["premium"])
            discount = float(model["discount_pct"])
        set_cell(table4.rows[row_index].cells[0], f"{theta:.0%}")
        set_cell(table4.rows[row_index].cells[1], f"{ka:.0f} / {sa:.0f}")
        set_cell(table4.rows[row_index].cells[2], num(expected_payout))
        set_cell(table4.rows[row_index].cells[3], num(price))
        set_cell(table4.rows[row_index].cells[4], "–" if discount is None else pct(discount))

    for row_index, strike in enumerate((120, 130, 140, 160), start=1):
        result = sensitivity_rows[strike]
        set_cell(table5.rows[row_index].cells[0], f"{strike} / {int(float(result['exit_mm']))}")
        set_cell(table5.rows[row_index].cells[1], pct(result["activation_probability"]))
        set_cell(table5.rows[row_index].cells[2], num(result["expected_payout"]))
        set_cell(table5.rows[row_index].cells[3], num(result["premium"]))

    # Narrativa de resultados III y conclusiones.
    p81 = document.paragraphs[81]
    set_runs(p81, [
        "En el escenario climatológico de la Tabla II, la lluvia media simulada es de 90.72 mm; la probabilidad de activación es 14.93 % y la de pago total, 7.63 %. El pago esperado es E[P] = S/ 214.52 por ha, con desviación estándar ",
        "σ",
        "P",
        f" = S/ {num(baseline['payout_sd'])}; el error estándar de simulación de E[P] es S/ {num(float(baseline['payout_sd']) / math.sqrt(int(baseline['n'])), 2)}. Aplicando (8), la prima comercial es ",
        "Π",
        f" = S/ {num(baseline['premium'])} por ha ({num(baseline['premium_pct_sum_insured'])} % de L), con LR = {num(baseline['loss_ratio'])} %. La Tabla III compara este escenario con una ponderación ilustrativa de alerta.",
    ])
    set_runs(document.paragraphs[85], [
        f"Con la mezcla ilustrativa de alerta 0.10/0.30/0.60, la prima asciende a S/ {num(alert['premium'])}/ha ({num(alert['premium_pct_sum_insured'])} % de L), frente a S/ {num(baseline['premium'])}/ha en climatología. Estas ponderaciones representan un escenario de estrés y no frecuencias observadas; muestran la importancia de suscribir antes de una alerta y de evaluar reaseguro o respaldo público.",
    ])
    set_runs(document.paragraphs[87], [
        f"La masa de pago total estimada es {pct(baseline['full_payout_probability'])}; por ello, los VaR al 95 % y 99 % y los TVaR al 95 % y 99 % alcanzan S/ {SUM_INSURED:,.0f} por hectárea. La concentración de la cola refleja el límite del contrato y el supuesto de una misma zona climática.",
    ])
    set_runs(document.paragraphs[90], [
        "Con F = S/ 60,000 y c",
        "v",
        f" = S/ 20, cada póliza deja S/ {num(float(baseline['premium']) - float(baseline['expected_payout']) - 20)} tras pago esperado y costo variable. El punto de equilibrio es N* = {baseline['break_even_policies']} pólizas. Para H = 1,000 ha, las primas esperadas suman S/ {num(baseline['annual_premium'], 0)}, los pagos S/ {num(baseline['annual_expected_claims'], 0)}, los costos variables S/ 20,000 y F = S/ 60,000; U = S/ {num(baseline['annual_result'], 0)}.",
    ])
    p93 = document.paragraphs[93]
    theta10 = adaptation_by_theta[0.10]
    set_runs(p93, [
        "Al desplazar K y S en la misma fracción θ, disminuyen el pago esperado y la prima. Con ",
        "θ",
        f" = 10 %, E[P] baja de S/ {num(baseline['expected_payout'])} a S/ {num(theta10['expected_payout'])}/ha y Π de S/ {num(baseline['premium'])} a S/ {num(theta10['premium'])}/ha, con δ = {pct(theta10['discount_pct'])}. La Tabla IV presenta θ = 5 %, 10 % y 20 %.",
        "",
        "",
    ])
    adoption30, adoption60 = adoption_rows[0.30], adoption_rows[0.60]
    set_runs(document.paragraphs[97], [
        "A nivel de cartera, con ",
        "θ",
        f" = 10 %, una adopción de 30 % reduce los pagos esperados de S/ {num(baseline['annual_expected_claims'], 0)} a S/ {num(adoption30['portfolio_expected_payout'], 0)}, las primas a S/ {num(adoption30['portfolio_premium'], 0)} y U = S/ {num(adoption30['portfolio_result'], 0)}. Con adopción de 60 %, los pagos esperados son S/ {num(adoption60['portfolio_expected_payout'], 0)}, las primas S/ {num(adoption60['portfolio_premium'], 0)} y U = S/ {num(adoption60['portfolio_result'], 0)}. El indicador ambiental corresponde a 300 y 600 ha adaptadas, respectivamente.",
    ])
    set_runs(document.paragraphs[100], [
        "La sensibilidad se evaluó con la misma muestra al variar K/S alrededor de 140/200 mm. La Tabla V muestra que Π desciende de S/ 615.69 con K/S = 120/180 mm a S/ 435.38 con 160/220 mm; en el umbral calibrado, Π = S/ 513.28 y la activación es 14.93 %. Se mantiene λ = 0.25.",
        "",
        "",
    ])
    set_runs(document.paragraphs[104], [
        f"La prueba de estrés supone correlación espacial perfecta: el pago máximo para 1,000 ha es S/ 2,000,000, equivalente a {num(float(stress[0]['loss_to_premium_multiple']))} veces las primas anuales climatológicas (S/ {num(baseline['annual_premium'], 0)}). Las temporadas CHIRPS 1997–98 ({seasonal[1998]:.1f} mm), 2016–17 ({seasonal[2017]:.1f} mm) y 2022–23 ({seasonal[2023]:.1f} mm) exceden S y activan el pago máximo. La cartera requiere reaseguro y reservas de catástrofe.",
    ])
    set_runs(document.paragraphs[106], [
        f"MIDAGRI 2023 registra para Piura un rendimiento de arroz cáscara de {rice_piura:.2f} t/ha. Es una referencia productiva transversal, no una serie anual de pérdidas: con el anuario 2023 disponible no se estiman Spearman ρ, tasas de falsos negativos/falsos positivos ni DBR, y por tanto tampoco el óptimo empírico de K/S. Para completar esas métricas se requieren anuarios comparables de 1997–2022, alineados por campaña con las temporadas CHIRPS, y construir la tendencia de rendimiento de (10).",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
    ])

    set_runs(document.paragraphs[111], [
        "3)",
        f" Con la calibración empírica preliminar de 45 temporadas, la prima climatológica es S/ {num(baseline['premium'])}/ha, el equilibrio es {baseline['break_even_policies']} pólizas y U = S/ {num(baseline['annual_result'], 0)} para 1,000 ha.",
    ])
    set_runs(document.paragraphs[112], [
        "4)",
        " El incentivo desplaza los umbrales y reduce el costo esperado; el descuento llega a ",
        "θ",
        f" = 20 % (δ = {pct(adaptation_by_theta[0.20]['discount_pct'])}), sujeto a validar θ con evidencia agronómica.",
    ])
    set_runs(document.paragraphs[113], [
        "5)",
        f" El riesgo es sistémico: el pago máximo alcanza {num(float(stress[0]['loss_to_premium_multiple']))} veces las primas anuales climatológicas, por lo que se requieren reaseguro y reservas.",
    ])
    set_runs(document.paragraphs[114], [
        "6)",
        f" La mezcla de alerta ilustrativa eleva Π a S/ {num(alert['premium'])}/ha ({num(alert['premium_pct_sum_insured'])} % de L); las ponderaciones de alerta son supuestos, no pronósticos ni frecuencias observadas.",
    ])
    set_runs(document.paragraphs[116], [
        "Se propone i) ampliar la calibración de precipitación y cuantificar el riesgo de base con series históricas MIDAGRI 1997–2022; ii) validar ",
        "θ",
        " con fuentes agronómicas y productores; iii) contrastar lognormal con alternativas y cuantificar incertidumbre mediante bootstrap; iv) incorporar índices complementarios, como NDVI y humedad del suelo; v) modelar correlación espacial y reaseguro; y vi) evaluar un piloto con cooperativa y aseguradora autorizada dentro del marco SBS.",
    ])

    document.save(DOC_PATH)
    print(f"Artículo actualizado: {DOC_PATH}")
    print(f"Respaldo sin modificar: {BACKUP_PATH}")
    print(f"Tablas actualizadas: {len(document.tables)}; párrafos: {len(document.paragraphs)}")


if __name__ == "__main__":
    main()
