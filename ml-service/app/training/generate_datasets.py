"""Generador de datasets sintéticos para los modelos de ML de OptiLácteo.

Permite entrenar y validar los modelos de las HU-49, HU-50 y HU-51 antes de
contar con volumen suficiente de datos reales cargados por las plantas
colaboradoras.

Los parámetros fisicoquímicos y las reglas de asignación de destino se basan
en rangos habituales de leche cruda bovina. El etiquetado incorpora ruido
deliberado (DEFAULT_NOISE) para que el modelo no aprenda una regla
determinista: sin ruido, el clasificador alcanza 100% de accuracy y el
porcentaje de confianza que exige el criterio 3 de la HU-49 pierde sentido.

Uso:
    python generate_datasets.py destino --empresa-id 1 --n 500
    python generate_datasets.py volumen --empresa-id 1 --dias 365
    python generate_datasets.py anomalias --empresa-id 1 --dias 180
    python generate_datasets.py todos --empresa-id 1

Salida en ./datasets/ como CSV (inspección) y JSON (mismo formato que
devolverá el endpoint interno de NestJS, para poder cargarlo sin cambios).
"""

import argparse
import json
import os
import random
from datetime import datetime, timedelta

import numpy as np
import pandas as pd

OUTPUT_DIR = "datasets"
DEFAULT_NOISE = 0.08  # 8% de lotes con destino distinto al que sugiere la regla

DESTINOS = ["quesos", "yogur", "crema", "dulce_de_leche", "leche_fluida", "descarte"]

# Rangos de referencia de leche cruda bovina
RANGOS = {
    "grasa": (3.0, 4.6),        # %
    "proteina": (2.8, 3.9),     # %
    "acidez": (13.0, 19.5),     # °Dornic
    "temperatura": (1.5, 9.0),  # °C en recepción
    "ph": (6.30, 6.85),
}

# Perfiles por destino: (media, desvío) de cada parámetro.
# Definen de qué zona del espacio de features se muestrea cada clase.
PERFILES = {
    "quesos": {
        "grasa": (3.6, 0.25), "proteina": (3.55, 0.15), "acidez": (16.0, 0.7),
        "temperatura": (4.0, 0.9), "ph": (6.62, 0.06),
    },
    "yogur": {
        "grasa": (3.3, 0.22), "proteina": (3.35, 0.14), "acidez": (14.8, 0.6),
        "temperatura": (4.2, 1.0), "ph": (6.70, 0.05),
    },
    "crema": {
        "grasa": (4.25, 0.20), "proteina": (3.10, 0.16), "acidez": (15.5, 0.7),
        "temperatura": (4.0, 0.9), "ph": (6.66, 0.06),
    },
    "dulce_de_leche": {
        "grasa": (3.45, 0.24), "proteina": (3.15, 0.15), "acidez": (15.2, 0.7),
        "temperatura": (4.5, 1.0), "ph": (6.68, 0.05),
    },
    "leche_fluida": {
        "grasa": (3.25, 0.22), "proteina": (3.05, 0.14), "acidez": (15.0, 0.7),
        "temperatura": (3.8, 0.9), "ph": (6.72, 0.05),
    },
    "descarte": {
        "grasa": (3.30, 0.45), "proteina": (3.00, 0.30), "acidez": (18.6, 0.9),
        "temperatura": (7.5, 1.4), "ph": (6.36, 0.09),
    },
}

# Distribución de destinos. Refleja una planta real: la mayoría va a quesos,
# el descarte es minoritario. Deliberadamente desbalanceada — el modelo tiene
# que enfrentar el mismo desbalance que va a encontrar en producción.
PROPORCIONES = {
    "quesos": 0.34, "yogur": 0.16, "crema": 0.14,
    "dulce_de_leche": 0.14, "leche_fluida": 0.17, "descarte": 0.05,
}

PROVEEDORES = [
    "Tambo La Esperanza", "Cooperativa Río Cuarto", "Establecimiento Los Aromos",
    "Tambo San Martín", "Tambo El Trébol", "Estancia Don Benito",
]


