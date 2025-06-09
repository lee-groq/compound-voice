"use client";

import React, { createContext, useState } from "react";
import { useCallback } from "react";
import { useConfig } from "./useConfig";

export type ConnectionMode = "manual" | "env";

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
    
    // Prepare request body with API keys and metadata
    const requestBody: { [key: string]: string } = {};
    
    if ("ci_api_key" in config && config.ci_api_key) {
      requestBody.ci_api_key = config.ci_api_key;
    }
    
    // Add metadata to the request body
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        requestBody[key] = value;
      });
    }
    
    // Send POST request with API keys in body instead of URL
    const response = await fetch("/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    const { accessToken } = await response.json();
    
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
