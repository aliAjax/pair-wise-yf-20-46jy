export interface Igniter {
  id: number; // 设备编号
  name: string;
  cooldown: number; // 冷却时间（秒）：一发结束后到下一发点火的最小间隔
  gear: number; // 供电档位（总功率级）：同时段耗电级别合计不得超过该值
  enabled: boolean; // 停用后其节点进入等待改派
}

export interface ShotNode {
  id: string; // 发次编号，如 S01
  label: string;
  segment: string; // 节目段落
  start: number; // 点火时刻（秒）
  duration: number; // 持续时长（秒）
  load: number; // 耗电级别
  x: number; // 点位图横坐标（%）
  y: number; // 点位图纵坐标（%）
}

export const DEVICE_COLORS = ["#1d4ed8", "#dc2626", "#f59e0b", "#16a34a"];

export function deviceColor(deviceId: number | undefined): string {
  if (deviceId == null) return "#94a3b8";
  return DEVICE_COLORS[(deviceId - 1) % DEVICE_COLORS.length];
}

/** 秒 → mm:ss.d */
export function fmtTime(sec: number): string {
  const t = Math.round(sec * 10);
  const m = Math.floor(t / 600);
  const rem = t - m * 600;
  const s = Math.floor(rem / 10);
  const d = rem % 10;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${d}`;
}

export const initialDevices: Igniter[] = [
  { id: 1, name: "点火器 1 号", cooldown: 6, gear: 3, enabled: true },
  { id: 2, name: "点火器 2 号", cooldown: 8, gear: 4, enabled: true },
  { id: 3, name: "点火器 3 号", cooldown: 10, gear: 2, enabled: true },
  { id: 4, name: "点火器 4 号", cooldown: 5, gear: 5, enabled: true },
];

export const initialNodes: ShotNode[] = [
  { id: "S01", label: "开场扇形架", segment: "Intro", start: 12.5, duration: 4, load: 2, x: 16, y: 68 },
  { id: "S02", label: "银尾罗马烛光", segment: "Intro", start: 20, duration: 3, load: 1, x: 30, y: 52 },
  { id: "S03", label: "红牡丹礼花弹", segment: "Intro", start: 26, duration: 5, load: 2, x: 44, y: 66 },
  { id: "S04", label: "绿闪礼花弹", segment: "Verse", start: 48, duration: 6, load: 3, x: 58, y: 48 },
  { id: "S05", label: "金菊礼花弹", segment: "Verse", start: 55, duration: 4, load: 2, x: 70, y: 64 },
  { id: "S06", label: "冷焰火喷泉", segment: "Verse", start: 62, duration: 3, load: 1, x: 84, y: 50 },
  { id: "S07", label: "蓝芯礼花弹", segment: "Chorus A", start: 68.2, duration: 5, load: 3, x: 24, y: 30 },
  { id: "S08", label: "高空银冠", segment: "Chorus A", start: 75, duration: 4, load: 4, x: 40, y: 22 },
  { id: "S09", label: "扇形组合架", segment: "Chorus A", start: 82, duration: 6, load: 2, x: 56, y: 30 },
  { id: "S10", label: "齐射礼花弹", segment: "Finale", start: 210, duration: 8, load: 5, x: 66, y: 18 },
  { id: "S11", label: "锦冠礼花弹", segment: "Finale", start: 216, duration: 6, load: 3, x: 78, y: 28 },
  { id: "S12", label: "压轴钛雷", segment: "Finale", start: 222, duration: 10, load: 4, x: 88, y: 36 },
];
