import { buildDemoResult } from "../engine/simulation";
import type { WorkerMessage, WorkerRequest } from "../types/simulation";

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  if (request.type !== "run-all") {
    return;
  }

  try {
    const stages = [
      "生成单次演示结果",
      "汇总基线比较",
      "计算参数敏感性",
      "构建 Moran 对照",
    ];

    stages.forEach((stage) => {
      const progressMessage: WorkerMessage = {
        type: "progress",
        stage,
      };
      self.postMessage(progressMessage);
    });

    const payload = buildDemoResult(request.payload);
    const resultMessage: WorkerMessage = {
      type: "result",
      payload,
    };
    self.postMessage(resultMessage);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown worker error";
    const errorMessage: WorkerMessage = {
      type: "error",
      message,
    };
    self.postMessage(errorMessage);
  }
};
