import { createRng } from "./random";
import type {
  DemoResult,
  Engine,
  HeatmapResult,
  MetricWithCI,
  Scheme,
  SimulationConfig,
  SingleRunResult,
  SummaryStats,
  TimePoint,
  TopologyFrame,
  TopologyNode,
} from "../types/simulation";

const ALPHA_KAPPA_VALUES = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9];
const PF_PD_VALUES = [0.01, 0.04, 0.08, 0.12, 0.16, 0.2];
const PD_VALUES = [0.6, 0.68, 0.76, 0.84, 0.92, 0.99];

const NORMALIZED_DELTA_T = 0.18;
const NORMALIZED_TOTAL_CAPACITY = 1;
const NORMALIZED_REWARD_BUDGET = 1;
const CONTRIBUTION_EPSILON = 1e-6;
const STABILITY_EPSILON = 0.02;
const DEFAULT_INITIAL_REPUTATION = 0.5;
const NORMALIZED_COST_BASE = 0.16;
const NORMALIZED_COST_WEIGHT = 0.18;
const NORMALIZED_BENEFIT_SCALE = 0.92;

/**
 * The user-provided equations now define:
 * - utilities: u_S(x, r_i) = B(x) - C_S + R(r_i), u_D(x, r_i) = B(x) - P(r_i)
 * - contribution ratio: phi_i = shared_i / (used_i + eps), s_i = clip(phi_i, 0, 1)
 * - reputation update: r_i(t+1) = clip((1-lambda) r_i(t) + lambda s_i(t) - gamma 1[z_i=1], 0, 1)
 * - threshold incentives: R(r_i) = alpha 1[r_i >= theta], P(r_i) = kappa 1[r_i < theta]
 *
 * The exact shapes of B(x), C_S, B_max, and capacities are still marked as unspecified
 * in the design text, so this engine keeps them explicitly normalized:
 * - B(x): concave sqrt benefit
 * - C_S: normalized sharing cost
 * - B_max: 1
 * - C_tot: 1, C_m = C_tot / M
 */

interface NodeState {
  id: number;
  apId: number;
  strategy: "sharer" | "defector";
  reputation: number;
  baseDemand: number;
}

interface EvaluatedNode extends NodeState {
  request: number;
  used: number;
  shared: number;
  contributionScore: number;
  anomalyDetected: boolean;
  reward: number;
  penalty: number;
  rewarded: boolean;
  punished: boolean;
  utility: number;
  goodput: number;
}

interface StepEvaluation {
  evaluatedNodes: EvaluatedNode[];
  timePoint: TimePoint;
  utilities: number[];
  meanSharerUtility: number;
  meanDefectorUtility: number;
}

interface SeedSummary {
  xStar: number;
  meanTh: number;
  meanJ: number;
  stabilityTime: number;
  utilityP10: number;
  utilityP50: number;
  utilityP90: number;
  rhoS?: number;
  meanAbsorptionTime?: number;
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]) {
  if (values.length <= 1) {
    return 0;
  }

  const mean = average(values);
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    (values.length - 1);
  return Math.sqrt(variance);
}

function withCI(values: number[]): MetricWithCI {
  const mean = average(values);
  if (values.length <= 1) {
    return { mean, ci95: 0 };
  }

  const sd = standardDeviation(values);
  const ci95 = (1.96 * sd) / Math.sqrt(values.length);
  return { mean, ci95 };
}

function quantile(sortedValues: number[], q: number) {
  if (!sortedValues.length) {
    return 0;
  }

  const index = (sortedValues.length - 1) * q;
  const base = Math.floor(index);
  const remainder = index - base;
  const lower = sortedValues[base] ?? sortedValues[sortedValues.length - 1];
  const upper =
    sortedValues[base + 1] ?? sortedValues[sortedValues.length - 1];
  return lower + remainder * (upper - lower);
}

