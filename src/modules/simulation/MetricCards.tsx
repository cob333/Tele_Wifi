import { SectionCard } from "../../components/ui/SectionCard";
import { formatMetric, formatPercent, formatWithCI } from "../../lib/format";
import type { SummaryStats, TimePoint } from "../../types/simulation";

interface MetricCardsProps {
  point: TimePoint | null;
  summary: SummaryStats | null;
  progressStage: string;
  isRunning: boolean;
}

export function MetricCards({
  point,
  summary,
  progressStage,
  isRunning,
}: MetricCardsProps) {
  const cards = [
    {
      label: "共享率 x(t)",
      value: point ? formatPercent(point.x) : "--",
    },
    {
      label: "吞吐 Th(t)",
      value: point ? formatMetric(point.th) : "--",
    },
    {
      label: "公平性 J(t)",
      value: point ? formatMetric(point.j) : "--",
    },
    {
      label: "平均信誉 mean(r_t)",
      value: point ? formatMetric(point.meanR) : "--",
    },
  ];

  return (
    <SectionCard
      title="核心指标"
      subtitle={
        isRunning ? `后台阶段: ${progressStage}` : "当前指标随时间轴联动更新。"
      }
    >
      <div className="metric-grid">
        {cards.map((card) => (
          <article className="metric-card" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </article>
        ))}
      </div>

      {summary ? (
        <div className="summary-strip">
          <span>稳态 x*: {formatWithCI(summary.xStar.mean, summary.xStar.ci95)}</span>
          <span>平均 Th: {formatWithCI(summary.meanTh.mean, summary.meanTh.ci95)}</span>
          <span>平均 J: {formatWithCI(summary.meanJ.mean, summary.meanJ.ci95)}</span>
          <span>T_s: {formatWithCI(summary.stabilityTime.mean, summary.stabilityTime.ci95, 1)}</span>
        </div>
      ) : null}
    </SectionCard>
  );
}
