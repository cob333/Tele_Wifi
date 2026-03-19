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
      name: result.xLabel || "横坐标",
      nameLocation: "middle",
      nameGap: 28,
      data: result.xValues.map((value) => value.toFixed(2)),
      axisLabel: {
        color: "#9eb2b2",
      },
    },
    yAxis: {
      type: "category",
      name: result.yLabel || "纵坐标",
      nameLocation: "middle",
      nameGap: 40,
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
        title="鲁棒性——-检测机制退化边界"
      >
        <ReactECharts option={toHeatmapOption(pfPd)} style={{ height: 320 }} />
      </SectionCard>

      <SectionCard
        title="Replicator vs Moran"
      >
        <div className="comparison-grid">
          <article className="mini-panel">
            <h3>Replicator</h3>
            <p>稳态共享意愿: {formatWithCI(moranComparison.replicator.xStar.mean, moranComparison.replicator.xStar.ci95)}</p>
            <p>吞吐效率: {formatWithCI(moranComparison.replicator.meanTh.mean, moranComparison.replicator.meanTh.ci95)}</p>
            <p>公平性: {formatWithCI(moranComparison.replicator.meanJ.mean, moranComparison.replicator.meanJ.ci95)}</p>
          </article>
          <article className="mini-panel">
            <h3>Moran</h3>
            <p>稳态共享意愿: {formatWithCI(moranComparison.moran.xStar.mean, moranComparison.moran.xStar.ci95)}</p>
            <p>rho_S: {moranComparison.moran.rhoS ? formatWithCI(moranComparison.moran.rhoS.mean, moranComparison.moran.rhoS.ci95) : "--"}</p>
            <p>
              吸收时间:
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
