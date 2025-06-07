import { TrackToggle, useLocalParticipant } from "@livekit/components-react";
import { Track } from "livekit-client";
import { AgentMultibandAudioVisualizer } from "../visualization/AgentMultibandAudioVisualizer";
import { PlaygroundDeviceSelector } from "./PlaygroundDeviceSelector";
import { useEffect, useState } from "react";
import { MicrophoneOffSVG, MicrophoneOnSVG } from "./icons";

type MicrophoneButtonProps = {
  localMultibandVolume: Float32Array[];
  isSpaceBarEnabled?: boolean;
};

export const MicrophoneButton = ({
  localMultibandVolume,
  isSpaceBarEnabled = false,
}: MicrophoneButtonProps) => {
  const { localParticipant } = useLocalParticipant();
  const [isMuted, setIsMuted] = useState(localParticipant.isMicrophoneEnabled);
  const [isSpaceBarPressed, setIsSpaceBarPressed] = useState(false);

  useEffect(() => {
    setIsMuted(localParticipant.isMicrophoneEnabled === false);
  }, [localParticipant.isMicrophoneEnabled]);

  useEffect(() => {
    if (!isSpaceBarEnabled) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        localParticipant.setMicrophoneEnabled(true);
        setIsSpaceBarPressed(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        localParticipant.setMicrophoneEnabled(false);
        setIsSpaceBarPressed(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isSpaceBarEnabled, localParticipant]);

  return (
    <div className={`
      relative bg-white rounded-[6px] shadow-lg border border-groq-accent-border
      transition-all duration-300 transform hover:shadow-xl hover:border-groq-action-text
      ${isSpaceBarPressed 
        ? "scale-95 shadow-md border-groq-action-text" 
        : "scale-100 hover:-translate-y-1"
      }
    `}
    style={{ zIndex: 100 }}
    >
      <TrackToggle
        source={Track.Source.Microphone}
        className="w-full h-full"
        showIcon={false}
      >
        <div className={`
          flex items-center justify-center gap-4 px-6 py-4 cursor-pointer
          transition-all duration-200 group rounded-[6px]
          ${isMuted 
            ? "bg-groq-content-bg-darker" 
            : "bg-white hover:bg-groq-neutral-bg/50"
          }
        `}>
          {/* Microphone Icon with Enhanced Styling */}
          <div className={`
            relative flex items-center justify-center w-12 h-12 rounded-full
            transition-all duration-300 group-hover:scale-110
            ${isMuted 
              ? "bg-gray-400 text-white" 
              : "bg-groq-action-text text-white shadow-lg"
            }
          `}>
            <div className={`
              transition-transform duration-200
              ${isSpaceBarPressed ? "scale-90" : "scale-100"}
            `}>
              {isMuted ? <MicrophoneOffSVG /> : <MicrophoneOnSVG />}
            </div>
            
            {/* Pulse animation when active */}
            {!isMuted && (
              <div className="absolute inset-0 rounded-full bg-groq-action-text animate-ping opacity-20"></div>
            )}
          </div>

          {/* Audio Visualizer with Enhanced Styling */}
          <div className={`
            flex items-center justify-center px-4 py-2 rounded-lg
            transition-all duration-200
            ${isMuted 
              ? "bg-gray-100" 
              : "bg-groq-content-bg-darker"
            }
          `}>
            <AgentMultibandAudioVisualizer
              state="speaking"
              barWidth={3}
              minBarHeight={4}
              maxBarHeight={20}
              accentColor={isMuted ? "gray" : "groq"}
              accentShade={isMuted ? 400 : 500}
              frequencies={localMultibandVolume}
              borderRadius={6}
              gap={3}
            />
          </div>

          {/* Device Selector with Enhanced Styling - Fixed positioning */}
          <div className={`
            relative flex items-center justify-center w-8 h-8 rounded-full
            transition-all duration-200 hover:bg-groq-action-text hover:text-white
            ${isMuted 
              ? "text-gray-400" 
              : "text-groq-action-text"
            }
          `}
          style={{ zIndex: 1000 }} // Ensure dropdown appears above other elements
          >
            <PlaygroundDeviceSelector kind="audioinput" />
          </div>
        </div>

        {/* Status Indicator */}
        <div className={`
          absolute top-2 right-2 w-3 h-3 rounded-full border-2 border-white
          transition-all duration-200
          ${isMuted 
            ? "bg-gray-400" 
            : "bg-green-500 shadow-lg"
          }
        `}>
          {!isMuted && (
            <div className="absolute inset-0 rounded-full bg-green-500 animate-pulse opacity-60"></div>
          )}
        </div>

        {/* Spacebar Hint */}
        {isSpaceBarEnabled && (
          <div className={`
            absolute bottom-2 left-1/2 transform -translate-x-1/2
            px-2 py-1 bg-groq-content-text text-white text-xs rounded-md
            transition-all duration-200
            ${isSpaceBarPressed 
              ? "opacity-100 scale-100" 
              : "opacity-0 scale-95 group-hover:opacity-70"
            }
          `}>
            Hold Space
          </div>
        )}
      </TrackToggle>
    </div>
  );
};
