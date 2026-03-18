import { SectionCard } from "../../components/ui/SectionCard";

const STEPS = [
  {
    title: "状态初始化",
    text: "以校园拓扑、AP 数、用户数和初始共享比例 x0 作为起点，生成演示网络。",
  },
  {
    title: "信誉评估",
    text: "根据共享行为和检测质量更新信誉，阈值 theta 决定奖励或惩罚的触发。",
  },
  {
    title: "策略演化",
    text: "用户根据收益差和信誉反馈调整共享或非共享策略，形成 x(t) 的动态变化。",
  },
  {
    title: "结果输出",
    text: "同步记录吞吐 Th、公平性 J、平均信誉和稳态指标，用于基线比较与参数扫描。",
  },
];

export function MechanismOverview() {
  return (
    <SectionCard
      title="机制概览"
      subtitle="把论文机制压缩成演示逻辑，保证观众先看懂流程再看数值。"
    >
      <div className="flow-grid">
        {STEPS.map((step, index) => (
          <article className="flow-step" key={step.title}>
            <span className="flow-index">0{index + 1}</span>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}
