import { DEVICES, LEVEL_KW } from "../data";
import type { ScheduleView } from "../types";

interface Props {
  disabled: Set<string>;
  onToggle: (id: string) => void;
  view: ScheduleView;
}

/** 设备架：四台点火器的冷却时间、供电档位与停用开关 */
export default function DeviceRack({ disabled, onToggle, view }: Props) {
  return (
    <div className="rack">
      {DEVICES.map((d) => {
        const off = disabled.has(d.id);
        const used = view.wins[d.id].length;
        const maxKw = d.capacity;
        return (
          <article
            key={d.id}
            className={"device-card" + (off ? " is-off" : "")}
            style={{ borderTopColor: d.color }}
          >
            <div className="device-head">
              <div className="device-id">
                <span className="device-badge" style={{ background: d.color }}>
                  {d.id}
                </span>
                <div>
                  <h3>{d.name}</h3>
                  <small>编号 {d.id}</small>
                </div>
              </div>
              <button
                className={"switch" + (off ? "" : " is-on")}
                onClick={() => onToggle(d.id)}
                aria-pressed={!off}
                title={off ? "点击重新启用" : "点击停用该设备"}
              >
                <span />
                {off ? "停用" : "在用"}
              </button>
            </div>
            <dl className="device-spec">
              <div>
                <dt>冷却时间</dt>
                <dd>{d.cooldown.toFixed(1)}s</dd>
              </div>
              <div>
                <dt>供电档位</dt>
                <dd>{maxKw}kW</dd>
              </div>
              <div>
                <dt>承接发次</dt>
                <dd>{used} 发</dd>
              </div>
            </dl>
            <div className="device-scale">
              {[1, 2, 3].map((lv) => {
                const kw = LEVEL_KW[lv as 1 | 2 | 3];
                return (
                  <span
                    key={lv}
                    className={kw <= maxKw ? "ok" : "no"}
                    title={`L${lv}=${kw}kW，${kw <= maxKw ? "可承接" : "单独使用也超档"}`}
                  >
                    L{lv} {kw}kW
                  </span>
                );
              })}
            </div>
          </article>
        );
      })}
    </div>
  );
}