function jainIndex(values: number[]) {
  if (!values.length) {
    return 0;
  }

  const sum = values.reduce((acc, value) => acc + value, 0);
  const sumSquares = values.reduce((acc, value) => acc + value * value, 0);

  if (sumSquares <= 0) {
    return 0;
  }

  return clamp((sum * sum) / (values.length * sumSquares), 0, 1);
}

function getTopologyPositions(count: number) {
  const side = Math.ceil(Math.sqrt(count));
  return Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / side);
    const col = index % side;
    return {
      id: index + 1,
      x: 12 + col * (72 / Math.max(1, side - 1)),
      y: 12 + row * (72 / Math.max(1, side - 1)),
    };
  });
}

function pickUniqueIndices(indices: number[], count: number, rng: () => number) {
  const pool = [...indices];
  const picks: number[] = [];
  const target = Math.min(count, pool.length);

  for (let cursor = 0; cursor < target; cursor += 1) {
    const offset = cursor + Math.floor(rng() * (pool.length - cursor));
    [pool[cursor], pool[offset]] = [pool[offset], pool[cursor]];
    picks.push(pool[cursor]);
  }

  return picks;
}

function benefitFromSharingExternality(x: number) {
  return NORMALIZED_BENEFIT_SCALE * Math.sqrt(clamp(x));
}

function sharingCost(shared: number, used: number) {
  const ratio = clamp(shared / (used + CONTRIBUTION_EPSILON), 0, 1);
  return NORMALIZED_COST_BASE + NORMALIZED_COST_WEIGHT * ratio;
}

function initializeNodes(config: SimulationConfig, seed: number) {
  const rng = createRng(seed);
  const averageDemand = (NORMALIZED_TOTAL_CAPACITY / config.N) * 1.35;

  return Array.from({ length: config.N }, (_, index) => ({
    id: index + 1,
    apId: index % Math.max(1, config.M),
    strategy: rng() < config.x0 ? "sharer" : "defector",
    reputation: clamp(
      DEFAULT_INITIAL_REPUTATION + (rng() - 0.5) * 0.12,
      0.01,
      0.99,
    ),
    baseDemand: averageDemand * (0.78 + 0.44 * rng()),
  })) satisfies NodeState[];
}

function getIncentiveScheme(scheme: Scheme): Exclude<Scheme, "Random Strategy"> {
  if (scheme === "Random Strategy") {
    return "Proposed";
  }

  return scheme;
}

function buildRequests(nodes: NodeState[], rng: () => number) {
  return nodes.map((node) => node.baseDemand * (0.92 + 0.16 * rng()));
}

function buildApRequestTotals(nodes: NodeState[], requests: number[], M: number) {
  const totals = Array.from({ length: Math.max(1, M) }, () => 0);

  nodes.forEach((node, index) => {
    totals[node.apId] += requests[index];
  });

  return totals;
}

function applyRewardBudget(rewards: number[]) {
  const totalReward = rewards.reduce((sum, value) => sum + value, 0);
  if (totalReward <= NORMALIZED_REWARD_BUDGET || totalReward <= 0) {
    return rewards;
  }

  const scale = NORMALIZED_REWARD_BUDGET / totalReward;
  return rewards.map((reward) => reward * scale);
}

