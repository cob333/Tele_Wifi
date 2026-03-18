import ReactECharts from "echarts-for-react";
import { SectionCard } from "../../components/ui/SectionCard";
import { formatWithCI } from "../../lib/format";
import type { HeatmapResult, MoranComparison } from "../../types/simulation";

interface SensitivityPanelProps {
  alphaKappa: HeatmapResult[];
  pfPd: HeatmapResult;
  moranComparison: MoranComparison;
}

function toHeatmapOption(result: HeatmapResult) {
  return {
    tooltip: {
      position: "top",
    },
    grid: {
      top: 28,
      left: 48,
      right: 10,
      bottom: 28,
    },
    xAxis: {
      type: "category",
      name: result.xLabel,
      data: result.xValues.map((value) => value.toFixed(2)),
      axisLabel: {
        color: "#9eb2b2",
      },
    },
    yAxis: {
      type: "category",
      name: result.yLabel,
      data: result.yValues.map((value) => value.toFixed(2)),
      axisLabel: {
        color: "#9eb2b2",
      },
    },
    visualMap: {
      min: Math.min(...result.cells.map((cell) => cell.value)),
      max: Math.max(...result.cells.map((cell) => cell.value)),
      calculable: false,
      orient: "horizontal",
      left: "center",
      bottom: 0,
      textStyle: {
        color: "#dce5e5",
      },
      inRange: {
        color: ["#1f2937", "#196c73", "#f0c05d", "#f26b3a"],
      },
    },
    series: [
      {
        type: "heatmap",
        data: result.cells.map((cell) => [
          result.xValues.indexOf(cell.x),
          result.yValues.indexOf(cell.y),
          cell.value,
        ]),
        label: {
          show: true,
          formatter: ({ value }: { value: [number, number, number] }) =>
            value[2].toFixed(2),
          color: "#ffffff",
          fontSize: 10,
        },
      },
    ],
  };
}

export function SensitivityPanel({
  alphaKappa,
  pfPd,
  moranComparison,
}: SensitivityPanelProps) {
  return (
    <div className="stack-grid">
      <SectionCard
        title="alpha-kappa 敏感性"
        subtitle="围绕 x*、J 和 T_s 展示奖励强度与惩罚强度的耦合影响。"
      >
        <div className="heatmap-grid">
          {alphaKappa.map((heatmap) => (
            <article className="mini-panel" key={heatmap.metric}>
              <h3>{heatmap.metric}</h3>
              <ReactECharts option={toHeatmapOption(heatmap)} style={{ height: 260 }} />
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="p_f - p_d 鲁棒性"
        subtitle="高误检率和低检测率是机制退化边界，单独拿出来做 robustness view。"
      >
        <ReactECharts option={toHeatmapOption(pfPd)} style={{ height: 320 }} />
      </SectionCard>

      <SectionCard
        title="Replicator vs Moran"
        subtitle="保留确定性和随机演化两类结果，避免将它们混为一个结论。"
      >
        <div className="comparison-grid">
          <article className="mini-panel">
            <h3>Replicator</h3>
            <p>x*: {formatWithCI(moranComparison.replicator.xStar.mean, moranComparison.replicator.xStar.ci95)}</p>
            <p>Th: {formatWithCI(moranComparison.replicator.meanTh.mean, moranComparison.replicator.meanTh.ci95)}</p>
            <p>J: {formatWithCI(moranComparison.replicator.meanJ.mean, moranComparison.replicator.meanJ.ci95)}</p>
          </article>
          <article className="mini-panel">
            <h3>Moran</h3>
            <p>x*: {formatWithCI(moranComparison.moran.xStar.mean, moranComparison.moran.xStar.ci95)}</p>
            <p>rho_S: {moranComparison.moran.rhoS ? formatWithCI(moranComparison.moran.rhoS.mean, moranComparison.moran.rhoS.ci95) : "--"}</p>
            <p>
              Absorption:
              {" "}
              {moranComparison.moran.meanAbsorptionTime
                ? formatWithCI(
                    moranComparison.moran.meanAbsorptionTime.mean,
                    moranComparison.moran.meanAbsorptionTime.ci95,
                    1,
                  )
                : "--"}
            </p>
          </article>
        </div>
      </SectionCard>
    </div>
  );
}
