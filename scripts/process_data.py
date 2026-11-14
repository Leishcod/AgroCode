#!/usr/bin/env python3
"""Procesa las fuentes climáticas y agrícolas de la tesis AgroCode.

Solo usa la biblioteca estándar. Ejecución desde cualquier directorio:
    python scripts/process_data.py

La temporada se identifica por su año de cierre: Dic 1981–Abr 1982 = 1982.
Las temporadas CHIRPS solo se conservan cuando están presentes todos sus días.
"""

from __future__ import annotations

import csv
import math
import statistics
import sys
import unicodedata
import zipfile
import xml.etree.ElementTree as ET
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path
from typing import Iterable, Sequence


ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "processed"
CHIRPS_FILE = RAW / "01_chirps" / "CHIRPS_Piura_Diario_1981_2026.csv"
SENAMHI_DIR = RAW / "02_senamhi"
ICEN_FILE = RAW / "03_icen" / "ICEN_Eventos_Historicos.xlsx"
MIDAGRI_FILE = RAW / "04_midagri" / "datos_agricola_2023.xlsx"
SENAMHI_COVERAGE_MIN = 0.95

NS_MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
NS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
NS_PKG = "http://schemas.openxmlformats.org/package/2006/relationships"
NS = {"m": NS_MAIN, "r": NS_REL}


@dataclass(frozen=True)
class Event:
    phase: str
    magnitude: str
    start_year: int
    start_month: int
    end_year: int
    end_month: int

    @property
    def state(self) -> str:
        return f"{self.phase} {self.magnitude.lower()}"

    @property
    def severity(self) -> int:
        key = normalize(self.magnitude)
        return {"debil": 1, "moderado": 2, "fuerte": 3, "extraordinario": 4}.get(key, 0)

    def overlaps(self, start: date, end: date) -> bool:
        event_start = date(self.start_year, self.start_month, 1)
        event_end = date(self.end_year, self.end_month, 1)
        return event_start <= end.replace(day=1) and event_end >= start.replace(day=1)


def normalize(value: str) -> str:
    decomposed = unicodedata.normalize("NFKD", value.strip().casefold())
    return "".join(char for char in decomposed if not unicodedata.combining(char))


def excel_column_index(reference: str) -> int:
    letters = "".join(char for char in reference if char.isalpha())
    result = 0
    for char in letters.upper():
        result = result * 26 + ord(char) - ord("A") + 1
    return result - 1


class XlsxReader:
    """Lector mínimo de hojas XLSX basado en ZIP/XML (sin openpyxl)."""

    def __init__(self, path: Path):
        self.archive = zipfile.ZipFile(path)
        self.shared_strings: list[str] = []
        if "xl/sharedStrings.xml" in self.archive.namelist():
            root = ET.fromstring(self.archive.read("xl/sharedStrings.xml"))
            self.shared_strings = [
                "".join(node.text or "" for node in item.findall(".//m:t", NS))
                for item in root.findall("m:si", NS)
            ]
        workbook = ET.fromstring(self.archive.read("xl/workbook.xml"))
        rel_root = ET.fromstring(self.archive.read("xl/_rels/workbook.xml.rels"))
        rels = {rel.attrib["Id"]: rel.attrib["Target"] for rel in rel_root}
        self.sheets: dict[str, str] = {}
        for sheet in workbook.findall("m:sheets/m:sheet", NS):
            target = rels[sheet.attrib[f"{{{NS_REL}}}id"]].lstrip("/")
            if not target.startswith("xl/"):
                target = f"xl/{target}"
            self.sheets[sheet.attrib["name"]] = target

    def rows(self, sheet_name: str) -> Iterable[list[str]]:
        if sheet_name not in self.sheets:
            raise ValueError(f"No se encontró la hoja {sheet_name!r}.")
        root = ET.fromstring(self.archive.read(self.sheets[sheet_name]))
        for row in root.findall(".//m:sheetData/m:row", NS):
            values: list[str] = []
            for cell in row.findall("m:c", NS):
                index = excel_column_index(cell.attrib.get("r", "A1"))
                while len(values) <= index:
                    values.append("")
                kind = cell.attrib.get("t")
                value_node = cell.find("m:v", NS)
                value = value_node.text if value_node is not None else ""
                if kind == "s" and value:
                    value = self.shared_strings[int(value)]
                elif kind == "inlineStr":
                    value = "".join(node.text or "" for node in cell.findall(".//m:t", NS))
                values[index] = value.strip()
            yield values

    def close(self) -> None:
        self.archive.close()