function evaluateStep(
  config: SimulationConfig,
  scheme: Scheme,
  nodes: NodeState[],
  rng: () => number,
  t: number,
): StepEvaluation {
  const x =
    nodes.filter((node) => node.strategy === "sharer").length / config.N;
  const benefit = benefitFromSharingExternality(x);
  const apCapacity = NORMALIZED_TOTAL_CAPACITY / Math.max(1, config.M);
  const requests = buildRequests(nodes, rng);
  const apRequests = buildApRequestTotals(nodes, requests, config.M);
  const incentiveScheme = getIncentiveScheme(scheme);

  const preIncentiveNodes = nodes.map((node, index) => {
    const request = requests[index];
    const serviceScale = Math.min(1, apCapacity / Math.max(apRequests[node.apId], CONTRIBUTION_EPSILON));
    const goodput = request * serviceScale;
    const used = goodput;
    const shared =
      node.strategy === "sharer"
        ? goodput * clamp(0.65 + 0.35 * node.reputation, 0, 1)
        : 0;
    const contributionScore = clamp(
      shared / (used + CONTRIBUTION_EPSILON),
      0,
      1,
    );
    const anomalous = contributionScore < config.theta;
    const anomalyDetected = anomalous ? rng() < config.p_d : rng() < config.p_f;
    const updatedReputation = clamp(
      (1 - config.lambda) * node.reputation +
        config.lambda * contributionScore -
        config.gamma * (anomalyDetected ? 1 : 0),
      0,
      1,
    );

    return {
      ...node,
      request,
      used,
      shared,
      contributionScore,
      anomalyDetected,
      updatedReputation,
    };
  });

  const rawRewards = preIncentiveNodes.map((node) => {
    if (incentiveScheme === "Fixed Reward" && node.strategy === "sharer") {
      return config.alpha;
    }

    if (
      incentiveScheme === "Proposed" &&
      node.strategy === "sharer" &&
      node.updatedReputation >= config.theta
    ) {
      return config.alpha;
    }

    return 0;
  });

  const scaledRewards = applyRewardBudget(rawRewards);

  const evaluatedNodes: EvaluatedNode[] = preIncentiveNodes.map((node, index) => {
    const reward = scaledRewards[index];
    let penalty = 0;

    if (
      incentiveScheme === "Proposed" &&
      node.strategy === "defector" &&
      node.updatedReputation < config.theta
    ) {
      penalty = config.kappa;
    }

    const utility =
      node.strategy === "sharer"
        ? benefit - sharingCost(node.shared, node.used) + reward
        : benefit - penalty;

    return {
      id: node.id,
      apId: node.apId,
      strategy: node.strategy,
      reputation: node.updatedReputation,
      baseDemand: node.baseDemand,
      request: node.request,
      used: node.used,
      shared: node.shared,
      contributionScore: node.contributionScore,
      anomalyDetected: node.anomalyDetected,
      reward,
      penalty,
      rewarded: reward > 0,
      punished: penalty > 0,
      utility,
      goodput: node.used,
    };
  });

  const sharers = evaluatedNodes.filter((node) => node.strategy === "sharer");
  const defectors = evaluatedNodes.filter((node) => node.strategy === "defector");
  const goodputs = evaluatedNodes.map((node) => node.goodput);
  const utilities = evaluatedNodes
    .map((node) => node.utility)
    .sort((a, b) => a - b);

  return {
    evaluatedNodes,
    timePoint: {
      t,
      x: sharers.length / config.N,
      th: goodputs.reduce((sum, value) => sum + value, 0),
      j: jainIndex(goodputs),
      meanR: average(evaluatedNodes.map((node) => node.reputation)),
      sharerCount: sharers.length,
      defectorCount: defectors.length,
      rewardedUserCount: evaluatedNodes.filter((node) => node.rewarded).length,
      punishedUserCount: evaluatedNodes.filter((node) => node.punished).length,
    },
    utilities,
    meanSharerUtility: average(sharers.map((node) => node.utility)),
    meanDefectorUtility: average(defectors.map((node) => node.utility)),
  };
}

function discreteReplicatorStep(
  x: number,
  meanSharerUtility: number,
  meanDefectorUtility: number,
) {
  const delta =
    NORMALIZED_DELTA_T *
    x *
    (1 - x) *
    (meanSharerUtility - meanDefectorUtility);
  return clamp(x + delta, 0.01, 0.99);
}

