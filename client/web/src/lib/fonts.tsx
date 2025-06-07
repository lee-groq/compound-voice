import { Inter, Montserrat } from "next/font/google";

export const inter = Inter({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-inter",
});

export const montserrat = Montserrat({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-montserrat",
}); 