def parse_int(value: str, field: str) -> int:
    try:
        return int(float(value))
    except (TypeError, ValueError) as exc:
        raise ValueError(f"Valor entero inválido para {field}: {value!r}") from exc


def percentile(values: Sequence[float], pct: float) -> float:
    """Percentil lineal inclusivo (interpolación entre observaciones vecinas)."""
    if not values:
        raise ValueError("No se puede calcular un percentil sin observaciones.")
    ordered = sorted(values)
    position = (len(ordered) - 1) * pct / 100
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[lower]
    return ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower)


def season_for(day: date) -> int | None:
    if day.month == 12:
        return day.year + 1
    if 1 <= day.month <= 4:
        return day.year
    return None


def season_bounds(end_year: int) -> tuple[date, date]:
    return date(end_year - 1, 12, 1), date(end_year, 4, 30)


def expected_season_days(end_year: int) -> int:
    start, end = season_bounds(end_year)
    return (end - start).days + 1


def read_chirps() -> tuple[dict[date, float], list[dict[str, object]]]:
    daily: dict[date, float] = {}
    with CHIRPS_FILE.open("r", encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source)
        if not {"date", "precipitation"}.issubset(reader.fieldnames or []):
            raise ValueError("CHIRPS debe contener las columnas date y precipitation.")
        for line, row in enumerate(reader, start=2):
            try:
                day = date.fromisoformat((row["date"] or "").strip())
                rain = float(row["precipitation"])
                if not math.isfinite(rain) or rain < 0:
                    raise ValueError("precipitación negativa o no finita")
                if day in daily:
                    raise ValueError(f"fecha duplicada {day.isoformat()}")
                daily[day] = rain
            except (TypeError, ValueError) as exc:
                raise ValueError(f"CHIRPS, línea {line}: {exc}") from exc

    by_season: dict[int, dict[date, float]] = defaultdict(dict)
    for day, rain in daily.items():
        year = season_for(day)
        if year is not None:
            by_season[year][day] = rain

    seasons: list[dict[str, object]] = []
    for year, values in sorted(by_season.items()):
        start, end = season_bounds(year)
        expected = expected_season_days(year)
        present = sum(start <= day <= end for day in values)
        missing = expected - present
        if missing:
            continue
        seasons.append({
            "season_year": year,
            "season_start": start.isoformat(),
            "season_end": end.isoformat(),
            "rain_mm": round(sum(values.values()), 6),
            "days_expected": expected,
            "days_observed": present,
        })
    return daily, seasons


