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
      label: "共享意愿 x(t)",
      value: point ? formatPercent(point.x) : "--",
    },
    {
      label: "吞吐效率 Th(t)",
      value: point ? formatMetric(point.th) : "--",
    },
    {
      label: "公平性 J(t)",
      value: point ? formatMetric(point.j) : "--",
    },
    {
      label: "整体信誉 mean(r_t)",
      value: point ? formatMetric(point.meanR) : "--",
    },
  ];

  return (
    <SectionCard
      title="核心指标"
      subtitle={isRunning ? `后台阶段: ${progressStage}` : "当前指标随时间轴联动更新。"}
    >
      <div className="metric-grid">
        {cards.map(({ label, value }) => (
          <article className="metric-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
    </SectionCard>
  ); 
}
