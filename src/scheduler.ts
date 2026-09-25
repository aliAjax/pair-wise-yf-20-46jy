import { fmtTime, Igniter, ShotNode } from "./data";

export interface DeviceBusyView {
  deviceId: number;
  enabled: boolean;
  intervals: { nodeId: string; start: number; end: number }[];
  cooldownUntil: number | null; // 最后一发结束 + 冷却时间
}

export interface ConflictInfo {
  nodeId: string;
  reasons: { deviceId: number; reason: string }[];
  busy: DeviceBusyView[];
}

export interface ScheduleResult {
  assignments: Record<string, number>; // 发次 id -> 设备编号
  pending: string[]; // 未排入的发次（等待改派 / 冲突之后的节点）
  conflict: ConflictInfo | null;
}

/**
 * 校验 node 能否排上 device（基于该设备已占用的 placed）。
 * 返回 null 表示可排入，否则返回不可排入的原因说明。
 */
export function placeReason(
  node: ShotNode,
  device: Igniter,
  placed: ShotNode[]
): string | null {
  if (!device.enabled) return "设备已停用";
  const s = node.start;
  const e = node.start + node.duration;
  let concurrent = node.load;

  for (const m of placed) {
    const ms = m.start;
    const me = m.start + m.duration;
    if (s < me && ms < e) {
      // 时段重叠：不计冷却，但耗电级别叠加
      concurrent += m.load;
    } else if (me <= s) {
      const coolUntil = me + device.cooldown;
      if (s < coolUntil) {
        return `冷却未结束：${m.id} 占用至 ${fmtTime(me)}，冷却至 ${fmtTime(coolUntil)}`;
      }
    } else {
      const coolUntil = e + device.cooldown;
      if (ms < coolUntil) {
        return `影响下一发：${m.id} ${fmtTime(ms)} 点火，本发结束后需冷却至 ${fmtTime(coolUntil)}`;
      }
    }
  }

  if (concurrent > device.gear) {
    return `同时段耗电 ${concurrent} 级，超过供电档位 ${device.gear} 级`;
  }
  return null;
}

function busyView(
  device: Igniter,
  placed: ShotNode[]
): DeviceBusyView {
  const intervals = placed
    .map((m) => ({ nodeId: m.id, start: m.start, end: m.start + m.duration }))
    .sort((a, b) => a.start - b.start);
  const lastEnd = intervals.length
    ? Math.max(...intervals.map((i) => i.end))
    : null;
  return {
    deviceId: device.id,
    enabled: device.enabled,
    intervals,
    cooldownUntil: lastEnd == null ? null : lastEnd + device.cooldown,
  };
}

/**
 * 设备排程：按点火时刻依次排入。
 * - kept 中仍然合法（设备启用且约束满足）的指派原样保留，其余顺序不动；
 * - 其余节点按设备编号顺序，选择首台冷却结束且不超过总功率的点火器；
 * - 找不到设备时停在冲突节点，并快照各设备占用时段。
 */
export function runSchedule(
  nodes: ShotNode[],
  devices: Igniter[],
  kept: Record<string, number>
): ScheduleResult {
  const sorted = [...nodes].sort(
    (a, b) => a.start - b.start || a.id.localeCompare(b.id)
  );
  const byId = new Map(devices.map((d) => [d.id, d]));
  const eligible = devices
    .filter((d) => d.enabled)
    .sort((a, b) => a.id - b.id);

  const assignments: Record<string, number> = {};
  const placedByDevice = new Map<number, ShotNode[]>();
  const placedOn = (id: number): ShotNode[] => placedByDevice.get(id) ?? [];

  const place = (node: ShotNode, deviceId: number) => {
    assignments[node.id] = deviceId;
    const list = placedByDevice.get(deviceId) ?? [];
    list.push(node);
    placedByDevice.set(deviceId, list);
  };

  let conflict: ConflictInfo | null = null;
  let halted = false; // 冲突后停止新的排入，但既有指派继续保留

  for (const node of sorted) {
    // 1) 既有指派仍合法则保留（其余顺序不动，不受冲突停摆影响）
    const keptId = kept[node.id];
    if (keptId != null) {
      const dev = byId.get(keptId);
      if (dev && !placeReason(node, dev, placedOn(keptId))) {
        place(node, keptId);
        continue;
      }
    }

    if (halted) continue; // 冲突之后的待排节点保持等待

    // 2) 按编号顺序选择首台可排入的点火器
    const dev = eligible.find((d) => !placeReason(node, d, placedOn(d.id)));
    if (dev) {
      place(node, dev.id);
      continue;
    }

    // 3) 没有可用设备：停在冲突节点，说明各设备占用时段
    conflict = {
      nodeId: node.id,
      reasons: devices.map((d) => ({
        deviceId: d.id,
        reason: placeReason(node, d, placedOn(d.id)) ?? "可排入",
      })),
      busy: devices.map((d) => busyView(d, placedOn(d.id))),
    };
    halted = true;
  }

  const pending = sorted
    .filter((n) => assignments[n.id] == null && n.id !== conflict?.nodeId)
    .map((n) => n.id);

  return { assignments, pending, conflict };
}
