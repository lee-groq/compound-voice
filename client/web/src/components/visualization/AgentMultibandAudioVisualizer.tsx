import { useEffect, useState } from "react";

type AgentMultibandAudioVisualizerProps = {
  barWidth: number;
  minBarHeight: number;
  maxBarHeight: number;
  accentColor: string;
  accentShade?: number;
  frequencies: Float32Array[] | number[][];
  borderRadius: number;
  gap: number;
};

export const AgentMultibandAudioVisualizer = ({
  barWidth,
  minBarHeight,
  maxBarHeight,
  accentColor,
  accentShade,
  frequencies,
  borderRadius,
  gap,
}: AgentMultibandAudioVisualizerProps) => {
  const summedFrequencies = frequencies.map((bandFrequencies) => {
    const sum = (bandFrequencies as number[]).reduce((a, b) => a + b, 0);
    return Math.sqrt(sum / bandFrequencies.length);
  });

  return (
    <div
      className={`flex flex-row items-center`}
      style={{
        gap: gap + "px",
      }}
    >
      {summedFrequencies.map((frequency, index) => {
        return (
          <div
            className={`bg-groq-control-text`}
            key={"frequency-" + index}
            style={{
              height:
                minBarHeight + frequency * (maxBarHeight - minBarHeight) + "px",
              width: barWidth + "px",
              transition: "transform 0.25s ease-out",
              borderRadius: borderRadius + "px",
              boxShadow: `${0.1 * barWidth}px ${
                0.1 * barWidth
              }px 0px 0px rgba(0, 0, 0, 0.1)`,
            }}
          ></div>
        );
      })}
    </div>
  );
};
