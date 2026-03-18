import { create } from "zustand";
import { defaultConfig } from "../presets/defaults";
import type {
  DemoResult,
  DemoTab,
  SimulationConfig,
} from "../types/simulation";

interface DemoState {
  config: SimulationConfig;
  result: DemoResult | null;
  activeStep: number;
  activeTab: DemoTab;
  selectedNodeId: number | null;
  isRunning: boolean;
  progressStage: string;
  error: string | null;
  setConfig: (next: SimulationConfig) => void;
  patchConfig: (patch: Partial<SimulationConfig>) => void;
  setResult: (result: DemoResult | null) => void;
  setActiveStep: (step: number) => void;
  setActiveTab: (tab: DemoTab) => void;
  setSelectedNodeId: (nodeId: number | null) => void;
  setIsRunning: (value: boolean) => void;
  setProgressStage: (value: string) => void;
  setError: (value: string | null) => void;
  resetConfig: () => void;
}

export const useDemoStore = create<DemoState>((set) => ({
  config: defaultConfig,
  result: null,
  activeStep: 0,
  activeTab: "demo",
  selectedNodeId: null,
  isRunning: false,
  progressStage: "等待运行",
  error: null,
  setConfig: (next) =>
    set({
      config: next,
    }),
  patchConfig: (patch) =>
    set((state) => ({
      config: {
        ...state.config,
        ...patch,
      },
    })),
  setResult: (result) =>
    set({
      result,
      activeStep: 0,
    }),
  setActiveStep: (activeStep) => set({ activeStep }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId }),
  setIsRunning: (isRunning) => set({ isRunning }),
  setProgressStage: (progressStage) => set({ progressStage }),
  setError: (error) => set({ error }),
  resetConfig: () =>
    set({
      config: defaultConfig,
    }),
}));