def _clip(valor: float, param: str) -> float:
    minimo, maximo = RANGOS[param]
    return round(float(np.clip(valor, minimo, maximo)), 2)


def _muestrear_features(destino: str, rng: np.random.Generator) -> dict:
    perfil = PERFILES[destino]
    return {
        param: _clip(rng.normal(media, desvio), param)
        for param, (media, desvio) in perfil.items()
    }


def generar_dataset_destino(empresa_id: int, n: int, noise: float, seed: int) -> pd.DataFrame:
    """HU-49: dataset de clasificación de destino productivo."""
    rng = np.random.default_rng(seed)
    random.seed(seed)

    destinos = list(PROPORCIONES.keys())
    pesos = list(PROPORCIONES.values())
    elegidos = rng.choice(destinos, size=n, p=pesos)

    fecha_base = datetime(2026, 1, 1)
    filas = []

    for i, destino_regla in enumerate(elegidos):
        features = _muestrear_features(destino_regla, rng)

        # Ruido: en una fracción de los lotes el destino real difiere del que
        # sugieren los parámetros (decisión operativa, demanda, capacidad de
        # planta). Es lo que hace que exista la divergencia de la HU-37.
        if rng.random() < noise:
            alternativas = [d for d in destinos if d != destino_regla and d != "descarte"]
            destino_real = str(rng.choice(alternativas))
        else:
            destino_real = str(destino_regla)

        filas.append({
            "lote_id": f"L-2026-{2000 + i}",
            "empresa_id": empresa_id,
            "fecha_ingreso": (fecha_base + timedelta(days=int(i * 240 / n))).strftime("%Y-%m-%d"),
            "proveedor": random.choice(PROVEEDORES),
            **features,
            "destino_real": destino_real,
        })

    return pd.DataFrame(filas)


def generar_serie_volumen(empresa_id: int, dias: int, seed: int) -> pd.DataFrame:
    """HU-51: serie diaria de volumen recepcionado, en litros.

    Combina tendencia leve, estacionalidad semanal (domingo bajo) y
    estacionalidad anual (pico primavera-verano en el hemisferio sur).
    """
    rng = np.random.default_rng(seed)
    fecha_inicio = datetime(2026, 1, 1)

    base = 34000
    filas = []

    for d in range(dias):
        fecha = fecha_inicio + timedelta(days=d)

        tendencia = base + d * 4.5
        # Domingo cae fuerte, sábado un poco
        factor_semanal = {6: 0.62, 5: 0.88}.get(fecha.weekday(), 1.0)
        # Pico estacional alrededor de noviembre
        factor_anual = 1 + 0.11 * np.sin(2 * np.pi * (d - 60) / 365)
        ruido = rng.normal(0, 1500)

        litros = max(0, tendencia * factor_semanal * factor_anual + ruido)

        filas.append({
            "empresa_id": empresa_id,
            "fecha": fecha.strftime("%Y-%m-%d"),
            "dia_semana": fecha.strftime("%A"),
            "litros": round(litros, 1),
        })

    return pd.DataFrame(filas)


