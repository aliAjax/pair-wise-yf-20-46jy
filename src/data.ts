import type { Device, FireNode, Level } from "./types";

/** 耗电级别 -> kW */
export const LEVEL_KW: Record<Level, number> = { 1: 2, 2: 4, 3: 6 };

export const LEVEL_LABEL: Record<Level, string> = {
  1: "L1 · 2kW",
  2: "L2 · 4kW",
  3: "L3 · 6kW",
};

/** 四台点火器：各有冷却时间与供电档位 */
export const DEVICES: Device[] = [
  { id: "F1", name: "1号点火器", cooldown: 2.0, capacity: 6, color: "#1d4ed8" },
  { id: "F2", name: "2号点火器", cooldown: 1.2, capacity: 6, color: "#0d9488" },
  { id: "F3", name: "3号点火器", cooldown: 3.0, capacity: 9, color: "#f59e0b" },
  { id: "F4", name: "4号点火器", cooldown: 0.8, capacity: 12, color: "#dc2626" },
];

/** 节点按点火时刻排序，排程即按此顺序逐发排入 */
export const NODES: FireNode[] = [
  { no: 1, section: "Intro", model: "30mm 扇形架", time: 1.0, duration: 3.0, level: 2, x: 18, y: 70, zone: "A" },
  { no: 2, section: "Intro", model: "罗马烛光", time: 2.2, duration: 4.0, level: 1, x: 38, y: 62, zone: "B" },
  { no: 3, section: "Intro", model: "冷焰火", time: 4.0, duration: 2.0, level: 2, x: 24, y: 42, zone: "A" },
  { no: 4, section: "Chorus A", model: "75mm 礼花弹", time: 4.6, duration: 5.0, level: 3, x: 72, y: 68, zone: "C" },
  { no: 5, section: "Chorus A", model: "罗马烛光", time: 5.4, duration: 2.0, level: 1, x: 52, y: 38, zone: "B" },
  { no: 6, section: "Chorus A", model: "40mm 扇形架", time: 6.2, duration: 3.0, level: 2, x: 12, y: 24, zone: "A" },
  { no: 7, section: "Finale", model: "100mm 礼花弹", time: 7.0, duration: 6.0, level: 3, x: 84, y: 26, zone: "C" },
  { no: 8, section: "Finale", model: "75mm 礼花弹", time: 7.2, duration: 2.0, level: 3, x: 60, y: 74, zone: "B" },
  { no: 9, section: "Finale", model: "冷焰火", time: 9.0, duration: 3.0, level: 1, x: 30, y: 82, zone: "A" },
  { no: 10, section: "Finale", model: "40mm 扇形架", time: 10.2, duration: 4.0, level: 2, x: 46, y: 20, zone: "B" },
  { no: 11, section: "Encore", model: "100mm 礼花弹", time: 12.0, duration: 2.5, level: 3, x: 68, y: 44, zone: "C" },
  { no: 12, section: "Encore", model: "罗马烛光", time: 13.0, duration: 3.0, level: 1, x: 8, y: 54, zone: "A" },
  { no: 13, section: "Encore", model: "75mm 礼花弹", time: 15.0, duration: 5.0, level: 2, x: 90, y: 58, zone: "C" },
  { no: 14, section: "Encore", model: "冷焰火", time: 18.0, duration: 4.0, level: 3, x: 56, y: 52, zone: "B" },
];

export const TIMELINE_MAX = 22;