def read_senamhi() -> tuple[list[dict[str, object]], dict[str, dict[date, float]], list[dict[str, object]]]:
    cleaned: list[dict[str, object]] = []
    daily_by_station: dict[str, dict[date, float]] = {}
    raw_by_station: dict[str, dict[date, float | None]] = {}
    for path in sorted(SENAMHI_DIR.glob("*.txt")):
        station = path.stem
        station_daily: dict[date, float | None] = {}
        with path.open("r", encoding="utf-8-sig") as source:
            for line_number, line in enumerate(source, start=1):
                fields = line.split()
                if not fields:
                    continue
                if len(fields) != 6:
                    raise ValueError(f"{path.name}, línea {line_number}: se esperaban 6 columnas.")
                try:
                    year, month, day_num = (parse_int(fields[i], "fecha") for i in range(3))
                    day = date(year, month, day_num)
                    measures = [float(value) for value in fields[3:]]
                except (ValueError, OverflowError) as exc:
                    raise ValueError(f"{path.name}, línea {line_number}: {exc}") from exc
                values: list[float | None] = [
                    None if not math.isfinite(value) or value == -99.9 else value
                    for value in measures
                ]
                if day in station_daily:
                    raise ValueError(f"{path.name}: fecha duplicada {day.isoformat()}.")
                station_daily[day] = values[0]
                cleaned.append({
                    "station": station,
                    "date": day.isoformat(),
                    "precip_mm": values[0],
                    "tmax_c": values[1],
                    "tmin_c": values[2],
                })
        raw_by_station[station] = station_daily
        daily_by_station[station] = {
            day: value for day, value in station_daily.items() if value is not None and value >= 0
        }

    seasonal: list[dict[str, object]] = []
    for station, records in raw_by_station.items():
        by_season: dict[int, dict[date, float | None]] = defaultdict(dict)
        for day, rain in records.items():
            year = season_for(day)
            if year is not None:
                by_season[year][day] = rain
        for year, values in sorted(by_season.items()):
            expected = expected_season_days(year)
            valid = [value for value in values.values() if value is not None and value >= 0]
            coverage = len(valid) / expected
            seasonal.append({
                "station": station,
                "season_year": year,
                "days_expected": expected,
                "days_with_record": len(values),
                "valid_rain_days": len(valid),
                "coverage_pct": round(coverage * 100, 2),
                "observed_rain_mm": round(sum(valid), 6),
                "seasonal_rain_mm": round(sum(valid), 6) if coverage >= SENAMHI_COVERAGE_MIN else None,
            })
    return cleaned, daily_by_station, seasonal


def parse_event_catalog(reader: XlsxReader) -> list[Event]:
    events: list[Event] = []
    for sheet_name in reader.sheets:
        normalized_name = normalize(sheet_name)
        if normalized_name not in {"el nino costero", "la nina costera"}:
            continue
        phase = "Niño" if normalized_name.startswith("el nino") else "La Niña"
        rows = iter(reader.rows(sheet_name))
        header = next(rows, [])
        columns = {normalize(value): index for index, value in enumerate(header) if value}
        required = {"ano inicial", "mes inicial", "ano final", "mes final", "magnitud"}
        if not required.issubset(columns):
            raise ValueError(f"Encabezados inesperados en catálogo ICEN {sheet_name!r}: {header}")
        for row in rows:
            if len(row) <= max(columns.values()) or not row[columns["ano inicial"]]:
                continue
            try:
                events.append(Event(
                    phase=phase,
                    magnitude=row[columns["magnitud"]].strip().capitalize(),
                    start_year=parse_int(row[columns["ano inicial"]], "año inicial ICEN"),
                    start_month=parse_int(row[columns["mes inicial"]], "mes inicial ICEN"),
                    end_year=parse_int(row[columns["ano final"]], "año final ICEN"),
                    end_month=parse_int(row[columns["mes final"]], "mes final ICEN"),
                ))
            except (ValueError, IndexError) as exc:
                raise ValueError(f"Fila inválida en catálogo ICEN {sheet_name!r}: {row}") from exc
    return events


def classify_season(end_year: int, events: Sequence[Event]) -> tuple[str, str]:
    start, end = season_bounds(end_year)
    overlaps = [event for event in events if event.overlaps(start, end)]
    if not overlaps:
        return "Neutro", ""
    # Cuando los catálogos se solapan, conservar la fase de mayor intensidad.
    event = max(overlaps, key=lambda item: (item.severity, item.phase == "Niño"))
    return event.state, "; ".join(sorted({item.state for item in overlaps}))


def group_icen_regime(state: str) -> str:
    """Agrupa las etiquetas del catálogo en los tres regímenes del artículo."""
    key = normalize(state)
    if key == "neutro" or key.startswith("la nina"):
        return "Neutro o frío"
    if key.startswith("nino") and ("debil" in key or "moderado" in key):
        return "Cálido débil o moderado"
    if key.startswith("nino") and ("fuerte" in key or "extraordinario" in key):
        return "Cálido fuerte o extraordinario"
    raise ValueError(f"Estado ICEN no reconocido para agrupar: {state!r}")


