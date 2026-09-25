import { DEVICES, LEVEL_KW } from "./data";
import type {
  Baseline,
  ConflictInfo,
  Diagnosis,
  FireNode,
  Row,
  ScheduleView,
  Win,
} from "./types";

/** 计算在 [t0,t1) 内，已有窗口叠加 addKw 后的峰值功率 */
function peakLoad(wins: Win[], t0: number, t1: number, addKw: number): number {
  const events: Array<[number, number]> = [
    [t0, addKw],
    [t1, -addKw],
  ];
  for (const w of wins) {
    const s = Math.max(w.s, t0);
    const e = Math.min(w.e, t1);
    if (s < e) {
      events.push([s, w.kw]);
      events.push([e, -w.kw]);
    }
  }
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let cur = 0;
  let peak = 0;
  for (const [, delta] of events) {
    cur += delta;
    peak = Math.max(peak, cur);
  }
  return peak;
}

interface FitCheck {
  ok: boolean;
  reason?: string;
}

/** 冷却：与设备上任一发次点火时刻的间隔都不小于冷却时间；功率：叠加后不超档位 */
function canFit(
  deviceId: string,
  wins: Win[],
  time: number,
  duration: number,
  kw: number,
): FitCheck {
  const device = DEVICES.find((d) => d.id === deviceId)!;
  for (const w of wins) {
    if (Math.abs(w.s - time) < device.cooldown - 1e-9) {
      return {
        ok: false,
        reason: `冷却不足（与#${w.no}间隔${Math.abs(w.s - time).toFixed(1)}s＜${device.cooldown}s）`,
      };
    }
  }
  const peak = peakLoad(wins, time, time + duration, kw);
  if (peak > device.capacity) {
    return { ok: false, reason: `并发功率 ${peak}kW ＞ 档位 ${device.capacity}kW` };
  }
  return { ok: true };
}

/**
 * 基线排程（纸笔方案）：按点火时刻逐发选择第一台
 * “冷却已结束且叠加后不超总功率”的点火器；找不到就停在冲突节点。
 */
export function buildBaseline(nodes: FireNode[]): Baseline {
  const wins: Record<string, Win[]> = Object.fromEntries(
    DEVICES.map((d) => [d.id, []]),
  );
  const assign: Record<number, string> = {};
  let conflict: ConflictInfo | null = null;

  for (const node of nodes) {
    if (conflict) break;
    const kw = LEVEL_KW[node.level];
    let chosen: string | null = null;
    for (const device of DEVICES) {
      const check = canFit(device.id, wins[device.id], node.time, node.duration, kw);
      if (check.ok) {
        chosen = device.id;
        break;
      }
    }
    if (chosen) {
      assign[node.no] = chosen;
      wins[chosen].push({ no: node.no, s: node.time, e: node.time + node.duration, kw });
    } else {
      conflict = {
        no: node.no,
        time: node.time,
        duration: node.duration,
        level: node.level,
        kw,
      };
    }
  }

  return { assign, wins, conflict };
}

/**
 * 当前停用集合下的有效排程视图：
 * - 未停用设备上的节点保持原派工，顺序不动；
 * - 原设备停用的节点进入改派池，按发次顺序找第一台可承接的设备；
 * - 找不到则“等待改派”；
 * - 基线冲突节点及其后节点为“未排入（停止）”。
 */
export function buildView(nodes: FireNode[], baseline: Baseline, disabled: Set<string>): ScheduleView {
  const wins: Record<string, Win[]> = Object.fromEntries(
    DEVICES.map((d) => [d.id, baseline.wins[d.id].map((w) => ({ ...w }))]),
  );
  const rows: Row[] = nodes.map((node) => ({
    no: node.no,
    status: "blocked",
    deviceId: null,
    baselineDeviceId: baseline.assign[node.no] ?? null,
  }));
  const rowByNo = new Map(rows.map((r) => [r.no, r]));

  // 撤下停用设备上的基线占用；其余占用保留
  for (const [noStr, deviceId] of Object.entries(baseline.assign)) {
    const no = Number(noStr);
    if (disabled.has(deviceId)) {
      wins[deviceId] = wins[deviceId].filter((w) => w.no !== no);
      rowByNo.get(no)!.status = "waiting";
    } else {
      const row = rowByNo.get(no)!;
      row.status = "assigned";
      row.deviceId = deviceId;
    }
  }

  // 改派：按发次顺序逐发尝试，只在保留的占用上叠加
  for (const node of nodes) {
    const row = rowByNo.get(node.no)!;
    if (row.status !== "waiting") continue;
    const kw = LEVEL_KW[node.level];
    const why: Record<string, string> = {};
    let target: string | null = null;
    for (const device of DEVICES) {
      if (disabled.has(device.id)) {
        why[device.id] = "已停用";
        continue;
      }
      const check = canFit(device.id, wins[device.id], node.time, node.duration, kw);
      if (check.ok) {
        target = device.id;
        break;
      }
      why[device.id] = check.reason!;
    }
    if (target) {
      wins[target].push({ no: node.no, s: node.time, e: node.time + node.duration, kw });
      row.deviceId = target;
      row.status = "reassigned";
    } else {
      row.why = why;
    }
  }

  // 冲突节点诊断（设备占用时段）
  let diagnosis: Diagnosis | null = null;
  if (baseline.conflict) {
    const c = baseline.conflict;
    const reasons: Record<string, string> = {};
    const states = Object.fromEntries(
      DEVICES.map((d) => {
        const mine = wins[d.id];
        const covering = mine.filter((w) => c.time >= w.s && c.time < w.e);
        const busyUntil = mine.reduce((max, w) => Math.max(max, w.e), 0);
        return [
          d.id,
          {
            wins: mine,
            covering,
            loadAt: covering.reduce((sum, w) => sum + w.kw, 0),
            busyUntil,
          },
        ];
      }),
    ) as Diagnosis["states"];
    for (const device of DEVICES) {
      if (disabled.has(device.id)) {
        reasons[device.id] = "已停用";
      } else {
        const check = canFit(device.id, wins[device.id], c.time, c.duration, c.kw);
        reasons[device.id] = check.ok ? "可承接" : check.reason!;
      }
    }
    diagnosis = { conflict: c, reasons, states };
  }

  // 预览停止位置：等待改派节点与无法供电节点中的最早点火时刻
  const waitingTimes = nodes
    .filter((n) => rowByNo.get(n.no)!.status === "waiting")
    .map((n) => n.time);
  let stopAt: number | null = null;
  let stopReason: ScheduleView["stopReason"] = null;
  if (waitingTimes.length > 0) {
    stopAt = Math.min(...waitingTimes);
    stopReason = "等待改派";
  }
  if (baseline.conflict && (stopAt === null || baseline.conflict.time < stopAt)) {
    stopAt = baseline.conflict.time;
    stopReason = "无法供电";
  }

  return { rows, wins, diagnosis, stopAt, stopReason };
}
