import ReactECharts from "echarts-for-react";
import { SectionCard } from "../../components/ui/SectionCard";
import { formatMetric, formatWithCI } from "../../lib/format";
import type { SummaryStats } from "../../types/simulation";

interface BaselineComparisonProps {
  rows: SummaryStats[];
}

export function BaselineComparison({ rows }: BaselineComparisonProps) {
  const option = {
    tooltip: { trigger: "axis" },
    legend: {
      textStyle: {
        color: "#dce5e5",
      },
    },
    grid: {
      top: 36,
      left: 40,
      right: 16,
      bottom: 32,
    },
    xAxis: {
      type: "category",
      data: rows.map((row) => row.scheme),
      axisLabel: {
        color: "#9eb2b2",
        interval: 0,
        rotate: 10,
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
        name: "稳态共享意愿",
        type: "bar",
        data: rows.map((row) => row.xStar.mean),
        itemStyle: { color: "#f26b3a" },
      },
      {
        name: "吞吐效率",
        type: "bar",
        data: rows.map((row) => row.meanTh.mean),
        itemStyle: { color: "#f0c05d" },
      },
      {
        name: "公平性",
        type: "bar",
        data: rows.map((row) => row.meanJ.mean),
        itemStyle: { color: "#6bc6d6" },
      },
    ],
  };

  return (
    <SectionCard
      title="基线比较"
      subtitle="四类方案统一使用同一组参数基础，摘要结果用均值和 95% 置信区间表示。"
    >
      <ReactECharts option={option} style={{ height: 280 }} />

      <div className="table-wrap">
        <table className="summary-table">
          <thead>
            <tr>
              <th>方案</th>
              <th>稳态共享意愿</th>
              <th>吞吐效率</th>
              <th>公平性</th>
              <th>稳定时间</th>
              <th>第10百分位收益</th>
              <th>中位收益</th>
              <th>第90百分位收益</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.scheme}>
                <td>{row.scheme}</td>
                <td>{formatWithCI(row.xStar.mean, row.xStar.ci95)}</td>
                <td>{formatWithCI(row.meanTh.mean, row.meanTh.ci95)}</td>
                <td>{formatWithCI(row.meanJ.mean, row.meanJ.ci95)}</td>
                <td>{formatWithCI(row.stabilityTime.mean, row.stabilityTime.ci95, 1)}</td>
                <td>{formatMetric(row.utilityP10.mean)}</td>
                <td>{formatMetric(row.utilityP50.mean)}</td>
                <td>{formatMetric(row.utilityP90.mean)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