def read_midagri_yields() -> list[dict[str, object]]:
    reader = XlsxReader(MIDAGRI_FILE)
    try:
        rows = list(reader.rows("rdto"))
    finally:
        reader.close()
    observations: list[dict[str, object]] = []
    header: list[str] | None = None
    for row in rows:
        first = normalize(row[0]) if row else ""
        if first in {"region", "región"}:
            header = row
            continue
        if not header or not first or first in {"continua cuadro 4", "continua cuadro 4"}:
            continue
        region = row[0].strip()
        if normalize(region) == "nacional" or normalize(region).startswith("continua"):
            continue
        for column, crop in enumerate(header[1:], start=1):
            if not crop:
                continue
            raw = row[column] if column < len(row) else ""
            if not raw:
                continue
            try:
                yield_kg_ha = float(raw)
            except ValueError:
                continue
            if not math.isfinite(yield_kg_ha) or yield_kg_ha < 0:
                continue
            observations.append({
                "year": 2023,
                "region": region,
                "crop": crop.strip(),
                "yield_kg_ha": yield_kg_ha,
                "yield_t_ha": yield_kg_ha / 1000,
            })
    if not observations:
        raise ValueError("No se extrajeron rendimientos de MIDAGRI (hoja rdto).")
    return observations


def pearson(xs: Sequence[float], ys: Sequence[float]) -> float | None:
    if len(xs) < 2 or len(xs) != len(ys):
        return None
    mean_x = statistics.fmean(xs)
    mean_y = statistics.fmean(ys)
    numerator = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
    denominator = math.sqrt(
        sum((x - mean_x) ** 2 for x in xs) * sum((y - mean_y) ** 2 for y in ys)
    )
    return numerator / denominator if denominator else None


def validation_metrics(pairs: Sequence[tuple[float, float]]) -> dict[str, float | int | None]:
    observed = [station for station, _ in pairs]
    estimated = [chirps for _, chirps in pairs]
    errors = [station - chirps for station, chirps in pairs]
    return {
        "n": len(pairs),
        "pearson_r": pearson(observed, estimated),
        "bias_station_minus_chirps_mm": statistics.fmean(errors) if errors else None,
        "rmse_mm": math.sqrt(statistics.fmean(error * error for error in errors)) if errors else None,
    }


