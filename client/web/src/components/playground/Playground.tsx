"use client";

import { LoadingSVG } from "@/components/button/LoadingSVG";
import { PlaygroundTile } from "@/components/playground/PlaygroundTile";
import { GroqAudioVisualizer } from "../visualization/GroqAudioVisualizer";
import { useMultibandTrackVolume } from "@/hooks/useTrackVolume";
import {
  useConnectionState,
  useDataChannel,
  useLocalParticipant,
  useRemoteParticipants,
  useTracks,
} from "@livekit/components-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ConnectionState,
  LocalParticipant,
  RoomEvent,
  Track,
} from "livekit-client";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { Button } from "../button/Button";
import { MicrophoneButton } from "./MicrophoneButton";
import { useWindowResize } from "@/hooks/useWindowResize";
import { APIKeyInput } from "./APIKeyInput";

export interface PlaygroundMeta {
  name: string;
  value: string;
}

export interface PlaygroundProps {
  onConnect: (connect: boolean, opts?: { 
    token?: string; 
    url?: string; 
    metadata?: { [key: string]: string } 
  }) => void;
}

export interface Voice {
  id: string;
  user_id: string | null;
  is_public: boolean;
  name: string;
  description: string;
  created_at: Date;
  embedding: number[];
}

const mobileWindowWidth = 768;
const desktopBarWidth = 72;
const desktopMaxBarHeight = 280;
const desktopMinBarHeight = 60;
const mobileMaxBarHeight = 140;
const mobileMinBarHeight = 48;
const mobileBarWidth = 48;
const barCount = 50;
const defaultVolumes = Array.from({ length: barCount }, () => [0.0]);

