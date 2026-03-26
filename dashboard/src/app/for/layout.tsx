import type { Metadata } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Your Personalized Growth Plan",
  description:
    "A custom solution built for your practice. AI-powered receptionist, instant lead response, and automated booking.",
};

export default function PitchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
      <body
        style={{
          margin: 0,
          padding: 0,
          background: "#FDFBF7",
          color: "#2D2A26",
          fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
          overflowX: "hidden",
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        }}
      >
        {/* Subtle warm texture overlay */}
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 0,
            pointerEvents: "none",
            opacity: 0.03,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
            backgroundSize: "256px 256px",
          }}
        />

        {/* Subtle warm gradient at top */}
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: "60vh",
            zIndex: 0,
            pointerEvents: "none",
            background:
              "linear-gradient(180deg, rgba(201,169,110,0.04) 0%, transparent 100%)",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>{children}</div>

        <style>{`
          * { box-sizing: border-box; }
          ::selection { background: rgba(139,115,85,0.2); color: #2D2A26; }
          ::-webkit-scrollbar { width: 6px; }
          ::-webkit-scrollbar-track { background: #F5F2EC; }
          ::-webkit-scrollbar-thumb { background: #D4CFC6; border-radius: 3px; }
          ::-webkit-scrollbar-thumb:hover { background: #B8B2A8; }
          html { scroll-behavior: smooth; }
        `}</style>
      </body>
    </html>
  );
}
