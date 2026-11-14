/** Ajuste lognormal exploratorio a 45 temporadas completas CHIRPS Piura. */
export const PIURA_RAINFALL_CALIBRATION = {
  sourceSeasons: 45,
  meanRainMm: 89.47,
  strikeMm: 140,
  exitMm: 200,
  historicSeasons: {
    nino1997_1998: 487.609364,
    nino2016_2017: 281.435181,
    nino2022_2023: 205.733543,
  },
  regimes: [
    {
      name: 'Neutro o frío',
      probability: 0.6222222222222222,
      mu: 3.9725039272568887,
      sigma: 0.5211956196312104,
    },
    {
      name: 'Cálido débil o moderado',
      probability: 0.2222222222222222,
      mu: 4.530335761876801,
      sigma: 0.6930594621727467,
    },
    {
      name: 'Cálido fuerte o extraordinario',
      probability: 0.15555555555555556,
      mu: 4.81848891524521,
      sigma: 0.8050390678690799,
    },
  ],
} as const;

export function sampleCalibratedRainfall(sampleSize: number): number[] {
  const regimes = PIURA_RAINFALL_CALIBRATION.regimes;
  const allocations = [
    Math.round(regimes[0].probability * sampleSize),
    Math.round(regimes[1].probability * sampleSize),
  ];
  allocations.push(Math.max(0, sampleSize - allocations[0] - allocations[1]));

  return regimes.flatMap((regime, regimeIndex) => {
    const count = allocations[regimeIndex];
    return Array.from({ length: count }, (_, index) => {
      const probability = (index + 0.5) / count;
      return Math.exp(regime.mu + regime.sigma * inverseNormalCdf(probability));
    });
  });
}

// Aproximación racional de Acklam a la inversa de la CDF normal estándar.
function inverseNormalCdf(probability: number): number {
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
  const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
  const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
  const low = 0.02425;
  const high = 1 - low;

  if (probability < low) {
    const q = Math.sqrt(-2 * Math.log(probability));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (probability > high) {
    const q = Math.sqrt(-2 * Math.log(1 - probability));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }

  const q = probability - 0.5;
  const r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}
