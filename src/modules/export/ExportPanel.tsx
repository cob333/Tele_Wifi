import { SectionCard } from "../../components/ui/SectionCard";
import { downloadCsv, downloadJson } from "../../lib/download";
import type { DemoResult, SimulationConfig } from "../../types/simulation";

interface ExportPanelProps {
  config: SimulationConfig;
  result: DemoResult | null;
}

export function ExportPanel({ config, result }: ExportPanelProps) {
  return (
    <SectionCard
      title="导出与复现"
      subtitle="当前骨架支持导出配置、时间序列和摘要结果，便于继续接正式实验。"
    >
      <div className="button-row">
        <button
          className="primary-button"
          onClick={() => downloadJson("wifi-demo-config.json", config)}
          type="button"
        >
          导出配置 JSON
        </button>

        <button
          className="secondary-button"
          disabled={!result}
          onClick={() => {
            if (!result) {
              return;
            }

            downloadCsv(
              "wifi-demo-timeline.csv",
              result.singleRun.timeline.map((point) => ({
                t: point.t,
                x: point.x,
                th: point.th,
                j: point.j,
                meanR: point.meanR,
                sharerCount: point.sharerCount,
                defectorCount: point.defectorCount,
                rewardedUserCount: point.rewardedUserCount,
                punishedUserCount: point.punishedUserCount,
              })),
            );
          }}
          type="button"
        >
          导出时间序列 CSV
        </button>

        <button
          className="secondary-button"
          disabled={!result}
          onClick={() => {
            if (!result) {
              return;
            }

            downloadJson("wifi-demo-summary.json", result);
          }}
          type="button"
        >
          导出摘要 JSON
        </button>
      </div>

      <div className="export-note">
        <p>建议正式论文实验使用 `R &gt;= 30`、公开 `seed` 和完整参数网格，并保留原始日志。</p>
        <p>当前项目骨架已为 worker、配置、对照组、热图和导出接口预留扩展位。</p>
      </div>
    </SectionCard>
  );
}