def generar_serie_anomalias(empresa_id: int, dias: int, seed: int) -> pd.DataFrame:
    """HU-50: series de mediciones con anomalías etiquetadas.

    Inyecta los cuatro tipos de desvío que la HU pide clasificar, más tramos
    sin datos: la prueba de usuario exige que los gaps no se reporten como
    anomalía, así que el dataset tiene que contenerlos.
    """
    rng = np.random.default_rng(seed)
    fecha_inicio = datetime(2026, 1, 1)
    parametros = {
        "temperatura": (4.0, 0.55), "ph": (6.65, 0.05),
        "acidez": (15.5, 0.6), "grasa": (3.5, 0.22),
    }

    filas = []
    for param, (media, desvio) in parametros.items():
        valores = rng.normal(media, desvio, dias)
        tipos = [None] * dias

        # Cambio abrupto: salto puntual de varios desvíos
        for idx in rng.choice(range(20, dias - 20), size=max(2, dias // 60), replace=False):
            valores[idx] += desvio * rng.uniform(4.5, 7.0) * rng.choice([-1, 1])
            tipos[idx] = "cambio_abrupto"

        # Deriva sostenida: corrimiento gradual sobre una ventana
        inicio = int(rng.integers(30, max(31, dias - 40)))
        largo = 14
        for j in range(largo):
            if inicio + j < dias:
                valores[inicio + j] += desvio * 3.0 * (j / largo)
                tipos[inicio + j] = "deriva_sostenida"

        # Valor atípico aislado
        for idx in rng.choice(range(dias), size=max(1, dias // 90), replace=False):
            if tipos[idx] is None:
                valores[idx] = media + desvio * rng.uniform(8, 11) * rng.choice([-1, 1])
                tipos[idx] = "valor_atipico"

        # Ruptura de patrón: varianza que se dispara sin cambiar la media
        inicio_rp = int(rng.integers(10, max(11, dias - 25)))
        for j in range(10):
            if inicio_rp + j < dias and tipos[inicio_rp + j] is None:
                valores[inicio_rp + j] = media + rng.normal(0, desvio * 4)
                tipos[inicio_rp + j] = "ruptura_patron"

        # Gaps de sensor: días sin medición, NO son anomalías
        gaps = set(rng.choice(range(dias), size=max(3, dias // 40), replace=False))

        for d in range(dias):
            if d in gaps and tipos[d] is None:
                valor, tipo = None, None
            else:
                valor, tipo = round(float(valores[d]), 3), tipos[d]

            filas.append({
                "empresa_id": empresa_id,
                "fecha": (fecha_inicio + timedelta(days=d)).strftime("%Y-%m-%d"),
                "parametro": param,
                "valor": valor,
                "es_anomalia": tipo is not None,
                "tipo_desvio": tipo,
            })

    return pd.DataFrame(filas)


def _guardar(df: pd.DataFrame, nombre: str, columnas_json: list[str] | None = None):
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    csv_path = os.path.join(OUTPUT_DIR, f"{nombre}.csv")
    df.to_csv(csv_path, index=False)

    json_df = df[columnas_json] if columnas_json else df
    json_df = json_df.astype(object).where(pd.notna(json_df), None)
    json_path = os.path.join(OUTPUT_DIR, f"{nombre}.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(json_df.to_dict(orient="records"), f, indent=2, ensure_ascii=False)

    print(f"  {csv_path}  ({len(df)} filas)")
    print(f"  {json_path}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dataset", choices=["destino", "volumen", "anomalias", "todos"])
    parser.add_argument("--empresa-id", type=int, default=1)
    parser.add_argument("--n", type=int, default=500, help="lotes (destino)")
    parser.add_argument("--dias", type=int, default=365, help="días (volumen/anomalias)")
    parser.add_argument("--noise", type=float, default=DEFAULT_NOISE)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    e = args.empresa_id

    if args.dataset in ("destino", "todos"):
        print(f"\nHU-49 — destino productivo (empresa {e}):")
        df = generar_dataset_destino(e, args.n, args.noise, args.seed)
        # El JSON replica exactamente lo que devuelve el endpoint interno
        _guardar(df, f"destino_empresa_{e}",
                 ["grasa", "proteina", "acidez", "temperatura", "ph", "destino_real"])
        print("  distribución:", df["destino_real"].value_counts().to_dict())

    if args.dataset in ("volumen", "todos"):
        print(f"\nHU-51 — volumen diario (empresa {e}):")
        df = generar_serie_volumen(e, args.dias, args.seed)
        _guardar(df, f"volumen_empresa_{e}", ["fecha", "litros"])
        print(f"  promedio: {df['litros'].mean():,.0f} L/día")

    if args.dataset in ("anomalias", "todos"):
        print(f"\nHU-50 — series con anomalías (empresa {e}):")
        df = generar_serie_anomalias(e, args.dias, args.seed)
        _guardar(df, f"anomalias_empresa_{e}")
        print("  anomalías:", df[df["es_anomalia"]]["tipo_desvio"].value_counts().to_dict())
        print(f"  gaps de sensor: {int(df['valor'].isna().sum())}")

    print()


if __name__ == "__main__":
    main()
