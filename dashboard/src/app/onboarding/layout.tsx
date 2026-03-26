import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get Started — VelosLuxe",
  description: "Set up your AI receptionist in minutes. VelosLuxe connects to your booking system and starts answering calls 24/7.",
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&display=swap"
        rel="stylesheet"
      />
      <div
        style={{
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          background: "#ffffff",
          color: "#1f2937",
          minHeight: "100vh",
          fontSize: 16,
          lineHeight: 1.6,
          WebkitFontSmoothing: "antialiased",
        } as React.CSSProperties}
      >
        {children}
      </div>
    </>
  );
}
