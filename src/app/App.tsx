import { startTransition, useEffect, useRef, useState } from "react";
import SimulationWorker from "../workers/simulation.worker?worker";
import { MechanismOverview } from "../modules/mechanism/MechanismOverview";
import { ControlPanel } from "../modules/controls/ControlPanel";
import { MetricCards } from "../modules/simulation/MetricCards";
import { TimelineView } from "../modules/simulation/TimelineView";
import { TopologyView } from "../modules/simulation/TopologyView";
import { BaselineComparison } from "../modules/comparison/BaselineComparison";
import { SensitivityPanel } from "../modules/sensitivity/SensitivityPanel";
import { ExportPanel } from "../modules/export/ExportPanel";
import { SectionCard } from "../components/ui/SectionCard";
import { downloadJson } from "../lib/download";
import { useDemoStore } from "../stores/demoStore";
import { defaultConfig } from "../presets/defaults";
import type {
  DemoTab,
  SimulationConfig,
  TopologyFrame,
  WorkerMessage,
  WorkerRequest,
} from "../types/simulation";

const TABS: Array<{ key: DemoTab; label: string }> = [
  { key: "demo", label: "单次演示" },
  { key: "comparison", label: "基线对比" },
  { key: "scan", label: "参数扫描" },
  { key: "export", label: "导出结果" },
];

function getFrameAtStep(frames: TopologyFrame[], step: number) {
  let current = frames[0] ?? null;
  for (const frame of frames) {
    if (frame.step <= step) {
      current = frame;
    }
  }
  return current;
}

export default function App() {
  const workerRef = useRef<Worker | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const {
    config,
    result,
    activeStep,
    activeTab,
    selectedNodeId,
    isRunning,
    progressStage,
    error,
    setConfig,
    patchConfig,
    setResult,
    setActiveStep,
    setActiveTab,
    setSelectedNodeId,
    setIsRunning,
    setProgressStage,
    setError,
    resetConfig,
  } = useDemoStore();

  useEffect(() => {
    const worker = new SimulationWorker();
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;

      if (message.type === "progress") {
        setProgressStage(message.stage);
        return;
      }

      if (message.type === "error") {
        setIsRunning(false);
        setError(message.message);
        return;
      }

      startTransition(() => {
        setResult(message.payload);
      });
      setSelectedNodeId(null);
      setIsRunning(false);
      setProgressStage("已完成");
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [
    setError,
    setIsRunning,
    setProgressStage,
    setResult,
    setSelectedNodeId,
  ]);

  useEffect(() => {
    if (!result && workerRef.current) {
      const request: WorkerRequest = {
        type: "run-all",
        payload: defaultConfig,
      };
      setIsRunning(true);
      workerRef.current.postMessage(request);
    }
  }, [result, setIsRunning]);

  useEffect(() => {
    if (!isPlaying || !result) {
      return;
    }

    if (activeStep >= result.singleRun.timeline.length - 1) {
      setIsPlaying(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setActiveStep(activeStep + 1);
    }, 140);

    return () => window.clearTimeout(timer);
  }, [activeStep, isPlaying, result, setActiveStep]);

  const timeline = result?.singleRun.timeline ?? [];
  const currentPoint = timeline[activeStep] ?? null;
  const currentFrame = result
    ? getFrameAtStep(result.singleRun.frames, activeStep)
    : null;

  function runSimulation(nextConfig = config) {
    if (!workerRef.current) {
      return;
    }

    setError(null);
    setIsRunning(true);
    setProgressStage("准备运行");
    setIsPlaying(false);
    setSelectedNodeId(null);

    const request: WorkerRequest = {
      type: "run-all",
      payload: nextConfig,
    };
    workerRef.current.postMessage(request);
  }

  function applyImportedConfig(nextConfig: SimulationConfig) {
    setConfig(nextConfig);
    runSimulation(nextConfig);
  }

  return (
    <div className="app-shell">
      <header className="hero-panel">
        <div>
          <p className="eyebrow">Campus WiFi Reputation Demo</p>
          <h1>交互式校园 WiFi 信誉奖惩仿真看板</h1>
          <p className="hero-copy">
            这个骨架把机制说明、动态演化、基线对比、参数扫描和导出模块串成一个可运行的前端 Demo，
            后续可以继续替换为你的正式模型公式和实验数据。
          </p>
        </div>
        <div className="hero-meta">
          <span className="badge">engine: {config.engine}</span>
          <span className="badge">scheme: {config.scheme}</span>
          <span className="badge">generated: {result?.generatedAt ?? "--"}</span>
        </div>
      </header>

      <div className="app-grid">
        <aside className="left-column">
          <MechanismOverview />
          <ControlPanel
            config={config}
            isRunning={isRunning}
            onApplyPreset={(preset) => {
              setConfig(preset);
              runSimulation(preset);
            }}
            onExportConfig={() => downloadJson("wifi-demo-config.json", config)}
            onImportConfig={applyImportedConfig}
            onPatchConfig={patchConfig}
            onReset={() => {
              resetConfig();
              runSimulation(defaultConfig);
            }}
            onRun={() => runSimulation(config)}
          />
        </aside>

        <main className="main-column">
          <MetricCards
            isRunning={isRunning}
            point={currentPoint}
            progressStage={progressStage}
            summary={result?.singleRun.summary ?? null}
          />

          <div className="tab-row">
            {TABS.map((tab) => (
              <button
                className={tab.key === activeTab ? "tab-button active" : "tab-button"}
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          {error ? (
            <SectionCard title="运行错误" subtitle="worker 返回错误，检查配置或公式实现。">
              <p className="error-text">{error}</p>
            </SectionCard>
          ) : null}

          {activeTab === "demo" ? (
            <div className="stack-grid">
              <TopologyView
                config={config}
                frame={currentFrame}
                onSelectNode={setSelectedNodeId}
                point={currentPoint}
                selectedNodeId={selectedNodeId}
              />
              <TimelineView
                activeStep={activeStep}
                isPlaying={isPlaying}
                onStepChange={setActiveStep}
                onTogglePlay={() => setIsPlaying((value) => !value)}
                timeline={timeline}
              />
            </div>
          ) : null}

          {activeTab === "comparison" && result ? (
            <BaselineComparison rows={result.comparisons} />
          ) : null}

          {activeTab === "scan" && result ? (
            <SensitivityPanel
              alphaKappa={result.alphaKappa}
              moranComparison={result.moranComparison}
              pfPd={result.pfPd}
            />
          ) : null}

          {activeTab === "export" ? (
            <ExportPanel config={config} result={result} />
          ) : null}
        </main>
      </div>
    </div>
  );
}
