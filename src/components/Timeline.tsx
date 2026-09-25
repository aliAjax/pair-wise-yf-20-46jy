import { DEVICES, NODES, TIMELINE_MAX } from "../data";
import type { Row, ScheduleView } from "../types";
import { fmtTick, fmtTime } from "../utils";

interface Props {
  view: ScheduleView;
  playhead: number;
  selectedNo: number | null;
  onSelect: (no: number) => void;
  onScrub: (time: number) => void;
}

const PAD = 64;

export default function Timeline({ view, playhead, selectedNo, onSelect, onScrub }: Props) {
  const ticks = Array.from({ length: TIMELINE_MAX / 2 + 1 }, (_, i) => i * 2);
  const nodeByNo = new Map(NODES.map((n) => [n.no, n] as const));

  const left = (t: number) => `calc(${PAD}px + (100% - ${PAD}px) * ${t / TIMELINE_MAX})`;
  const trackRatio = (dur: number) => dur / TIMELINE_MAX;

  const stopAt = view.stopAt;

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left - PAD) / (rect.width - PAD)));
    onScrub(ratio * TIMELINE_MAX);
  };

  const renderBlock = (row: Row) => {
    const node = nodeByNo.get(row.no)!;
    const device = DEVICES.find((d) => d.id === row.deviceId);
    const cls =
      row.status === "assigned"
        ? "blk"
        : row.status === "reassigned"
          ? "blk blk-reassigned"
          : "blk blk-" + row.status;
    return (
      <button
        key={node.no}
        className={cls + (selectedNo === node.no ? " is-selected" : "")}
        style={{
          left: left(node.time),
          width: `calc((100% - ${PAD}px) * ${trackRatio(node.duration)})`,
          background: device ? device.color : undefined,
        }}
        title={`#${node.no} ${node.section} · ${node.model}｜点火 ${fmtTime(node.time)}｜持续 ${node.duration}s｜L${node.level}${
          row.deviceId ? `｜${row.deviceId}` : ""
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node.no);
        }}
      >
        <b>#{node.no}</b>
        {row.status === "reassigned" && <i>改</i>}
      </button>
    );
  };

  return (
    <div className="timeline" onClick={handleTrackClick}>
      <div className="tl-scale" style={{ paddingLeft: PAD }}>
        {ticks.map((t) => (
          <span key={t} style={{ left: `${(t / TIMELINE_MAX) * 100}%` }}>
            {fmtTick(t)}
          </span>
        ))}
      </div>

      {DEVICES.map((d) => {
        const rows = view.rows.filter((r) => r.deviceId === d.id);
        return (
          <div className="tl-lane" key={d.id}>
            <div className="tl-label" style={{ color: d.color }}>
              <b>{d.id}</b>
              <small>{d.cooldown}s / {d.capacity}kW</small>
            </div>
            <div className="tl-track">
              {ticks.map((t) => (
                <i key={t} className="tl-gridline" style={{ left: `${(t / TIMELINE_MAX) * 100}%` }} />
              ))}
              {rows.map(renderBlock)}
            </div>
          </div>
        );
      })}

      <div className="tl-lane">
        <div className="tl-label tl-label-muted">
          <b>待派</b>
          <small>等待 / 停止</small>
        </div>
        <div className="tl-track tl-track-pending">
          {ticks.map((t) => (
            <i key={t} className="tl-gridline" style={{ left: `${(t / TIMELINE_MAX) * 100}%` }} />
          ))}
          {view.rows
            .filter((r) => r.status === "waiting" || r.status === "blocked")
            .map(renderBlock)}
        </div>
      </div>

      {stopAt !== null && (
        <div className="tl-stop" style={{ left: left(stopAt) }} title={`${view.stopReason} @${fmtTime(stopAt)}`}>
          <span>⛔ {fmtTime(stopAt)}</span>
        </div>
      )}
      <div className="tl-playhead" style={{ left: left(playhead) }} />
    </div>
  );
}
