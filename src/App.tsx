import { useEffect, useMemo, useRef, useState } from "react";
import "./styles.css";
import { DEVICES, NODES } from "./data";
import { buildBaseline, buildView } from "./scheduler";
import DeviceRack from "./components/DeviceRack";
import Timeline from "./components/Timeline";
import ExecutionSheet from "./components/ExecutionSheet";
import SiteMap from "./components/SiteMap";
import ConflictPanel from "./components/ConflictPanel";
import Preview from "./components/Preview";

const baseline = buildBaseline(NODES);

export default function App() {
  const [disabled, setDisabled] = useState<Set<string>>(new Set());
  const [selectedNo, setSelectedNo] = useState<number | null>(baseline.conflict?.no ?? null);
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  const view = useMemo(() => buildView(NODES, baseline, disabled), [disabled]);

  // 停用集合变化后，播放头越过新停止点则回收到停止点
  useEffect(() => {
    if (view.stopAt !== null && playhead > view.stopAt) setPlayhead(view.stopAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.stopAt]);

  const stopReached = view.stopAt !== null && playhead >= view.stopAt - 1e-6;

  useEffect(() => {
    if (!playing) {
      lastTsRef.current = null;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      return;
    }
    // 播放到第一处无法供电 / 等待改派的位置即停
    if (stopReached) {
      setPlaying(false);
      return;
    }
    const tick = (ts: number) => {
      if (lastTsRef.current === null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      setPlayhead((t) => {
        const next = t + dt;
        if (view.stopAt !== null && next >= view.stopAt) {
          setPlaying(false);
          return view.stopAt;
        }
        return next;
      });
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, playhead, stopReached, view.stopAt]);

  const toggleDevice = (id: string) => {
    setDisabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const scrub = (t: number) => {
    setPlaying(false);
    setPlayhead(view.stopAt !== null ? Math.min(t, view.stopAt) : t);
  };

  const assignedCount = view.rows.filter((r) => r.status === "assigned" || r.status === "reassigned").length;
  const waitingCount = view.rows.filter((r) => r.status === "waiting").length;
  const offCount = disabled.size;

  return (
    <main className="app">
      <section className="hero">
        <p>hxyfront-62008 · 设备排程工作台 · Port 62008</p>
        <h1>烟花燃放脚本编排 · 点火器设备排程</h1>
        <span>
          编排师不再靠纸笔：节点按点火时刻逐发排入，系统在四台点火器中选择“冷却已结束且叠加后不超总功率档位”的第一台设备；
          找不到可用设备即停在冲突节点并列出各设备占用时段。停用设备后，受影响发次进入改派，其余派工顺序保持不动。
        </span>
      </section>

      <section className="metrics">
        <article>
          <small>点火节点（发次）</small>
          <strong>{NODES.length}</strong>
        </article>
        <article>
          <small>已排入 / 改派</small>
          <strong>{assignedCount}</strong>
        </article>
        <article>
          <small>等待改派</small>
          <strong className={waitingCount ? "warn" : ""}>{waitingCount}</strong>
        </article>
        <article>
          <small>停用设备</small>
          <strong className={offCount ? "warn" : ""}>{offCount}/4</strong>
        </article>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>设备资源</p>
            <h2>四台点火器 · 冷却时间 / 供电档位</h2>
          </div>
          {disabled.size > 0 && (
            <button onClick={() => setDisabled(new Set())}>全部启用</button>
          )}
        </div>
        <DeviceRack disabled={disabled} onToggle={toggleDevice} view={view} />
      </section>

      {view.diagnosis && (
        <ConflictPanel
          diagnosis={view.diagnosis}
          disabled={disabled}
          selectedNo={selectedNo}
          onSelect={setSelectedNo}
        />
      )}

      <section className="panel">
        <div className="heading">
          <div>
            <p>时间轴编排</p>
            <h2>设备占用甘特图</h2>
          </div>
          <span className="legend">
            {DEVICES.map((d) => (
              <i key={d.id} style={{ ["--c" as string]: d.color }}>
                {d.id}
              </i>
            ))}
            <i className="legend-stop">⛔ 排程停止</i>
          </span>
        </div>
        <Timeline
          view={view}
          playhead={playhead}
          selectedNo={selectedNo}
          onSelect={setSelectedNo}
          onScrub={scrub}
        />
      </section>

      <section className="split">
        <section className="panel">
          <div className="heading">
            <div>
              <p>执行单</p>
              <h2>发次 → 设备编号</h2>
            </div>
          </div>
          <ExecutionSheet rows={view.rows} selectedNo={selectedNo} onSelect={setSelectedNo} />
        </section>

        <section className="panel">
          <div className="heading">
            <div>
              <p>点位图</p>
              <h2>燃放点位平面图</h2>
            </div>
          </div>
          <SiteMap rows={view.rows} selectedNo={selectedNo} onSelect={setSelectedNo} playhead={playhead} />
          <div className="map-legend">
            <span><i className="dot dot-assigned" />已排入</span>
            <span><i className="dot dot-reassigned" />已改派</span>
            <span><i className="dot dot-waiting" />等待改派</span>
            <span><i className="dot dot-blocked" />停止未排入</span>
          </div>
        </section>
      </section>

      <Preview
        view={view}
        playhead={playhead}
        playing={playing}
        onPlayPause={() => {
          if (stopReached) {
            setPlayhead(0);
            setPlaying(true);
          } else {
            setPlaying((p) => !p);
          }
        }}
        onReset={() => {
          setPlaying(false);
          setPlayhead(0);
        }}
        onScrub={scrub}
      />
    </main>
  );
}
