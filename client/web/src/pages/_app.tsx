import { CloudProvider } from "@/cloud/useCloud";
import type { AppProps } from "next/app";
import { montserrat } from "@/lib/fonts";
import "@/styles/fonts.css";
import "@/styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={`${montserrat.variable} font-sans`}>
      <CloudProvider>
        <Component {...pageProps} />
      </CloudProvider>
    </div>
  );
}