function advanceReplicatorNodes(
  evaluatedNodes: EvaluatedNode[],
  meanSharerUtility: number,
  meanDefectorUtility: number,
  rng: () => number,
) {
  const currentSharers = evaluatedNodes
    .map((node, index) => (node.strategy === "sharer" ? index : -1))
    .filter((index) => index >= 0);
  const currentDefectors = evaluatedNodes
    .map((node, index) => (node.strategy === "defector" ? index : -1))
    .filter((index) => index >= 0);

  const currentX = currentSharers.length / evaluatedNodes.length;
  const targetX = discreteReplicatorStep(
    currentX,
    meanSharerUtility,
    meanDefectorUtility,
  );
  const targetSharerCount = Math.round(targetX * evaluatedNodes.length);

  const nextNodes = evaluatedNodes.map((node) => ({
    id: node.id,
    apId: node.apId,
    strategy: node.strategy,
    reputation: node.reputation,
    baseDemand: node.baseDemand,
  })) satisfies NodeState[];

  if (targetSharerCount > currentSharers.length) {
    const delta = targetSharerCount - currentSharers.length;
    const switches = pickUniqueIndices(currentDefectors, delta, rng);
    switches.forEach((index) => {
      nextNodes[index].strategy = "sharer";
    });
  } else if (targetSharerCount < currentSharers.length) {
    const delta = currentSharers.length - targetSharerCount;
    const switches = pickUniqueIndices(currentSharers, delta, rng);
    switches.forEach((index) => {
      nextNodes[index].strategy = "defector";
    });
  }

  return nextNodes;
}

function advanceRandomStrategyNodes(
  config: SimulationConfig,
  evaluatedNodes: EvaluatedNode[],
  rng: () => number,
) {
  return evaluatedNodes.map((node) => ({
    id: node.id,
    apId: node.apId,
    strategy: rng() < config.x0 ? "sharer" : "defector",
    reputation: node.reputation,
    baseDemand: node.baseDemand,
  })) satisfies NodeState[];
}

function advanceMoranNodes(
  evaluatedNodes: EvaluatedNode[],
  meanSharerUtility: number,
  meanDefectorUtility: number,
  rng: () => number,
) {
  const sharerIndices = evaluatedNodes
    .map((node, index) => (node.strategy === "sharer" ? index : -1))
    .filter((index) => index >= 0);
  const defectorIndices = evaluatedNodes
    .map((node, index) => (node.strategy === "defector" ? index : -1))
    .filter((index) => index >= 0);

  const nextNodes = evaluatedNodes.map((node) => ({
    id: node.id,
    apId: node.apId,
    strategy: node.strategy,
    reputation: node.reputation,
    baseDemand: node.baseDemand,
  })) satisfies NodeState[];

  if (!sharerIndices.length || !defectorIndices.length) {
    return nextNodes;
  }

  const i = sharerIndices.length;
  const n = evaluatedNodes.length;
  const fS = Math.max(meanSharerUtility + 1, 1e-6);
  const fD = Math.max(meanDefectorUtility + 1, 1e-6);
  const denominator = i * fS + (n - i) * fD;

  if (denominator <= 0) {
    return nextNodes;
  }

  const tPlus = ((i * fS) / denominator) * ((n - i) / n);
  const tMinus = (((n - i) * fD) / denominator) * (i / n);
  const draw = rng();

  if (draw < tPlus) {
    const victim = defectorIndices[Math.floor(rng() * defectorIndices.length)];
    nextNodes[victim].strategy = "sharer";
  } else if (draw < tPlus + tMinus) {
    const victim = sharerIndices[Math.floor(rng() * sharerIndices.length)];
    nextNodes[victim].strategy = "defector";
  }

  return nextNodes;
}

function toTopologyNodes(
  evaluatedNodes: EvaluatedNode[],
  positions: Array<{ id: number; x: number; y: number }>,
) {
  return evaluatedNodes.map((node) => {
    const slot = positions[node.id - 1];

    return {
      id: node.id,
      x: slot.x,
      y: slot.y,
      strategy: node.strategy,
      reputation: node.reputation,
      utility: node.utility,
      rewarded: node.rewarded,
      punished: node.punished,
    } satisfies TopologyNode;
  });
}

function findStabilityTime(timeline: TimePoint[], xStar: number) {
  for (let index = 0; index < timeline.length; index += 1) {
    const stable = timeline
      .slice(index)
      .every((point) => Math.abs(point.x - xStar) < STABILITY_EPSILON);

    if (stable) {
      return index;
    }
  }

  return Math.max(0, timeline.length - 1);
}

