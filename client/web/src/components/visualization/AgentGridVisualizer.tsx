import { ComponentType, CSSProperties, useMemo } from "react";
import { useGridAnimator } from "./useGridAnimator";

export type GridAnimatorState = "paused" | "active";
export type AgentState =
  | "offline"
  | "connecting"
  | "listening"
  | "thinking"
  | "speaking";
export type GridAnimationOptions = {
  interval?: number;
  connectingRing?: number;
  onTransition?: string;
  offTransition?: string;
};

export type AgentVisualizerOptions = {
  baseStyle: CSSProperties;
  gridComponent?: ComponentType<{ style: CSSProperties }>;
  gridSpacing?: string;
  onStyle?: CSSProperties;
  offStyle?: CSSProperties;
  transformer?: (distanceFromCenter: number) => CSSProperties;
  rowCount?: number;
  animationOptions?: GridAnimationOptions;
  maxHeight?: number;
  minHeight?: number;
  radiusFactor?: number;
  radial?: boolean;
  stateOptions?: {
    [key in AgentState]: AgentVisualizerOptions;
  };
};

const normalizeFrequencies = (frequencies: number[]) => {
  const normalizeDb = (value: number) => {
    const minDb = -100;
    const maxDb = -10;
    let db = 1 - (Math.max(minDb, Math.min(maxDb, value)) * -1) / 100;
    db = Math.sqrt(db);

    return db;
  };

  // Normalize all frequency values
  return frequencies.map((value) => {
    if (value === -Infinity) {
      return 0;
    }
    return normalizeDb(value);
  });
};

export type AgentVisualizerProps = {
  style?: "grid" | "bar" | "radial" | "waveform";
  state: AgentState;
  volumeBands: number[];
  options?: AgentVisualizerOptions;
};

export const AgentGridVisualizer = ({
  state,
  volumeBands,
  options,
}: AgentVisualizerProps) => {
  return null;
};
