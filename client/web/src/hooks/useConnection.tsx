"use client";

import { useCloud } from "@/cloud/useCloud";
import React, { createContext, useState } from "react";
import { useCallback } from "react";
import { useConfig } from "./useConfig";

export type ConnectionMode = "cloud" | "manual" | "env";

type TokenGeneratorData = {
  shouldConnect: boolean;
  wsUrl: string;
  token: string;
  mode: ConnectionMode;
  disconnect: () => Promise<void>;
  connect: (mode: ConnectionMode, metadata?: { [key: string]: string }) => Promise<void>;
};

const ConnectionContext = createContext<TokenGeneratorData | undefined>(
  undefined
);

export const ConnectionProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const config = useConfig();
  const [connectionDetails, setConnectionDetails] = useState<{
    wsUrl: string;
    token: string;
    mode: ConnectionMode;
    shouldConnect: boolean;
  }>({ wsUrl: "", token: "", shouldConnect: false, mode: "manual" });

  const connect = async (mode: ConnectionMode, metadata?: { [key: string]: string }) => {
    if (!process.env.NEXT_PUBLIC_LIVEKIT_URL) {
      throw new Error("NEXT_PUBLIC_LIVEKIT_URL is not set");
    }
    let tokenUrl = "/api/token";
    const params = new URLSearchParams();
    
    if ("ci_api_key" in config && config.ci_api_key) {
      params.append("ci_api_key", config.ci_api_key);
    }
    
    // Add metadata to the token request
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        params.append(key, value);
      });
    }
    
    if (params.toString()) {
      tokenUrl += `?${params.toString()}`;
    }
    
    const { accessToken } = await fetch(tokenUrl).then((res) => res.json());
    setConnectionDetails({
      wsUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL,
      token: accessToken,
      shouldConnect: true,
      mode,
    });
  };

  const disconnect = useCallback(async () => {
    setConnectionDetails((prev) => ({ ...prev, shouldConnect: false }));
  }, []);

  return (
    <ConnectionContext.Provider
      value={{
        wsUrl: connectionDetails.wsUrl,
        token: connectionDetails.token,
        shouldConnect: connectionDetails.shouldConnect,
        mode: connectionDetails.mode,
        connect,
        disconnect,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
};

export const useConnection = () => {
  const context = React.useContext(ConnectionContext);
  if (context === undefined) {
    throw new Error("useConnection must be used within a ConnectionProvider");
  }
  return context;
};