function simulateTrajectory(
  config: SimulationConfig,
  scheme: Scheme,
  engine: Engine,
  seed: number,
  captureFrames = false,
) {
  const rng = createRng(seed);
  const positions = getTopologyPositions(config.N);
  const frameInterval = Math.max(1, Math.floor(config.T / 24));
  let nodes = initializeNodes(config, seed);

  const timeline: TimePoint[] = [];
  const frames: TopologyFrame[] = [];
  let finalUtilities: number[] = [];

  for (let t = 0; t < config.T; t += 1) {
    const step = evaluateStep(config, scheme, nodes, rng, t);
    timeline.push(step.timePoint);
    finalUtilities = step.utilities;

    if (captureFrames && (t % frameInterval === 0 || t === config.T - 1)) {
      frames.push({
        step: t,
        nodes: toTopologyNodes(step.evaluatedNodes, positions),
      });
    }

    if (scheme === "Random Strategy") {
      nodes = advanceRandomStrategyNodes(config, step.evaluatedNodes, rng);
      continue;
    }

    if (engine === "Moran") {
      nodes = advanceMoranNodes(
        step.evaluatedNodes,
        step.meanSharerUtility,
        step.meanDefectorUtility,
        rng,
      );
      continue;
    }

    nodes = advanceReplicatorNodes(
      step.evaluatedNodes,
      step.meanSharerUtility,
      step.meanDefectorUtility,
      rng,
    );
  }

  const stableWindow = Math.max(8, Math.floor(timeline.length * 0.08));
  const tail = timeline.slice(-stableWindow);
  const xStar = average(tail.map((point) => point.x));
  const stabilityTime = findStabilityTime(timeline, xStar);
  const absorptionIndex = timeline.findIndex(
    (point) => point.x <= 0 || point.x >= 1,
  );
  const finalPoint = timeline[timeline.length - 1];

  const summarySeed: SeedSummary = {
    xStar,
    meanTh: average(tail.map((point) => point.th)),
    meanJ: average(tail.map((point) => point.j)),
    stabilityTime,
    utilityP10: quantile(finalUtilities, 0.1),
    utilityP50: quantile(finalUtilities, 0.5),
    utilityP90: quantile(finalUtilities, 0.9),
  };

  if (engine === "Moran") {
    summarySeed.rhoS = finalPoint.x >= 1 ? 1 : 0;
    summarySeed.meanAbsorptionTime =
      absorptionIndex >= 0 ? absorptionIndex : config.T;
  }

  return {
    timeline,
    frames,
    summarySeed,
  };
}

function aggregateSchemeSummary(
  config: SimulationConfig,
  scheme: Scheme,
  engine: Engine,
) {
  const xStarValues: number[] = [];
  const meanThValues: number[] = [];
  const meanJValues: number[] = [];
  const stabilityValues: number[] = [];
  const p10Values: number[] = [];
  const p50Values: number[] = [];
  const p90Values: number[] = [];
  const rhoSValues: number[] = [];
  const absorptionValues: number[] = [];

  for (let run = 0; run < config.R; run += 1) {
    const sample = simulateTrajectory(
      config,
      scheme,
      engine,
      config.seed + run * 17,
      false,
    );

    xStarValues.push(sample.summarySeed.xStar);
    meanThValues.push(sample.summarySeed.meanTh);
    meanJValues.push(sample.summarySeed.meanJ);
    stabilityValues.push(sample.summarySeed.stabilityTime);
    p10Values.push(sample.summarySeed.utilityP10);
    p50Values.push(sample.summarySeed.utilityP50);
    p90Values.push(sample.summarySeed.utilityP90);

    if (sample.summarySeed.rhoS !== undefined) {
      rhoSValues.push(sample.summarySeed.rhoS);
    }

    if (sample.summarySeed.meanAbsorptionTime !== undefined) {
      absorptionValues.push(sample.summarySeed.meanAbsorptionTime);
    }
  }

  return {
    scheme,
    engine,
    xStar: withCI(xStarValues),
    meanTh: withCI(meanThValues),
    meanJ: withCI(meanJValues),
    stabilityTime: withCI(stabilityValues),
    utilityP10: withCI(p10Values),
    utilityP50: withCI(p50Values),
    utilityP90: withCI(p90Values),
    rhoS: rhoSValues.length ? withCI(rhoSValues) : undefined,
    meanAbsorptionTime: absorptionValues.length
      ? withCI(absorptionValues)
      : undefined,
  } satisfies SummaryStats;
}

