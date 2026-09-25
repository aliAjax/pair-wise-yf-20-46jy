import { DEVICES, NODES, TIMELINE_MAX } from "../data";
import type { ScheduleView } from "../types";
import { fmtTime } from "../utils";

interface Props {
  view: ScheduleView;
  playhead: number;
  playing: boolean;
  onPlayPause: () => void;
  onReset: () => void;
  onScrub: (t: number) => void;
}

/** 整场节目预览：播放到第一处无法供电（或等待改派）的位置 */
export default function Preview({ view, playhead, playing, onPlayPause, onReset, onScrub }: Props) {
  const stop = view.stopAt;
  const reached = stop !== null && playhead >= stop - 1e-6;
  const firing = NODES.filter((n) => playhead >= n.time && playhead < n.time + n.duration);
  const devIds = [...new Set(firing.map((n) => view.rows.find((r) => r.no === n.no)?.deviceId).filter(Boolean))];

  return (
    <section className="panel preview">
      <div className="preview-main">
        <div className={"preview-stage" + (reached ? " is-stopped" : "")}>
          <div className="preview-sky">
            {firing.map((n) => {
              const row = view.rows.find((r) => r.no === n.no)!;
              const device = DEVICES.find((d) => d.id === row.deviceId);
              return (
                <span
                  key={n.no}
                  className="preview-burst"
                  style={{
                    left: `${n.x}%`,
                    top: `${100 - n.y}%`,
                    background: device?.color ?? "#94a3b8",
                  }}
                />
              );
            })}
            {reached && (
              <div className="preview-stopcard">
                <b>⛔ {view.stopReason}</b>
                <span>预览在 {fmtTime(stop!)} 停止 — 请查看冲突诊断或改派设备</span>
              </div>
            )}
          </div>
          <div className="preview-clock">{fmtTime(playhead)}</div>
        </div>

        <div className="preview-side">
          <h3>预览控制</h3>
          <div className="preview-buttons">
            <button className="primary" onClick={onPlayPause} disabled={reached && !playing}>
              {playing ? "暂停" : reached ? "已停止" : "播放"}
            </button>
            <button onClick={onReset}>回到起点</button>
          </div>
          <input
            type="range"
            min={0}
            max={TIMELINE_MAX}
            step={0.1}
            value={Math.min(playhead, TIMELINE_MAX)}
            onChange={(e) => onScrub(Number(e.target.value))}
          />
          <dl className="preview-state">
            <div>
              <dt>当前点火</dt>
              <dd>{firing.length ? firing.map((n) => "#" + n.no).join(" ") : "—"}</dd>
            </div>
            <div>
              <dt>工作设备</dt>
              <dd>{devIds.length ? devIds.join(" / ") : "—"}</dd>
            </div>
            <div>
              <dt>停止位置</dt>
              <dd className={stop !== null ? "over" : ""}>
                {stop !== null ? `${fmtTime(stop)} · ${view.stopReason}` : "无（全场可播）"}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