export default function Playground({ onConnect }: PlaygroundProps) {
  const { localParticipant } = useLocalParticipant();
  const windowSize = useWindowResize();
  const participants = useRemoteParticipants({
    updateOnlyOn: [RoomEvent.ParticipantMetadataChanged],
  });
  const [isMobile, setIsMobile] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isApiKeyLoading, setIsApiKeyLoading] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [agentGreetingFinished, setAgentGreetingFinished] = useState(false);
  
  const agentParticipant = participants.find((p) => p.isAgent);

  const roomState = useConnectionState();
  const tracks = useTracks();

  useEffect(() => {
    setIsMobile(windowSize.width < mobileWindowWidth);
  }, [windowSize]);

  useEffect(() => {
    if (roomState === ConnectionState.Connected) {
      localParticipant.setMicrophoneEnabled(true);
    } else if (roomState === ConnectionState.Disconnected) {
      setAgentGreetingFinished(false);
    }
  }, [localParticipant, roomState]);
  
  useDataChannel((message) => {
    if (message.from && message.from.isAgent) {
      try {
        const data = JSON.parse(new TextDecoder().decode(message.payload));
        if (data.type === "agent_greeting_finished") {
          setAgentGreetingFinished(true);
        }
      } catch (error) {
        console.error("Failed to parse data message from agent", error);
      }
    }
  });

  const handleApiKeySubmit = async (key: string) => {
    setIsApiKeyLoading(true);
    setApiKeyError(null);
    
    try {
      // Basic validation
      if (!key || key.trim().length === 0) {
        throw new Error("Please enter a valid API key");
      }
      
      if (!key.startsWith("gsk_")) {
        throw new Error("Invalid Groq API key format. It should start with 'gsk_'");
      }
      
      // Validate the API key by making a test call to Groq
      const response = await fetch("https://api.groq.com/openai/v1/models", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${key.trim()}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Invalid API key. Please check your Groq API key and try again.");
        } else {
          throw new Error(`API validation failed: ${response.status} ${response.statusText}`);
        }
      }
      
      console.log("API key validated successfully");
      setApiKey(key.trim());
    } catch (error) {
      console.error("Error validating API key:", error);
      setApiKeyError(error instanceof Error ? error.message : 'Invalid API key');
      setApiKey(null);
    } finally {
      setIsApiKeyLoading(false);
    }
  };

  const agentAudioTrack = tracks.find(
    (trackRef) =>
      trackRef.publication.kind === Track.Kind.Audio &&
      trackRef.participant.isAgent
  );

  const subscribedVolumes = useMultibandTrackVolume(
    agentAudioTrack?.publication.track,
    barCount
  );

  const localTracks = tracks.filter(
    ({ participant }) => participant instanceof LocalParticipant
  );

  const localMicTrack = localTracks.find(
    ({ source }) => source === Track.Source.Microphone
  );

  const localMultibandVolume = useMultibandTrackVolume(
    localMicTrack?.publication.track,
    9
  );

  const audioTileContent = useMemo(() => {
    const conversationToolbar = (
      <div
        className="relative z-50 flex justify-center mt-6"
        style={{
          filter: "drop-shadow(0 8px 10px rgba(0, 0, 0, 0.1))",
        }}
      >
        <motion.div
          className="flex gap-3"
          initial={{
            opacity: 0,
            y: 25,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          exit={{
            opacity: 0,
            y: 25,
          }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
          }}
        >
          <MicrophoneButton
            localMultibandVolume={localMultibandVolume}
            isSpaceBarEnabled={true}
          />
          <Button
            state="destructive"
            className="flex items-center justify-center px-3 rounded-[6px]"
            size="medium"
            onClick={() => {
              onConnect(false);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M3.33325 3.3335L12.6666 12.6668M12.6666 3.3335L3.33325 12.6668"
                stroke="#FF887A"
                strokeWidth="2"
                strokeLinecap="square"
              />
            </svg>
          </Button>
        </motion.div>
      </div>
    );

    const isLoading =
      roomState === ConnectionState.Connecting ||
      (!agentAudioTrack && roomState === ConnectionState.Connected);

    const apiKeyInputSection = (
      <div className="absolute left-1/2 top-32 md:top-1/2 -translate-y-1/2 -translate-x-1/2 w-11/12 md:w-96 text-center">
        <motion.div
          className="flex flex-col gap-3"
          initial={{
            opacity: 0,
            y: 50,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          exit={{
            opacity: 0,
            y: 50,
          }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
          }}
        >
          <div className="text-center text-base text-gray-700 mb-2">
            Please enter your Groq API key to continue
          </div>
          <APIKeyInput onApiKeySubmit={handleApiKeySubmit} isLoading={isApiKeyLoading} apiError={apiKeyError} />
        </motion.div>
      </div>
    );

    const startConversationButton = (
      <div className="absolute left-1/2 top-32 md:top-1/2 -translate-y-1/2 -translate-x-1/2 w-11/12 md:w-96 text-center">
        <motion.div
          className="flex flex-col gap-3"
          initial={{
            opacity: 0,
            y: 50,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          exit={{
            opacity: 0,
            y: 50,
          }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
          }}
        >
          <Button
              state="primary"
              size="medium"
              className={`relative w-full text-base text-black ${!apiKey || isApiKeyLoading ? "opacity-70 cursor-not-allowed" : ""}`}
              disabled={!apiKey || isApiKeyLoading}
              onClick={() => {
                // Pass the API key when connecting
                if (apiKey) {
                  onConnect(true, { 
                    metadata: { groq_api_key: apiKey }
                  });
                } else {
                  setApiKeyError("Please enter your API key first");
                }
              }}
            >
            <div
              className={`w-full ${isApiKeyLoading ? "opacity-0" : "opacity-100"}`}
            >
              Start Your Conversation
            </div>
            <div
              className={`absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 ${
                isApiKeyLoading ? "opacity-100" : "opacity-0"
              }`}
            >
              <LoadingSVG diameter={24} strokeWidth={4} />
            </div>
          </Button>
        </motion.div>
      </div>
    );

    const visualizerContent = (
      <div className="flex flex-col items-center justify-space-between w-full pb-12">
        {roomState === ConnectionState.Disconnected && (
          <div className="w-full text-center mb-4 px-4">
            <div className="inline-block text-left">
              <p className="text-sm text-gray-500">
                Project:
              </p>
              <h1 className="text-5xl font-bold my-1">Compound Voice</h1>
              <p className="text-sm text-gray-500">
                a <a href="https://console.groq.com/docs/agentic-tooling/compound-beta" target="_blank" className="text-groq-button-text hover:text-groq-accent-text-active">Compound-beta</a> based voice assistant, powered by Groq
              </p>
            </div>
          </div>
        )}
        <div className="flex items-center justify-center w-full">
          <GroqAudioVisualizer
            state={
              roomState === ConnectionState.Disconnected
                ? "offline"
                : agentAudioTrack
                ? "speaking"
                : "idle"
            }
            barWidth={isMobile ? mobileBarWidth : desktopBarWidth}
            minBarHeight={isMobile ? mobileMinBarHeight : desktopMinBarHeight}
            maxBarHeight={isMobile ? mobileMaxBarHeight : desktopMaxBarHeight}
            accentColor={!agentAudioTrack ? "gray" : "cartesia"}
            accentShade={!agentAudioTrack ? 200 : 500}
            frequencies={!agentAudioTrack ? defaultVolumes : subscribedVolumes}
            borderRadius={4}
            gap={16}
          />
        </div>
        
        {/* Suggested Prompts Section - Only show when connected */}
        <AnimatePresence>
          {roomState === ConnectionState.Connected && agentGreetingFinished && (
            <motion.div
              className="mb-4 w-full max-w-2xl px-4"
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: 20,
              }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.2,
              }}
            >
              <div className="text-center mb-4">
                <h3 className="text-sm font-medium text-gray-600 mb-3">
                  Try asking me:
                </h3>
                <div className="flex flex-col md:flex-row gap-3 justify-center">
                  <div className="bg-gray-50 hover:bg-gray-100 transition-colors duration-200 rounded-lg px-6 py-3 border border-gray-200 cursor-default">
                    <p className="text-sm text-gray-700 font-medium">
                      &quot;How much potassium is in a banana?&quot;                      
                    </p>
                  </div>
                  <div className="bg-gray-50 hover:bg-gray-100 transition-colors duration-200 rounded-lg px-6 py-3 border border-gray-200 cursor-default">
                    <p className="text-sm text-gray-700 font-medium">
                      &quot;Who won the Lakers game last night?&quot;
                    </p>
                  </div>
                  <div className="bg-gray-50 hover:bg-gray-100 transition-colors duration-200 rounded-lg px-6 py-3 border border-gray-200 cursor-default">
                    <p className="text-sm text-gray-700 font-medium">
                      &quot;What are the latest developments in AI research?&quot;
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="min-h-20 w-full relative">
          <AnimatePresence>
            {roomState === ConnectionState.Disconnected && !apiKey && !agentAudioTrack ? apiKeyInputSection : null}
            {roomState === ConnectionState.Disconnected && apiKey && !agentAudioTrack ? startConversationButton : null}
          </AnimatePresence>
          <AnimatePresence>
            {roomState === ConnectionState.Connected && agentGreetingFinished ? conversationToolbar : null}
          </AnimatePresence>
        </div>
      </div>
    );

    return visualizerContent;
  }, [
    localMultibandVolume,
    roomState,
    agentAudioTrack,
    isMobile,
    subscribedVolumes,
    onConnect,
    apiKey,
    isApiKeyLoading,
    apiKeyError,
    agentGreetingFinished,
  ]);

  return (
    <div className="flex grow w-full">
      <div className="flex-col grow basis-1/2 gap-4 md:flex">
        <PlaygroundTile
          title="ASSISTANT"
          className="w-full grow"
          childrenClassName="justify-center"
        >
          {audioTileContent}
        </PlaygroundTile>
      </div>
    </div>
  );
}