import { SectionCard } from "../../components/ui/SectionCard";
import { formatMetric, formatPercent } from "../../lib/format";
import type {
  SimulationConfig,
  TimePoint,
  TopologyFrame,
} from "../../types/simulation";

interface TopologyViewProps {
  config: SimulationConfig;
  frame: TopologyFrame | null;
  point: TimePoint | null;
  selectedNodeId: number | null;
  onSelectNode: (nodeId: number | null) => void;
}

function buildApPositions(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / count;
    return {
      id: index + 1,
      x: 50 + Math.cos(angle) * 30,
      y: 50 + Math.sin(angle) * 30,
    };
  });
}

export function TopologyView({
  config,
  frame,
  point,
  selectedNodeId,
  onSelectNode,
}: TopologyViewProps) {
  const aps = buildApPositions(config.M);
  const selectedNode =
    frame?.nodes.find((node) => node.id === selectedNodeId) ?? frame?.nodes[0] ?? null;

  return (
    <SectionCard
      title="校园拓扑与节点状态"
      subtitle="暖色表示共享者，冷色表示非共享者，边框亮度表示信誉强弱。"
    >
      <div className="topology-layout">
        <svg className="topology-canvas" viewBox="0 0 100 100">
          {aps.map((ap) => (
            <g key={ap.id}>
              <circle className="ap-ring" cx={ap.x} cy={ap.y} r="16" />
              <circle className="ap-node" cx={ap.x} cy={ap.y} r="3.2" />
              <text className="ap-label" x={ap.x} y={ap.y - 5}>
                AP{ap.id}
              </text>
            </g>
          ))}

          {frame?.nodes.map((node) => (
            <g key={node.id}>
              <circle
                className={[
                  "user-node",
                  node.strategy === "sharer" ? "user-sharer" : "user-defector",
                  selectedNode?.id === node.id ? "user-selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                cx={node.x}
                cy={node.y}
                onClick={() => onSelectNode(node.id)}
                r={1.8 + node.reputation * 1.8}
                style={{
                  opacity: 0.6 + node.reputation * 0.4,
                }}
              />
              {node.rewarded ? (
                <circle className="event-reward" cx={node.x} cy={node.y} r="4.5" />
              ) : null}
              {node.punished ? (
                <circle className="event-punish" cx={node.x} cy={node.y} r="4.2" />
              ) : null}
            </g>
          ))}
        </svg>

        <aside className="node-detail">
          <h3>节点详情</h3>
          {selectedNode ? (
            <>
              <div className="detail-row">
                <span>节点 ID</span>
                <strong>{selectedNode.id}</strong>
              </div>
              <div className="detail-row">
                <span>当前策略</span>
                <strong>{selectedNode.strategy === "sharer" ? "共享" : "非共享"}</strong>
              </div>
              <div className="detail-row">
                <span>信誉值</span>
                <strong>{formatMetric(selectedNode.reputation)}</strong>
              </div>
              <div className="detail-row">
                <span>效用</span>
                <strong>{formatMetric(selectedNode.utility)}</strong>
              </div>
              <div className="detail-row">
                <span>奖励 / 惩罚</span>
                <strong>
                  {selectedNode.rewarded ? "奖励" : "无"} /{" "}
                  {selectedNode.punished ? "惩罚" : "无"}
                </strong>
              </div>
            </>
          ) : (
            <p>运行仿真后选择节点。</p>
          )}

          {point ? (
            <div className="detail-summary">
              <h4>当前时刻总览</h4>
              <div className="detail-row">
                <span>共享率</span>
                <strong>{formatPercent(point.x)}</strong>
              </div>
              <div className="detail-row">
                <span>共享者 / 非共享者</span>
                <strong>
                  {point.sharerCount} / {point.defectorCount}
                </strong>
              </div>
              <div className="detail-row">
                <span>奖励 / 惩罚人数</span>
                <strong>
                  {point.rewardedUserCount} / {point.punishedUserCount}
                </strong>
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </SectionCard>
  );
}
