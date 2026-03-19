import { useRef } from "react";
import { SectionCard } from "../../components/ui/SectionCard";
import { presetConfigs } from "../../presets/defaults";
import type {
  Engine,
  Scheme,
  SimulationConfig,
} from "../../types/simulation";

interface ControlPanelProps {
  config: SimulationConfig;
  isRunning: boolean;
  onPatchConfig: (patch: Partial<SimulationConfig>) => void;
  onRun: () => void;
  onReset: () => void;
  onApplyPreset: (config: SimulationConfig) => void;
  onImportConfig: (config: SimulationConfig) => void;
  onExportConfig: () => void;
}

const numericFields: Array<{
  key: keyof SimulationConfig;
  label: string;
  min?: number;
  max?: number;
  step?: number;
}> = [
  { key: "N", label: "用户数 N", min: 9, max: 144, step: 1 },
  { key: "M", label: "AP 数 M", min: 1, max: 18, step: 1 },
  { key: "x0", label: "初始共享意愿 x0", min: 0, max: 1, step: 0.01 },
  { key: "theta", label: "阈值 theta", min: 0.4, max: 0.9, step: 0.01 },
  { key: "alpha", label: "奖励强度 alpha", min: 0, max: 1, step: 0.01 },
  { key: "kappa", label: "惩罚强度 kappa", min: 0, max: 1, step: 0.01 },
  { key: "lambda", label: "成本 lambda", min: 0.05, max: 0.5, step: 0.01 },
  { key: "gamma", label: "额外开销 gamma", min: 0, max: 0.5, step: 0.01 },
  { key: "p_d", label: "检测率 p_d", min: 0.6, max: 0.99, step: 0.01 },
  { key: "p_f", label: "误检率 p_f", min: 0.01, max: 0.2, step: 0.01 },
  { key: "T", label: "步数 T", min: 60, max: 2000, step: 10 },
  { key: "R", label: "重复次数 R", min: 1, max: 30, step: 1 },
  { key: "seed", label: "随机种子 seed", min: 1, max: 99999999, step: 1 },
];

export function ControlPanel({
  config,
  isRunning,
  onPatchConfig,
  onRun,
  onReset,
  onApplyPreset,
  onImportConfig,
  onExportConfig,
}: ControlPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <SectionCard
      title="参数控制"
      actions={
        <div className="inline-actions">
          <button className="ghost-button" onClick={onExportConfig} type="button">
            导出 JSON
          </button>
          <button
            className="ghost-button"
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            导入 JSON
          </button>
        </div>
      }
    >
      <input
        accept="application/json"
        className="hidden-input"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) {
            return;
          }

          const text = await file.text();
          const payload = JSON.parse(text) as SimulationConfig;
          onImportConfig(payload);
          event.target.value = "";
        }}
        ref={fileInputRef}
        type="file"
      />

      <div className="preset-row">
        {presetConfigs.map((preset) => (
          <button
            className="chip-button"
            key={preset.label}
            onClick={() => onApplyPreset(preset.config)}
            type="button"
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="select-grid">
        <label>
          <span>方案 scheme</span>
          <select
            onChange={(event) =>
              onPatchConfig({ scheme: event.target.value as Scheme })
            }
            value={config.scheme}
          >
            <option value="Proposed">Proposed</option>
            <option value="No Reputation">No Reputation</option>
            <option value="Fixed Reward">Fixed Reward</option>
            <option value="Random Strategy">Random Strategy</option>
          </select>
        </label>

        <label>
          <span>引擎 engine</span>
          <select
            onChange={(event) =>
              onPatchConfig({ engine: event.target.value as Engine })
            }
            value={config.engine}
          >
            <option value="Replicator">Replicator</option>
            <option value="Moran">Moran</option>
          </select>
        </label>
      </div>

      <div className="control-grid">
        {numericFields.map((field) => (
          <label className="control-field" key={String(field.key)}>
            <span>{field.label}</span>
            <div className="control-stack">
              <input
                max={field.max}
                min={field.min}
                onChange={(event) =>
                  onPatchConfig({
                    [field.key]: Number(event.target.value),
                  } as Partial<SimulationConfig>)
                }
                step={field.step}
                type="range"
                value={config[field.key] as number}
              />
              <input
                max={field.max}
                min={field.min}
                onChange={(event) =>
                  onPatchConfig({
                    [field.key]: Number(event.target.value),
                  } as Partial<SimulationConfig>)
                }
                step={field.step}
                type="number"
                value={config[field.key] as number}
              />
            </div>
          </label>
        ))}
      </div>

      <div className="button-row">
        <button className="primary-button" disabled={isRunning} onClick={onRun} type="button">
          {isRunning ? "计算中..." : "运行仿真"}
        </button>
        <button className="secondary-button" onClick={onReset} type="button">
          恢复默认
        </button>
      </div>
    </SectionCard>
  );
}
