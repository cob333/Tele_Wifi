import type { SimulationConfig } from "../types/simulation";

export const defaultConfig: SimulationConfig = {
  scheme: "Proposed",
  engine: "Replicator",
  N: 36,
  M: 6,
  x0: 0.38,
  theta: 0.7,
  alpha: 0.52,
  kappa: 0.36,
  lambda: 0.18,
  gamma: 0.12,
  p_d: 0.9,
  p_f: 0.05,
  T: 360,
  R: 16,
  seed: 20260318,
};

export const presetConfigs: Array<{ label: string; config: SimulationConfig }> = [
  {
    label: "演示默认",
    config: defaultConfig,
  },
  {
    label: "高信誉协作",
    config: {
      ...defaultConfig,
      theta: 0.64,
      alpha: 0.68,
      kappa: 0.42,
      p_d: 0.95,
      p_f: 0.03,
    },
  },
  {
    label: "高误检压力",
    config: {
      ...defaultConfig,
      theta: 0.82,
      alpha: 0.44,
      kappa: 0.58,
      p_d: 0.7,
      p_f: 0.17,
    },
  },
];
