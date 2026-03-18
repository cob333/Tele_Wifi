export type Scheme =
  | "Proposed"
  | "No Reputation"
  | "Fixed Reward"
  | "Random Strategy";

export type Engine = "Replicator" | "Moran";

export type DemoTab = "demo" | "comparison" | "scan" | "export";

export interface SimulationConfig {
  scheme: Scheme;
  engine: Engine;
  N: number;
  M: number;
  x0: number;
  theta: number;
  alpha: number;
  kappa: number;
  lambda: number;
  gamma: number;
  p_d: number;
  p_f: number;
  T: number;
  R: number;
  seed: number;
}

export interface TimePoint {
  t: number;
  x: number;
  th: number;
  j: number;
  meanR: number;
  sharerCount: number;
  defectorCount: number;
  rewardedUserCount: number;
  punishedUserCount: number;
}

export interface TopologyNode {
  id: number;
  x: number;
  y: number;
  strategy: "sharer" | "defector";
  reputation: number;
  utility: number;
  rewarded: boolean;
  punished: boolean;
}

export interface TopologyFrame {
  step: number;
  nodes: TopologyNode[];
}

export interface MetricWithCI {
  mean: number;
  ci95: number;
}

export interface SummaryStats {
  scheme: Scheme;
  engine: Engine;
  xStar: MetricWithCI;
  meanTh: MetricWithCI;
  meanJ: MetricWithCI;
  stabilityTime: MetricWithCI;
  utilityP10: MetricWithCI;
  utilityP50: MetricWithCI;
  utilityP90: MetricWithCI;
  rhoS?: MetricWithCI;
  meanAbsorptionTime?: MetricWithCI;
}

export interface SingleRunResult {
  timeline: TimePoint[];
  frames: TopologyFrame[];
  summary: SummaryStats;
}

export interface HeatmapCell {
  x: number;
  y: number;
  value: number;
}

export interface HeatmapResult {
  metric: string;
  xLabel: string;
  yLabel: string;
  xValues: number[];
  yValues: number[];
  cells: HeatmapCell[];
}

export interface MoranComparison {
  replicator: SummaryStats;
  moran: SummaryStats;
}

export interface DemoResult {
  generatedAt: string;
  singleRun: SingleRunResult;
  comparisons: SummaryStats[];
  alphaKappa: HeatmapResult[];
  pfPd: HeatmapResult;
  moranComparison: MoranComparison;
}

export interface WorkerProgressMessage {
  type: "progress";
  stage: string;
}

export interface WorkerResultMessage {
  type: "result";
  payload: DemoResult;
}

export interface WorkerErrorMessage {
  type: "error";
  message: string;
}

export type WorkerMessage =
  | WorkerProgressMessage
  | WorkerResultMessage
  | WorkerErrorMessage;

export interface WorkerRequest {
  type: "run-all";
  payload: SimulationConfig;
}
