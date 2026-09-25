export type Level = 1 | 2 | 3;

/** 点火器 */
export interface Device {
  id: string;
  name: string;
  /** 同一台点火器相邻两次点火的最小间隔（秒） */
  cooldown: number;
  /** 供电档位：允许的同时耗电总功率（kW） */
  capacity: number;
  color: string;
}

/** 点火节点（一发） */
export interface FireNode {
  no: number;
  section: string;
  model: string;
  /** 点火时刻（秒，相对于整场节目起点） */
  time: number;
  /** 持续时长（秒） */
  duration: number;
  /** 耗电级别 */
  level: Level;
  /** 点位平面图坐标（0–100 百分比坐标） */
  x: number;
  y: number;
  zone: "A" | "B" | "C";
}

/** 该节点在本次点火窗口内对某台设备的功率占用 */
export interface Win {
  no: number;
  s: number;
  e: number;
  kw: number;
}

export type RowStatus =
  | "assigned" // 基线排入，设备未停用
  | "reassigned" // 停用后改派到其它设备
  | "waiting" // 原设备停用，暂时找不到改派目标
  | "blocked"; // 排程已在冲突节点停止，未排入

export interface Row {
  no: number;
  status: RowStatus;
  deviceId: string | null;
  /** 基线上派给的设备（用于展示改派轨迹） */
  baselineDeviceId: string | null;
  why?: Record<string, string>;
}

export interface ConflictInfo {
  no: number;
  time: number;
  duration: number;
  level: Level;
  kw: number;
}

export interface Baseline {
  assign: Record<number, string>;
  wins: Record<string, Win[]>;
  conflict: ConflictInfo | null;
}

export interface DeviceState {
  wins: Win[];
  /** 冲突时刻该设备正在点火的发次 */
  covering: Win[];
  /** 冲突时刻该设备当前功率 */
  loadAt: number;
  /** 该设备最近一次占用的结束（包含停用改派后新插入的窗口） */
  busyUntil: number;
}

export interface Diagnosis {
  conflict: ConflictInfo;
  /** 每台设备无法承接的原因 */
  reasons: Record<string, string>;
  states: Record<string, DeviceState>;
}

export interface ScheduleView {
  rows: Row[];
  /** 当前视图下每台设备上的功率窗口 */
  wins: Record<string, Win[]>;
  diagnosis: Diagnosis | null;
  /** 预览停止位置（冲突或等待改派节点的最早点火时刻） */
  stopAt: number | null;
  stopReason: "无法供电" | "等待改派" | null;
}
