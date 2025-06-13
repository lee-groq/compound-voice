import { useEffect, useState } from "react";
import { motion } from "framer-motion";

type VisualizerState =
  | "offline"
  | "listening"
  | "idle"
  | "speaking"
  | "thinking";

type GroqAudioVisualizerProps = {
  state: VisualizerState;
  barWidth: number;
  minBarHeight: number;
  maxBarHeight: number;
  accentColor: string;
  accentShade?: number;
  frequencies: Float32Array[] | number[][];
  borderRadius: number;
  gap: number;
};

export const GroqAudioVisualizer = ({
  state,
  frequencies,
}: GroqAudioVisualizerProps) => {
  const [isTabletOrSmaller, setIsTabletOrSmaller] = useState(false);
  const [isMobileSmall, setIsMobileSmall] = useState(false);
  const summedFrequencies = frequencies.map((bandFrequencies) => {
    const sum = (bandFrequencies as number[]).reduce((a, b) => a + b, 0);
    return Math.sqrt(sum / bandFrequencies.length);
  });

  useEffect(() => {
    const handleResize = () => {
      setIsTabletOrSmaller(window.innerWidth < 1024);
      // iPhone 12 Pro is 390px wide, so we target screens 400px and below for extra safety
      setIsMobileSmall(window.innerWidth <= 400);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Calculate radiusBase to ensure total width stays within 350px for small mobile devices
  const getRadiusBase = () => {
    if (isMobileSmall) {
      // For 350px total width: 350 = radiusBase * 2 + 15 + 3 * 50
      // 350 = radiusBase * 2 + 165
      // radiusBase * 2 = 185
      // radiusBase = 92.5, round down to 90 for safety
      return 90;
    } else if (isTabletOrSmaller) {
      return 110;
    } else {
      return 200;
    }
  };

  return (
    <div className="relative flex items-center justify-center w-full">
      <div className="relative z-50 flex items-center justify-center">
        <CircleChart
          state={state}
          values={[90, 110, 120, 90]}
          frequencies={summedFrequencies.slice(0, 4)}
          radiusBase={getRadiusBase()}
        />
      </div>
    </div>
  );
};

const CircleChart = ({
  state,
  values,
  frequencies,
  radiusBase,
}: {
  state: VisualizerState;
  values: number[];
  frequencies: number[];
  radiusBase: number;
}) => {
  const [isActive, setIsActive] = useState(false);
  const strokeWidth = 15;
  const gap = 20; // Fixed gap to prevent size changes
  let averageVolume =
    frequencies.reduce((a, b) => a + b, 0) / frequencies.length;
  if (isNaN(averageVolume)) {
    averageVolume = 0;
  }
  const normalizedVolume = Math.pow(averageVolume, 0.3);
  const numCircles = values.length;
  const size =
    radiusBase * 2 + strokeWidth + (numCircles - 1) * (gap + strokeWidth * 2);

  useEffect(() => {
    if (state !== "offline") {
      setIsActive(true);
    } else {
      setIsActive(false);
    }
  }, [state]);

  return (
    <div className="flex items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="hovering-element"
        style={{
          overflow: 'visible',
        }}
      >
        <g filter="url(#filter0_di_61_4534)">
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={size * 0.1}
            fill="white"
            initial={{
              opacity: 0,
            }}
            animate={{
              r: isActive ? radiusBase * 0.75 : size * 0.2,
              opacity: 1,
            }}
            transition={{
              type: "spring",
              stiffness: 150,
              damping: 13,
            }}
            transform={`scale(${0.7 + 0.3 * averageVolume})`}
            style={{
              transformOrigin: "50% 50%",
            }}
          />
        </g>
        <defs>
          <filter
            id="filter0_di_61_4534"
            x="0"
            y="0"
            width={size}
            height={size}
            scale={0.9 + 0.2 * averageVolume}
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feColorMatrix
              in="SourceAlpha"
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              result="hardAlpha"
            />
            <feOffset dy="21" />
            <feGaussianBlur stdDeviation="17" />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.17 0"
            />
            <feBlend
              mode="normal"
              in2="BackgroundImageFix"
              result="effect1_dropShadow_61_4534"
            />
            <feBlend
              mode="normal"
              in="SourceGraphic"
              in2="effect1_dropShadow_61_4534"
              result="shape"
            />
            <feColorMatrix
              in="SourceAlpha"
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              result="hardAlpha"
            />
            <feOffset dy={-4 + -8 * averageVolume} />
            <feGaussianBlur stdDeviation={7 + 5 * averageVolume} />
            <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.933333 0 0 0 0 0.168627 0 0 0 0 0.0470588 0 0 0 0.66 0"
            />
            <feBlend
              mode="normal"
              in2="shape"
              result="effect2_innerShadow_61_4534"
            />
          </filter>
        </defs>
      </svg>
    </div>
  );
};
