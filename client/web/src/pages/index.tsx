import { RoomComponent } from "@/components/playground/RoomComponent";
import { PlaygroundHeader } from "@/components/playground/PlaygroundHeader";
import { AnimatePresence, motion } from "framer-motion";
import Head from "next/head";
import { useCallback, useState, useEffect } from "react";
import ToolResultsDisplay from '@/components/ToolResultsDisplay';

import { PlaygroundToast, ToastType } from "@/components/toast/PlaygroundToast";
import { ConfigProvider } from "@/hooks/useConfig";
import { ConnectionProvider } from "@/hooks/useConnection";

// Define the structure of a tool result based on your backend
interface ToolResult {
  title: string;
  url: string;
  score: number;
}

// Sample data for testing UI
const MOCK_TOOL_RESULTS: ToolResult[] = [
  {
    title: "Test Result 1: A Long Title to Check Wrapping and Display Styles",
    url: "https://www.cnn.com/2025/05/27/health/covid-vaccine-pregnant-women-children-recommendation",
    score: 0.98
  },
  {
    title: "Test Result 2: Shorter Title",
    url: "https://groq.com/",
    score: 0.85
  },
  {
    title: "Test Result 3: Another Item with a Different Score",
    url: "https://www.msnbc.com/top-stories",
    score: 0.72
  },
  {
    title: "Test Result 4: Example.org Link",
    url: "https://example.org/another",
    score: 0.66
  },
  {
    title: "Test Result 5: Example.org Link",
    url: "https://example.org/another",
    score: 0.60
  }
];

// The main Home component now only sets up providers
export default function Home() {
  return (
    <ConfigProvider>
      <ConnectionProvider>
        <HomeInner />
      </ConnectionProvider>
    </ConfigProvider>
  );
}

// HomeInner contains the logic and UI elements
export function HomeInner() {
  const [toastMessage, setToastMessage] = useState<{
    message: string;
    type: ToastType;
  } | null>(null);

  // LiveKit and tool results states are now in HomeInner
  const [toolResults, setToolResults] = useState<ToolResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Removed the useEffect for separate LiveKit connection, room state, livekitUrl, livekitToken
  // The connection is now managed by useConnection and RoomComponent

  // You might still want an error state for other types of errors, 
  // or rely on toastMessage for user feedback.
  // For example, if NEXT_PUBLIC_LIVEKIT_URL is not set for useConnection:
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_LIVEKIT_URL) {
        const msg = "NEXT_PUBLIC_LIVEKIT_URL is not set. LiveKit features may not work.";
        console.warn(msg);
        setError(msg); // Or use setToastMessage
        // setToastMessage({ message: msg, type: ToastType.ALERT });
    }
  }, []);

  // DEBUG: Log when toolResults state changes
  useEffect(() => {
    console.log('[FRONTEND DEBUG HomeInner] toolResults state updated:', toolResults);
  }, [toolResults]);

  const handleLoadTestResults = () => {
    console.log("[FRONTEND DEBUG HomeInner] Loading MOCK_TOOL_RESULTS.");
    setToolResults(MOCK_TOOL_RESULTS);
  };

  const handleClearTestResults = () => {
    console.log("[FRONTEND DEBUG HomeInner] Clearing toolResults.");
    setToolResults([]);
  };

  const hasToolResults = toolResults.length > 0;

  return (
    <>
      <Head>
        <title>Groq + LiveKit Compound-beta Voice Assistant Demo</title>
        <meta
          name="description"
          content="Voice Assistant with Groq, LiveKit, and real-time search results powered by Groq's Compound-beta."
        />
        <meta name="og:title" content="Project Compound Voice" />
        <meta
          name="og:description"
          content="Talk to the world's fastest AI voice assistant, powered by Groq's Compound-beta."
        />
        <meta property="og:image" content="https://groq.livekit.io/og.png" />
        <meta name="twitter:site" content="@LiveKit"></meta>
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Groq Voice" />
        <meta
          name="twitter:description"
          content="Talk to Compound-beta - powered by Groq"
        />
        <meta property="twitter:image:width" content="1600" />
        <meta property="twitter:image:height" content="836" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta property="og:image:width" content="1600" />
        <meta property="og:image:height" content="836" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      {/* Header at the very top of the viewport */}
      <PlaygroundHeader height={56} />
      
      <main
        className={`relative flex overflow-x-hidden w-full bg-groq-neutral-bg repeating-square-background ${hasToolResults ? 'flex-row' : 'flex-col justify-center items-center'}`}
        style={{ height: 'calc(100vh - 56px - 48px)' }}
      >
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              className="left-0 right-0 top-0 absolute z-10"
              initial={{ opacity: 0, translateY: -50 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: -50 }}
            >
              <PlaygroundToast
                message={toastMessage.message}
                type={toastMessage.type}
                onDismiss={() => {
                  setToastMessage(null);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* --- Test Mode Controls --- */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{ position: 'absolute', top: '10px', right: hasToolResults ? 'calc(50% + 10px)' : '10px', zIndex: 100, background: 'rgba(255,255,255,0.8)', padding: '10px', borderRadius: '5px', transition: 'right 0.3s ease-in-out' }}>
            <h5 style={{marginTop: 0, marginBottom: '5px'}}>Test Controls</h5>
            <button onClick={handleLoadTestResults} style={{ marginRight: '5px', padding: '5px' }}>Load Test URLs</button>
            <button onClick={handleClearTestResults} style={{ padding: '5px' }}>Clear URLs</button>
          </div>
        )}
        {/* --- End Test Mode Controls --- */}

        {/* Main content area (left side when tool results are shown) */}
        <div className={`flex flex-col justify-center items-center h-full ${hasToolResults ? 'w-1/2' : 'w-full'}`}>
          {/* Pass setToolResults to RoomComponent */}
          <RoomComponent onToolResults={setToolResults} />

          {/* Display general errors (e.g., configuration issues) */}
          {error && (
            <div style={{ color: 'orange', margin: '10px', padding: '10px', border: '1px solid orange', borderRadius: '5px' }}>
              <strong>Notice:</strong> {error}
            </div>
          )}
        </div>

        {/* Tool results area (right side, shown only if there are results) */}
        {hasToolResults && (
          <div className="w-1/2 h-full overflow-y-auto p-4">
            <ToolResultsDisplay 
              results={toolResults} 
              onClose={() => setToolResults([])}
            />
          </div>
        )}

      </main>

      {/* GitHub Footer*/}
      <footer className="h-12 pb-2 bg-groq-neutral-bg flex items-center justify-center">
        <a
          href="https://github.com/lee-groq/compound-voice"
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          GitHub Repository
        </a>
      </footer>
    </>
  );
}
