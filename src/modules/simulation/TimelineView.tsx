import ReactECharts from "echarts-for-react";
import { SectionCard } from "../../components/ui/SectionCard";
import type { TimePoint } from "../../types/simulation";

interface TimelineViewProps {
  timeline: TimePoint[];
  activeStep: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStepChange: (step: number) => void;
}

export function TimelineView({
  timeline,
  activeStep,
  isPlaying,
  onTogglePlay,
  onStepChange,
}: TimelineViewProps) {
  const option = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
    },
    legend: {
      top: 0,
      textStyle: {
        color: "#dce5e5",
      },
    },
    grid: {
      top: 42,
      left: 40,
      right: 16,
      bottom: 26,
    },
    xAxis: {
      type: "category",
      data: timeline.map((point) => point.t),
      axisLabel: {
        color: "#9eb2b2",
      },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: 1,
      axisLabel: {
        color: "#9eb2b2",
      },
      splitLine: {
        lineStyle: {
          color: "rgba(255,255,255,0.08)",
        },
      },
    },
    series: [
      {
        name: "x(t)",
        type: "line",
        smooth: true,
        data: timeline.map((point) => point.x),
        lineStyle: { width: 3, color: "#f26b3a" },
        symbol: "none",
      },
      {
        name: "Th(t)",
        type: "line",
        smooth: true,
        data: timeline.map((point) => point.th),
        lineStyle: { width: 2, color: "#f0c05d" },
        symbol: "none",
      },
      {
        name: "J(t)",
        type: "line",
        smooth: true,
        data: timeline.map((point) => point.j),
        lineStyle: { width: 2, color: "#6bc6d6" },
        symbol: "none",
      },
      {
        name: "mean(r_t)",
        type: "line",
        smooth: true,
        data: timeline.map((point) => point.meanR),
        lineStyle: { width: 2, color: "#90e39a" },
        symbol: "none",
      },
      {
        name: "当前时刻",
        type: "line",
        data: timeline.map((_, index) => (index === activeStep ? 1 : null)),
        lineStyle: { opacity: 0 },
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: {
            color: "#ffffff",
            type: "dashed",
          },
          data: [{ xAxis: activeStep }],
        },
      },
    ],
  };

  return (
    <SectionCard
      title="动态演化"
      subtitle="四条时间序列与拓扑动画共享同一时间轴。"
      actions={
        <div className="inline-actions">
          <button className="secondary-button" onClick={onTogglePlay} type="button">
            {isPlaying ? "暂停" : "播放"}
          </button>
          <span className="badge">step {activeStep}</span>
        </div>
      }
    >
      <ReactECharts option={option} style={{ height: 320 }} />

      <div className="timeline-controls">
        <input
          max={Math.max(0, timeline.length - 1)}
          min={0}
          onChange={(event) => onStepChange(Number(event.target.value))}
          type="range"
          value={activeStep}
        />
      </div>
    </SectionCard>
  );
}