function buildSingleRun(config: SimulationConfig): SingleRunResult {
  const sample = simulateTrajectory(
    config,
    config.scheme,
    config.engine,
    config.seed,
    true,
  );

  return {
    timeline: sample.timeline,
    frames: sample.frames,
    summary: aggregateSchemeSummary(config, config.scheme, config.engine),
  };
}

function buildBaselineComparison(config: SimulationConfig) {
  const schemes: Scheme[] = [
    "Proposed",
    "No Reputation",
    "Fixed Reward",
    "Random Strategy",
  ];

  return schemes.map((scheme) =>
    aggregateSchemeSummary(
      {
        ...config,
        scheme,
      },
      scheme,
      "Replicator",
    ),
  );
}

function buildAlphaKappaHeatmaps(config: SimulationConfig): HeatmapResult[] {
  const metrics = [
    { key: "xStar", label: "x*" },
    { key: "meanJ", label: "J" },
    { key: "stabilityTime", label: "T_s" },
  ] as const;

  return metrics.map((metric) => {
    const cells = ALPHA_KAPPA_VALUES.flatMap((alpha) =>
      ALPHA_KAPPA_VALUES.map((kappa) => {
        const summary = aggregateSchemeSummary(
          {
            ...config,
            alpha,
            kappa,
            R: Math.min(config.R, 8),
            T: Math.min(config.T, 260),
          },
          "Proposed",
          "Replicator",
        );

        const value =
          metric.key === "xStar"
            ? summary.xStar.mean
            : metric.key === "meanJ"
              ? summary.meanJ.mean
              : summary.stabilityTime.mean;

        return {
          x: alpha,
          y: kappa,
          value,
        };
      }),
    );

    return {
      metric: metric.label,
      xLabel: "alpha",
      yLabel: "kappa",
      xValues: ALPHA_KAPPA_VALUES,
      yValues: ALPHA_KAPPA_VALUES,
      cells,
    };
  });
}

function buildPfPdHeatmap(config: SimulationConfig): HeatmapResult {
  const cells = PD_VALUES.flatMap((p_d) =>
    PF_PD_VALUES.map((p_f) => {
      const summary = aggregateSchemeSummary(
        {
          ...config,
          p_d,
          p_f,
          R: Math.min(config.R, 8),
          T: Math.min(config.T, 260),
        },
        "Proposed",
        "Replicator",
      );

      return {
        x: p_f,
        y: p_d,
        value: summary.xStar.mean,
      };
    }),
  );

  return {
    metric: "x*",
    xLabel: "p_f",
    yLabel: "p_d",
    xValues: PF_PD_VALUES,
    yValues: PD_VALUES,
    cells,
  };
}

function buildMoranComparison(config: SimulationConfig) {
  return {
    replicator: aggregateSchemeSummary(config, config.scheme, "Replicator"),
    moran: aggregateSchemeSummary(
      {
        ...config,
        R: Math.min(config.R, 12),
        T: Math.min(config.T, 240),
      },
      config.scheme,
      "Moran",
    ),
  };
}

export function buildDemoResult(config: SimulationConfig): DemoResult {
  return {
    generatedAt: new Date().toISOString(),
    singleRun: buildSingleRun(config),
    comparisons: buildBaselineComparison(config),
    alphaKappa: buildAlphaKappaHeatmaps(config),
    pfPd: buildPfPdHeatmap(config),
    moranComparison: buildMoranComparison(config),
  };
}
