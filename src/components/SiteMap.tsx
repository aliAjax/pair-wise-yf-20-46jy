import { DEVICES, NODES } from "../data";
import type { Row } from "../types";

interface Props {
  rows: Row[];
  selectedNo: number | null;
  onSelect: (no: number) => void;
  playhead: number;
}

const ZONE_NAME: Record<"A" | "B" | "C", string> = {
  A: "A区 · 近景发射点",
  B: "B区 · 中央发射点",
  C: "C区 · 远景发射点",
};

/** 燃放点位平面图：按发次定位，点击可与时间轴/执行单联动 */
export default function SiteMap({ rows, selectedNo, onSelect, playhead }: Props) {
  const rowByNo = new Map(rows.map((r) => [r.no, r]));
  return (
    <div className="map">
      <div className="map-zone zone-a">A</div>
      <div className="map-zone zone-b">B</div>
      <div className="map-zone zone-c">C</div>
      <div className="map-stage">观 众 区</div>

      {NODES.map((node) => {
        const row = rowByNo.get(node.no)!;
        const device = DEVICES.find((d) => d.id === row.deviceId);
        const firing = playhead >= node.time && playhead < node.time + node.duration;
        const color = device?.color ?? (row.status === "blocked" ? "#94a3b8" : "#dc2626");
        return (
          <button
            key={node.no}
            className={
              "map-point" +
              (selectedNo === node.no ? " is-selected" : "") +
              (firing ? " is-firing" : "") +
              " mp-" + row.status
            }
            style={{ left: `${node.x}%`, top: `${node.y}%`, ["--c" as string]: color }}
            onClick={() => onSelect(node.no)}
            title={`#${node.no} ${node.model}｜${ZONE_NAME[node.zone]}｜${row.status}${device ? "｜" + device.id : ""}`}
          >
            <span className="map-dot" />
            <b>{node.no}</b>
            {firing && <span className="map-ring" />}
          </button>
        );
      })}
    </div>
  );
}
