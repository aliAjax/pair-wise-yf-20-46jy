import { DEVICES, LEVEL_KW, LEVEL_LABEL, NODES } from "../data";
import type { Row } from "../types";
import { fmtTime } from "../utils";

interface Props {
  rows: Row[];
  selectedNo: number | null;
  onSelect: (no: number) => void;
}

const STATUS_TEXT: Record<Row["status"], string> = {
  assigned: "已排入",
  reassigned: "已改派",
  waiting: "等待改派",
  blocked: "停止未排入",
};

/** 执行单：按发次顺序列出设备编号 */
export default function ExecutionSheet({ rows, selectedNo, onSelect }: Props) {
  return (
    <div className="sheet-wrap">
      <table className="sheet">
        <thead>
          <tr>
            <th>发次</th>
            <th>段落</th>
            <th>型号</th>
            <th>点火时刻</th>
            <th>持续</th>
            <th>耗电</th>
            <th>设备编号</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const node = NODES.find((n) => n.no === row.no)!;
            const device = DEVICES.find((d) => d.id === row.deviceId);
            const baseDevice = DEVICES.find((d) => d.id === row.baselineDeviceId);
            return (
              <tr
                key={row.no}
                className={
                  "st-" + row.status + (selectedNo === row.no ? " is-selected" : "")
                }
                onClick={() => onSelect(row.no)}
              >
                <td className="col-no">#{String(row.no).padStart(2, "0")}</td>
                <td>{node.section}</td>
                <td>{node.model}</td>
                <td className="mono">{fmtTime(node.time)}</td>
                <td className="mono">{node.duration.toFixed(1)}s</td>
                <td>
                  <span className={"lvl lvl-" + node.level}>{LEVEL_LABEL[node.level]}</span>
                </td>
                <td>
                  {device ? (
                    <span className="dev-tag" style={{ background: device.color }}>
                      {device.id}
                    </span>
                  ) : row.status === "waiting" && baseDevice ? (
                    <span className="dev-tag dev-tag-ghost" title={`原派 ${baseDevice.id}，设备停用`}>
                      {baseDevice.id}↻
                    </span>
                  ) : (
                    <span className="dash">—</span>
                  )}
                  {row.status === "reassigned" && baseDevice && (
                    <small className="reroute">原 {baseDevice.id}</small>
                  )}
                </td>
                <td>
                  <span className={"pill pill-" + row.status}>{STATUS_TEXT[row.status]}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="sheet-note">
        单节点功率 L1={LEVEL_KW[1]}kW / L2={LEVEL_KW[2]}kW / L3={LEVEL_KW[3]}kW；排程在首个无可用点火器的节点停止，其后发次不重排顺序。
      </p>
    </div>
  );
}
