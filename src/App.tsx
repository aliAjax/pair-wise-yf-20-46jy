import { useEffect, useMemo, useRef, useState } from "react";
import "./styles.css";
import {
  deviceColor,
  fmtTime,
  initialDevices,
  initialNodes,
  Igniter,
  ShotNode,
} from "./data";
import { runSchedule, ScheduleResult } from "./scheduler";

const PLAY_SPEED = 6; // 预览倍速

let nodeSeq = initialNodes.length;

interface NodeForm {
  label: string;
  segment: string;
  start: string;
  duration: string;
  load: string;
}

const emptyForm: NodeForm = { label: "", segment: "", start: "", duration: "", load: "" };

function App() {
  const [devices, setDevices] = useState<Igniter[]>(initialDevices);
  const [nodes, setNodes] = useState<ShotNode[]>(initialNodes);
  const [schedule, setSchedule] = useState<ScheduleResult>(() =>
    runSchedule(initialNodes, initialDevices, {})
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [playT, setPlayT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [form, setForm] = useState<NodeForm>(emptyForm);

  const playRef = useRef(0);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  const sortedNodes = useMemo(
    () => [...nodes].sort((a, b) => a.start - b.start || a.id.localeCompare(b.id)),
    [nodes]
  );
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const deviceById = useMemo(() => new Map(devices.map((d) => [d.id, d])), [devices]);

  const timelineEnd = useMemo(
    () => Math.max(1, ...nodes.map((n) => n.start + n.duration)),
    [nodes]
  );

  // 未排入 = 等待改派 + 冲突节点，最早的一处即「第一处无法供电的位置」
  const unpoweredNodes = sortedNodes.filter((n) => schedule.assignments[n.id] == null);
  const firstUnpowered = unpoweredNodes.length ? unpoweredNodes[0].start : Infinity;
  const playableUntil = Math.min(firstUnpowered, timelineEnd);

  // ---- 排程动作 ----

  /** 执行排程：保留仍合法的既有指派（其余顺序不动），依次为等待中的发次改派 */
  const reschedule = (devs: Igniter[] = devices, nds: ShotNode[] = nodes) => {
    setSchedule(runSchedule(nds, devs, schedule.assignments));
  };

  /** 停用：受影响节点等待改派，其余指派不动；启用：等待下次排程 */
  const toggleDevice = (id: number) => {
    const dev = devices.find((d) => d.id === id);
    if (!dev) return;
    setDevices(devices.map((d) => (d.id === id ? { ...d, enabled: !d.enabled } : d)));
    if (dev.enabled) {
      const assignments = { ...schedule.assignments };
      const affected = Object.keys(assignments).filter((n) => assignments[n] === id);
      affected.forEach((n) => delete assignments[n]);
      setSchedule({
        assignments,
        pending: [...new Set([...schedule.pending, ...affected])],
        conflict: schedule.conflict,
      });
    }
  };

  const updateDevice = (id: number, patch: Partial<Igniter>) => {
    setDevices(devices.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };

  const addNode = () => {
    const start = Number(form.start);
    const duration = Number(form.duration);
    const load = Number(form.load);
    if (!form.label.trim() || !(start >= 0) || !(duration > 0) || !(load >= 1)) return;
    nodeSeq += 1;
    const id = `S${String(nodeSeq).padStart(2, "0")}`;
    const node: ShotNode = {
      id,
      label: form.label.trim(),
      segment: form.segment.trim() || "未分段",
      start,
      duration,
      load,
      x: 12 + ((nodeSeq * 13) % 76),
      y: 16 + ((nodeSeq * 17) % 44),
    };
    setNodes([...nodes, node]);
    setSchedule((s) => ({ ...s, pending: [...s.pending, id] }));
    setForm(emptyForm);
  };

  // ---- 预览播放 ----

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const nt = Math.min(playRef.current + dt * PLAY_SPEED, playableUntil);
      playRef.current = nt;
      setPlayT(nt);
      if (nt >= playableUntil) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, playableUntil]);

  // 排程变化导致可供电区间缩短时，回收播放头
  useEffect(() => {
    if (playRef.current > playableUntil) {
      playRef.current = playableUntil;
      setPlayT(playableUntil);
      setPlaying(false);
    }
  }, [playableUntil]);

  const togglePlay = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (playRef.current >= playableUntil - 1e-6) {
      playRef.current = 0;
      setPlayT(0);
    }
    setPlaying(true);
  };

  /** 点位图定位发次：选中并滚动到执行单对应行 */
  const locate = (id: string) => {
    setSelected(id);
    rowRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const activeShots = sortedNodes.filter(
    (n) => n.start <= playT && playT < n.start + n.duration
  );

  const pendingCount = schedule.pending.length + (schedule.conflict ? 1 : 0);
  const segments = new Set(nodes.map((n) => n.segment)).size;
  const pct = (t: number) => `${(t / timelineEnd) * 100}%`;
  const ticks: number[] = [];
  for (let t = 0; t <= timelineEnd; t += 30) ticks.push(t);

  return (
    <main className="app">
      <section className="hero">
        <p>hxyfront-62008 · 设备排程工作台 · Port 62008</p>
        <h1>烟花燃放脚本编排</h1>
        <span>
          编排师不再靠纸笔分派点火器：四台点火器各有冷却时间与供电档位，发次带点火时刻、
          持续时长与耗电级别。排程自动选择冷却结束且不超总功率的点火器，冲突时停下并说明
          各设备占用时段；执行单列出设备编号，点位图可定位发次，预览播放到第一处无法供电的位置。
        </span>
      </section>

      <section className="metrics">
        <article>
          <small>节目段落</small>
          <strong>{segments}</strong>
        </article>
        <article>
          <small>点火节点</small>
          <strong>{nodes.length}</strong>
        </article>
        <article>
          <small>等待改派</small>
          <strong>{schedule.pending.length}</strong>
        </article>
        <article>
          <small>冲突提示</small>
          <strong>{schedule.conflict ? 1 : 0}</strong>
        </article>
      </section>

      {schedule.conflict &&
        (() => {
          const c = schedule.conflict!;
          const n = nodeById.get(c.nodeId)!;
          return (
            <section className="panel conflict-panel">
              <h2>
                排程冲突：{n.id}「{n.label}」无法排入
              </h2>
              <p className="conflict-lead">
                点火时刻 {fmtTime(n.start)} · 持续 {n.duration}s · 耗电 {n.load}
                级。没有点火器同时满足「冷却结束」与「不超总功率」，排程停在该节点，
                后续发次等待处理。各设备占用时段如下：
              </p>
              <div className="busy-grid">
                {c.busy.map((b) => {
                  const d = deviceById.get(b.deviceId)!;
                  const reason = c.reasons.find((r) => r.deviceId === b.deviceId)?.reason;
                  return (
                    <article key={b.deviceId} className="busy-card">
                      <h3>
                        <i style={{ background: deviceColor(b.deviceId) }} />
                        {d.name}
                        {!b.enabled && <em>（已停用）</em>}
                      </h3>
                      <p className="reason">{reason}</p>
                      <ul>
                        {b.intervals.length === 0 && <li>暂无占用</li>}
                        {b.intervals.map((iv) => (
                          <li key={iv.nodeId}>
                            {iv.nodeId} {fmtTime(iv.start)}–{fmtTime(iv.end)}
                          </li>
                        ))}
                      </ul>
                      {b.cooldownUntil != null && (
                        <p className="cool">冷却至 {fmtTime(b.cooldownUntil)}</p>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })()}

      <section className="panel">
        <div className="heading">
          <div>
            <p>设备排程</p>
            <h2>点火器设备</h2>
          </div>
          <button className="primary" onClick={() => reschedule()}>
            执行排程{pendingCount > 0 ? `（${pendingCount} 发待排）` : ""}
          </button>
        </div>
        <div className="device-grid">
          {devices.map((d) => {
            const shots = sortedNodes.filter((n) => schedule.assignments[n.id] === d.id);
            return (
              <article key={d.id} className={`device-card${d.enabled ? "" : " disabled"}`}>
                <header>
                  <i style={{ background: deviceColor(d.id) }} />
                  <h3>{d.name}</h3>
                  <button onClick={() => toggleDevice(d.id)}>
                    {d.enabled ? "停用" : "启用"}
                  </button>
                </header>
                <div className="device-params">
                  <label>
                    <span>冷却时间（秒）</span>
                    <input
                      type="number"
                      min={0}
                      value={d.cooldown}
                      onChange={(e) =>
                        updateDevice(d.id, { cooldown: Math.max(0, Number(e.target.value) || 0) })
                      }
                    />
                  </label>
                  <label>
                    <span>供电档位（级）</span>
                    <input
                      type="number"
                      min={1}
                      value={d.gear}
                      onChange={(e) =>
                        updateDevice(d.id, { gear: Math.max(1, Number(e.target.value) || 1) })
                      }
                    />
                  </label>
                </div>
                <ul className="device-shots">
                  {shots.length === 0 && <li>{d.enabled ? "暂无排入发次" : "已停用，发次等待改派"}</li>}
                  {shots.map((n) => (
                    <li key={n.id}>
                      {n.id} {fmtTime(n.start)}–{fmtTime(n.start + n.duration)}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
        <p className="hint">
          排入规则：按点火时刻依次安排，选择编号最小、冷却结束且同时段耗电合计不超供电档位的点火器；
          修改参数或新增发次后，点击「执行排程」重新校验，仍合法的指派保持不动。
        </p>
      </section>

      <section className="board">
        <div className="panel">
          <div className="heading">
            <div>
              <p>燃放点位平面图</p>
              <h2>点位图</h2>
            </div>
          </div>
          <svg viewBox="0 0 100 60" className="site-map">
            <rect x="2" y="2" width="96" height="50" rx="2" className="site-bound" />
            <text x="50" y="57.5" className="site-note" textAnchor="middle">
              燃放阵地 · 观众区在下方 · 点击点位可定位发次
            </text>
            {sortedNodes.map((n) => {
              const dev = schedule.assignments[n.id];
              const isConflict = schedule.conflict?.nodeId === n.id;
              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x}, ${4 + n.y * 0.48})`}
                  className={`site-point${selected === n.id ? " selected" : ""}`}
                  onClick={() => locate(n.id)}
                >
                  {selected === n.id && <circle r="3.6" className="site-ring" />}
                  <circle
                    r="2"
                    fill={isConflict ? "#dc2626" : deviceColor(dev)}
                    stroke={dev == null && !isConflict ? "#64748b" : "#ffffff"}
                    strokeWidth="0.5"
                    strokeDasharray={dev == null && !isConflict ? "1 0.8" : undefined}
                  />
                  <text y="-3.2" textAnchor="middle">
                    {n.id}
                  </text>
                </g>
              );
            })}
          </svg>
          <div className="legend">
            {devices.map((d) => (
              <span key={d.id}>
                <i style={{ background: deviceColor(d.id) }} />
                {d.id} 号{!d.enabled && "（停用）"}
              </span>
            ))}
            <span>
              <i style={{ background: "#94a3b8" }} />
              未排入
            </span>
          </div>
        </div>

        <div className="panel">
          <div className="heading">
            <div>
              <p>按点火时刻排序</p>
              <h2>执行单</h2>
            </div>
          </div>
          <div className="runsheet-wrap">
            <table className="runsheet">
              <thead>
                <tr>
                  <th>发次</th>
                  <th>段落</th>
                  <th>烟花</th>
                  <th>点火时刻</th>
                  <th>持续</th>
                  <th>耗电</th>
                  <th>设备编号</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {sortedNodes.map((n) => {
                  const dev = schedule.assignments[n.id];
                  const isConflict = schedule.conflict?.nodeId === n.id;
                  const status =
                    dev != null ? "已排入" : isConflict ? "冲突·无法供电" : "等待改派";
                  return (
                    <tr
                      key={n.id}
                      ref={(el) => {
                        rowRefs.current[n.id] = el;
                      }}
                      className={selected === n.id ? "selected" : ""}
                      onClick={() => setSelected(n.id)}
                    >
                      <td>{n.id}</td>
                      <td>{n.segment}</td>
                      <td>{n.label}</td>
                      <td>{fmtTime(n.start)}</td>
                      <td>{n.duration}s</td>
                      <td>{n.load} 级</td>
                      <td>
                        {dev != null ? (
                          <span
                            className="dev-badge"
                            style={{ background: deviceColor(dev) }}
                          >
                            {dev} 号
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <span
                          className={
                            dev != null
                              ? "status-ok"
                              : isConflict
                                ? "status-conflict"
                                : "status-pending"
                          }
                        >
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>整场预览</p>
            <h2>供电预览</h2>
          </div>
          <div className="preview-controls">
            <button className="primary" onClick={togglePlay}>
              {playing ? "暂停" : "播放"}
            </button>
            <span>
              {fmtTime(playT)} / {fmtTime(timelineEnd)}（{PLAY_SPEED}×）
            </span>
          </div>
        </div>
        {firstUnpowered !== Infinity ? (
          <p className="power-note warn">
            预览播放到第一处无法供电的位置 {fmtTime(firstUnpowered)}（{unpoweredNodes[0].id}「
            {unpoweredNodes[0].label}」）即停止。
          </p>
        ) : (
          <p className="power-note ok">全程可供电，预览至 {fmtTime(timelineEnd)}。</p>
        )}
        <div className="timeline">
          <div className="lane ruler">
            <div className="lane-label" />
            <div className="lane-track">
              {ticks.map((t) => (
                <span key={t} className="tick" style={{ left: pct(t) }}>
                  {fmtTime(t)}
                </span>
              ))}
            </div>
          </div>
          {devices.map((d) => (
            <div className="lane" key={d.id}>
              <div className="lane-label">
                <i style={{ background: deviceColor(d.id) }} />
                {d.id} 号 · 档位{d.gear}
                {!d.enabled && "（停用）"}
              </div>
              <div className="lane-track">
                {sortedNodes
                  .filter((n) => schedule.assignments[n.id] === d.id)
                  .map((n) => (
                    <div
                      key={n.id}
                      className="shot-block"
                      style={{
                        left: pct(n.start),
                        width: `max(${(n.duration / timelineEnd) * 100}%, 4px)`,
                        background: deviceColor(d.id),
                      }}
                      title={`${n.id} ${n.label} ${fmtTime(n.start)} 耗电${n.load}级`}
                      onClick={() => locate(n.id)}
                    />
                  ))}
              </div>
            </div>
          ))}
          <div className="lane">
            <div className="lane-label">
              <i style={{ background: "#94a3b8" }} />
              未排入
            </div>
            <div className="lane-track">
              {unpoweredNodes.map((n) => (
                <div
                  key={n.id}
                  className={`shot-block unassigned${
                    schedule.conflict?.nodeId === n.id ? " conflict" : ""
                  }`}
                  style={{
                    left: pct(n.start),
                    width: `max(${(n.duration / timelineEnd) * 100}%, 4px)`,
                  }}
                  title={`${n.id} ${n.label} ${fmtTime(n.start)} 耗电${n.load}级`}
                  onClick={() => locate(n.id)}
                />
              ))}
            </div>
          </div>
          <div className="timeline-overlay">
            {firstUnpowered !== Infinity && (
              <div
                className="unpowered-zone"
                style={{ left: pct(firstUnpowered) }}
              >
                <em>⚠ {fmtTime(firstUnpowered)} 起无法供电</em>
              </div>
            )}
            <div className="playhead" style={{ left: pct(playT) }} />
          </div>
        </div>
        <p className="now-playing">
          当前发次：
          {activeShots.length === 0
            ? "无"
            : activeShots
                .map((n) => {
                  const dev = schedule.assignments[n.id];
                  return `${n.id}「${n.label}」${dev != null ? ` · 点火器 ${dev} 号` : " · 未供电"}`;
                })
                .join("、")}
        </p>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>新增发次</p>
            <h2>录入节点</h2>
          </div>
          <button className="primary" onClick={addNode}>
            加入待排
          </button>
        </div>
        <div className="field-grid">
          <label>
            <span>烟花名称</span>
            <input
              placeholder="如：红闪礼花弹"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
          </label>
          <label>
            <span>节目段落</span>
            <input
              placeholder="如：Chorus B"
              value={form.segment}
              onChange={(e) => setForm({ ...form, segment: e.target.value })}
            />
          </label>
          <label>
            <span>点火时刻（秒）</span>
            <input
              type="number"
              min={0}
              step={0.1}
              placeholder="如 95.5"
              value={form.start}
              onChange={(e) => setForm({ ...form, start: e.target.value })}
            />
          </label>
          <label>
            <span>持续时长（秒）</span>
            <input
              type="number"
              min={0.1}
              step={0.1}
              placeholder="如 4"
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
            />
          </label>
          <label>
            <span>耗电级别（级）</span>
            <input
              type="number"
              min={1}
              placeholder="如 3"
              value={form.load}
              onChange={(e) => setForm({ ...form, load: e.target.value })}
            />
          </label>
        </div>
        <p className="hint">新发次先进入「等待改派」，点击「执行排程」后按规则排入点火器。</p>
      </section>
    </main>
  );
}

export default App;
