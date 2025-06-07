"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useConnection } from "@/hooks/useConnection";

import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
} from "@livekit/components-react";

import { ConnectionMode } from "@/hooks/useConnection";

import { Room, RoomEvent, Track, LocalAudioTrack, DataPacket_Kind, RemoteParticipant } from "livekit-client";

import Playground from "@/components/playground/Playground";

// Define ToolResult interface (can be moved to a shared types file if used elsewhere)
interface ToolResult {
  title: string;
  url: string;
  score: number;
}

interface RoomComponentProps {
  onToolResults?: (results: ToolResult[]) => void; // New prop
}

export function RoomComponent({ onToolResults }: RoomComponentProps) { // Destructure new prop
  const { shouldConnect, wsUrl, token, mode, connect, disconnect } =
    useConnection();
  


  const handleConnect = useCallback(
    async (c: boolean, mode: ConnectionMode, metadata?: { [key: string]: string }) => {
      if (c) {
        connect(mode, metadata);
      } else {
        disconnect();
        // Clear tool results when disconnecting
        if (onToolResults) {
          onToolResults([]);
        }
      }
    },
    [connect, disconnect, onToolResults]
  );

  const room = useMemo(() => {
    const r = new Room();
    r.on(RoomEvent.LocalTrackPublished, async (trackPublication) => {
      if (
        trackPublication.source === Track.Source.Microphone &&
        trackPublication.track instanceof LocalAudioTrack
      ) {
        const { KrispNoiseFilter, isKrispNoiseFilterSupported } = await import(
          "@livekit/krisp-noise-filter"
        );
        if (!isKrispNoiseFilterSupported()) {
          console.error(
            "Enhanced noise filter is not supported for this browser"
          );
          return;
        }
        try {
          await trackPublication.track
            // @ts-ignore
            ?.setProcessor(KrispNoiseFilter());
        } catch (e) {
          console.warn("Background noise reduction could not be enabled");
        }
      }
    });
    return r;
  }, [wsUrl]);

  useEffect(() => {
    if (room && onToolResults) {
      const handleDataReceived = (payload: Uint8Array, rp?: RemoteParticipant, kind?: DataPacket_Kind) => {
        if (kind === DataPacket_Kind.RELIABLE) {
          const decoder = new TextDecoder();
          const strMessage = decoder.decode(payload);
          try {
            const jsonMessage = JSON.parse(strMessage);
            if (jsonMessage.type === 'tool_results' && jsonMessage.data) {
              console.log('[FRONTEND DEBUG RoomComponent] Received tool_results:', jsonMessage.data);
              if (onToolResults) {
                console.log('[FRONTEND DEBUG RoomComponent] Calling onToolResults callback.');
                onToolResults(jsonMessage.data as ToolResult[]);
              } else {
                console.warn('[FRONTEND DEBUG RoomComponent] onToolResults callback is undefined.');
              }
            }
          } catch (e) {
            console.error('RoomComponent failed to parse data message:', e);
          }
        }
      };

      room.on(RoomEvent.DataReceived, handleDataReceived);
      return () => {
        room.off(RoomEvent.DataReceived, handleDataReceived);
      };
    }
  }, [room, onToolResults]); // Effect dependencies


  return (
    <LiveKitRoom
      className="flex flex-col w-full"
      serverUrl={wsUrl}
      token={token}
      room={room}
      connect={shouldConnect}
      onError={(e) => {
        //setToastMessage({ message: e.message, type: "error" });
        console.error(e);
      }}
    >
      <Playground
        onConnect={(c, opts) => {
          const m = process.env.NEXT_PUBLIC_LIVEKIT_URL ? "env" : mode;
          handleConnect(c, m, opts?.metadata);
        }}
      />


      
      <RoomAudioRenderer />
      <StartAudio label="Click to enable audio playback" />
    </LiveKitRoom>
  );
}