def write_csv(path: Path, fieldnames: Sequence[str], rows: Iterable[dict[str, object]]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as target:
        writer = csv.DictWriter(target, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def fmt(value: float | int | None, digits: int = 2) -> str:
    if value is None:
        return "n/d"
    return f"{value:,.{digits}f}"


def calculate_state_models(seasons: Sequence[dict[str, object]]) -> list[dict[str, object]]:
    grouped: dict[str, list[float]] = defaultdict(list)
    for season in seasons:
        grouped[str(season["icen_state"])].append(float(season["rain_mm"]))
    count = len(seasons)
    models: list[dict[str, object]] = []
    for state, values in sorted(grouped.items(), key=lambda item: item[0].casefold()):
        positive = [value for value in values if value > 0]
        logs = [math.log(value) for value in positive]
        models.append({
            "icen_state": state,
            "n_seasons": len(values),
            "pi_c": len(values) / count if count else 0,
            "mean_rain_mm": statistics.fmean(values),
            "median_rain_mm": percentile(values, 50),
            "zero_rain_probability": (len(values) - len(positive)) / len(values),
            "positive_n": len(positive),
            "mu_c": statistics.fmean(logs) if logs else None,
            "sigma_c": statistics.pstdev(logs) if len(logs) >= 2 else (0.0 if logs else None),
        })
    return models


def calculate_regime_models(
    seasons: Sequence[dict[str, object]], strike_mm: float = 140.0,
) -> list[dict[str, object]]:
    grouped: dict[str, list[float]] = defaultdict(list)
    for season in seasons:
        grouped[str(season["icen_regime"])].append(float(season["rain_mm"]))
    total = len(seasons)
    models: list[dict[str, object]] = []
    for regime in (
        "Neutro o frío",
        "Cálido débil o moderado",
        "Cálido fuerte o extraordinario",
    ):
        values = grouped.get(regime, [])
        if not values:
            continue
        positive = [value for value in values if value > 0]
        log_values = [math.log(value) for value in positive]
        mu = statistics.fmean(log_values) if log_values else None
        sigma = statistics.pstdev(log_values) if len(log_values) > 1 else (0.0 if log_values else None)
        if mu is not None and sigma is not None:
            if sigma == 0:
                exceedance = float(math.exp(mu) > strike_mm)
            else:
                exceedance = 0.5 * math.erfc((math.log(strike_mm) - mu) / (sigma * math.sqrt(2)))
        else:
            exceedance = 0.0
        models.append({
            "icen_regime": regime,
            "n_seasons": len(values),
            "pi_c": len(values) / total if total else 0,
            "median_mc_mm": math.exp(mu) if mu is not None else None,
            "mu_c": mu,
            "sigma_c": sigma,
            "strike_mm": strike_mm,
            "prob_r_gt_strike": exceedance,
        })
    return models


def build_report(
    seasons: Sequence[dict[str, object]],
    models: Sequence[dict[str, object]],
    all_pairs: Sequence[tuple[float, float]],
    station_pairs: dict[str, list[tuple[float, float]]],
    station_seasonal: Sequence[dict[str, object]],
    rejected_seasons: int,
    station_null_rain: dict[str, int],
    midagri_rows: int,
    regime_models: Sequence[dict[str, object]],
) -> str:
    rains = [float(item["rain_mm"]) for item in seasons]
    lines = [
        "# Reporte de procesamiento y calibración AgroCode",
        "",
        "## Datos y controles",
        "",
        f"- Temporadas CHIRPS completas utilizadas: **{len(seasons)}**; incompletas excluidas: **{rejected_seasons}**.",
        "- Ventana: 1 de diciembre a 30 de abril; temporada identificada por el año de cierre.",
        "- SENAMHI: `-99.9` se convirtió en dato ausente antes de calcular métricas.",
        f"- MIDAGRI: rendimientos extraídos de `rdto` y convertidos de kg/ha a t/ha ({midagri_rows} registros).",
        "- ICEN: estado asignado por solapamiento de la temporada con los catálogos de eventos costeros; sin solapamiento se clasifica Neutro.",
        "",
        "## Precipitación estacional CHIRPS (mm)",
        "",
        "| n | Media | Desv. estándar | P50 | P75 | P85 | P90 | P95 | Máximo |",
        "|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
    ]
    if rains:
        lines.append(
            f"| {len(rains)} | {fmt(statistics.fmean(rains))} | {fmt(statistics.pstdev(rains))} | "
            + " | ".join(fmt(percentile(rains, p)) for p in (50, 75, 85, 90, 95))
            + f" | {fmt(max(rains))} |"
        )
    else:
        lines.append("| 0 | n/d | n/d | n/d | n/d | n/d | n/d | n/d | n/d |")
    lines.extend([
        "",
        "## Validación diaria frente a SENAMHI",
        "",
        "Sesgo = SENAMHI − CHIRPS. CHIRPS es una estimación areal y SENAMHI son observaciones puntuales; la comparación es indicativa. El renglón global agrupa pares de estaciones y repite el CHIRPS areal por fecha; consultar también cada estación.",
        "",
        "| Estación | Pares | Pearson r | Sesgo (mm/día) | RMSE (mm/día) |",
        "|---|---:|---:|---:|---:|",
    ])
    overall = validation_metrics(all_pairs)
    lines.append(
        f"| **Global** | {overall['n']} | {fmt(overall['pearson_r'], 4)} | "
        f"{fmt(overall['bias_station_minus_chirps_mm'], 4)} | {fmt(overall['rmse_mm'], 4)} |"
    )
    for station, pairs in sorted(station_pairs.items()):
        metrics = validation_metrics(pairs)
        lines.append(
            f"| {station} | {metrics['n']} | {fmt(metrics['pearson_r'], 4)} | "
            f"{fmt(metrics['bias_station_minus_chirps_mm'], 4)} | {fmt(metrics['rmse_mm'], 4)} |"
        )
    lines.extend([
        "",
        "La validación usa solo pares diarios con precipitación válida en ambas fuentes. Los días `-99.9` no se imputan. "
        "Estaciones con precipitación centinela filtrada: "
        + ", ".join(f"{station}={count}" for station, count in sorted(station_null_rain.items()))
        + ".",
        "",
        "## Frecuencia de estados y ajuste lognormal de R (mm)",
        "",
        "π_c es la fracción empírica de temporadas. μ_c y σ_c son MLE de ln(R) **condicional a R>0**; "
        "la masa de ceros se informa aparte. σ usa la desviación estándar poblacional. Las clases con menos de 10 temporadas "
        "tienen estimaciones exploratorias e inestables; conviene agruparlas o ampliar la serie antes de tarificar.",
        "",
        "| Estado ICEN | n | π_c | Media R | R mediana | P(R=0) | n (R>0) | μ_c | σ_c |",
        "|---|---:|---:|---:|---:|---:|---:|---:|---:|",
    ])
    for model in models:
        lines.append(
            f"| {model['icen_state']} | {model['n_seasons']} | {fmt(float(model['pi_c']) * 100)}% | "
            f"{fmt(model['mean_rain_mm'])} | {fmt(model['median_rain_mm'])} | "
            f"{fmt(float(model['zero_rain_probability']) * 100)}% | {model['positive_n']} | "
            f"{fmt(model['mu_c'], 5)} | {fmt(model['sigma_c'], 5)} |"
        )
    lines.extend([
        "",
        "### Regímenes agrupados del artículo",
        "",
        "| Régimen | n | π_c | m_c (mm) | μ_c | σ_c | Pr(R > 140 mm) |",
        "|---|---:|---:|---:|---:|---:|---:|",
    ])
    for model in regime_models:
        lines.append(
            f"| {model['icen_regime']} | {model['n_seasons']} | {fmt(float(model['pi_c']) * 100)}% | "
            f"{fmt(model['median_mc_mm'])} | {fmt(model['mu_c'], 5)} | {fmt(model['sigma_c'], 5)} | "
            f"{fmt(float(model['prob_r_gt_strike']) * 100)}% |"
        )
    lines.extend([
        "",
        "m_c = exp(μ_c). La probabilidad de excedencia se obtiene de la distribución lognormal ajustada, no de la frecuencia empírica directa.",
    ])
    if rains:
        k_star = percentile(rains, 85)
        s_star = percentile(rains, 95)
        lines.extend([
            "",
            "## Propuesta inicial de umbrales para el motor",
            "",
            f"- K* (strike, percentil 85): {fmt(k_star)} mm.",
            f"- S* (exit, percentil 95): {fmt(s_star)} mm.",
            "- La propuesta usa la distribución empírica de todas las temporadas completas; se debe validar con la "
            "metodología y apetito de riesgo del artículo antes de sustituir umbrales de producto. No modifica `lib/engine/`.",
        ])
    lines.extend([
        "",
        "## Cobertura estacional SENAMHI",
        "",
        f"Temporadas-estación con cobertura de precipitación ≥{SENAMHI_COVERAGE_MIN:.0%}: "
        f"{sum(item['seasonal_rain_mm'] is not None for item in station_seasonal)} de {len(station_seasonal)}.",
        "El CSV conserva cobertura y suma observada; `seasonal_rain_mm` queda vacío cuando la cobertura no alcanza el mínimo.",
        "",
        "## Archivos generados",
        "",
        "- `seasonal_calibration.csv`: R CHIRPS, estado/eventos ICEN y cobertura diaria completa.",
        "- `senamhi_daily_clean.csv` y `senamhi_seasonal.csv`: registros limpios y sumas con cobertura.",
        "- `midagri_yield_t_ha.csv`: rendimientos por región/cultivo.",
        "- `icen_state_models.csv`: π_c y parámetros lognormales.",
        "- `icen_regime_models.csv`: ajuste de los tres regímenes usados por el artículo.",
        "- `calibration_report.md`: este resumen estadístico.",
        "",
    ])
    return "\n".join(lines)


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    required_files = (CHIRPS_FILE, ICEN_FILE, MIDAGRI_FILE)
    missing = [str(path.relative_to(ROOT)) for path in required_files if not path.is_file()]
    if not SENAMHI_DIR.is_dir() or not list(SENAMHI_DIR.glob("*.txt")):
        missing.append(str(SENAMHI_DIR.relative_to(ROOT)) + "/*.txt")
    if missing:
        raise FileNotFoundError("Faltan fuentes requeridas: " + ", ".join(missing))

    OUT.mkdir(parents=True, exist_ok=True)
    chirps_daily, seasons = read_chirps()
    raw_seasons_count = len({season_for(day) for day in chirps_daily if season_for(day) is not None})

    icen_reader = XlsxReader(ICEN_FILE)
    try:
        events = parse_event_catalog(icen_reader)
    finally:
        icen_reader.close()
    for season in seasons:
        state, event_labels = classify_season(int(season["season_year"]), events)
        season["icen_state"] = state
        season["icen_events"] = event_labels
        season["icen_regime"] = group_icen_regime(state)

    senamhi_clean, senamhi_daily, station_seasonal = read_senamhi()
    station_null_rain: dict[str, int] = {}
    station_pairs: dict[str, list[tuple[float, float]]] = {}
    for record in senamhi_clean:
        station = str(record["station"])
        if record["precip_mm"] is None:
            station_null_rain[station] = station_null_rain.get(station, 0) + 1
    for station, records in senamhi_daily.items():
        station_pairs[station] = [
            (rain, chirps_daily[day])
            for day, rain in records.items()
            if day in chirps_daily
        ]
    all_pairs = [pair for pairs in station_pairs.values() for pair in pairs]

    midagri = read_midagri_yields()
    models = calculate_state_models(seasons)
    regime_models = calculate_regime_models(seasons)
    write_csv(
        OUT / "seasonal_calibration.csv",
        ["season_year", "season_start", "season_end", "rain_mm", "days_expected", "days_observed", "icen_state", "icen_regime", "icen_events"],
        seasons,
    )
    write_csv(
        OUT / "senamhi_daily_clean.csv",
        ["station", "date", "precip_mm", "tmax_c", "tmin_c"],
        senamhi_clean,
    )
    write_csv(
        OUT / "senamhi_seasonal.csv",
        ["station", "season_year", "days_expected", "days_with_record", "valid_rain_days", "coverage_pct", "observed_rain_mm", "seasonal_rain_mm"],
        station_seasonal,
    )
    write_csv(
        OUT / "midagri_yield_t_ha.csv",
        ["year", "region", "crop", "yield_kg_ha", "yield_t_ha"],
        midagri,
    )
    write_csv(
        OUT / "icen_state_models.csv",
        ["icen_state", "n_seasons", "pi_c", "mean_rain_mm", "median_rain_mm", "zero_rain_probability", "positive_n", "mu_c", "sigma_c"],
        models,
    )
    write_csv(
        OUT / "icen_regime_models.csv",
        ["icen_regime", "n_seasons", "pi_c", "median_mc_mm", "mu_c", "sigma_c", "strike_mm", "prob_r_gt_strike"],
        regime_models,
    )
    report = build_report(
        seasons, models, all_pairs, station_pairs, station_seasonal,
        raw_seasons_count - len(seasons), station_null_rain, len(midagri), regime_models,
    )
    (OUT / "calibration_report.md").write_text(report, encoding="utf-8")

    print(report)
    print("\nDetalle de rendimiento MIDAGRI para Piura (t/ha):")
    piura = [row for row in midagri if normalize(str(row["region"])) == "piura"]
    for row in piura:
        print(f"  {row['crop']}: {float(row['yield_t_ha']):.4f}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, zipfile.BadZipFile, ET.ParseError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
