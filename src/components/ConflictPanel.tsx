import { DEVICES, LEVEL_LABEL } from "../data";
import type { Diagnosis } from "../types";
import { fmtTime } from "../utils";

interface Props {
  diagnosis: Diagnosis;
  disabled: Set<string>;
  selectedNo: number | null;
  onSelect: (no: number) => void;
}

/** 冲突诊断：停在无法供电的节点，逐台说明占用时段 */
export default function ConflictPanel({ diagnosis, disabled, selectedNo, onSelect }: Props) {
  const c = diagnosis.conflict;
  const active = selectedNo === c.no;
  return (
    <section className={"panel conflict" + (active ? " is-selected" : "")} onClick={() => onSelect(c.no)}>
      <div className="conflict-head">
        <span className="conflict-badge">⛔ 排程停止</span>
        <div>
          <h2>
            #{c.no} 无法供电 · {fmtTime(c.time)}
          </h2>
          <p>
            持续 {c.duration.toFixed(1)}s · {LEVEL_LABEL[c.level]}（需 {c.kw}kW）—
            冷却结束且不超总功率的点火器为 0 台，排程在此节点停止。
          </p>
        </div>
      </div>

      <div className="conflict-grid">
        {DEVICES.map((d) => {
          const off = disabled.has(d.id);
          const st = diagnosis.states[d.id];
          return (
            <article key={d.id} className={"occ" + (off ? " is-off" : "")} style={{ borderLeftColor: d.color }}>
              <header>
                <span className="dev-tag" style={{ background: off ? "#94a3b8" : d.color }}>
                  {d.id}
                </span>
                <b>{d.name}</b>
              </header>
              <p className="occ-reason">{diagnosis.reasons[d.id]}</p>
              <dl>
                <div>
                  <dt>档位 / 冷却</dt>
                  <dd>
                    {d.capacity}kW · {d.cooldown}s
                  </dd>
                </div>
                <div>
                  <dt>冲突时刻功率</dt>
                  <dd className={st.loadAt > d.capacity ? "over" : ""}>
                    {st.loadAt}kW
                  </dd>
                </div>
              </dl>
              <div className="occ-list">
                <small>设备占用时段（{fmtTime(c.time)} 时）：</small>
                {st.covering.length === 0 ? (
                  <p className="occ-empty">无并发占用</p>
                ) : (
                  st.covering.map((w) => (
                    <span key={w.no} className="occ-chip" onClick={(e) => { e.stopPropagation(); onSelect(w.no); }}>
                      #{w.no} {fmtTime(w.s)}–{fmtTime(w.e)} · {w.kw}kW
                    </span>
                  ))
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
