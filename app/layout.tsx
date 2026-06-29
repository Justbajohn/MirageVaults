import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "./components/contexts/WalletContext";
import WalletConnection from "./components/contexts/WalletConnection";

export const metadata: Metadata = {
  title: "MIRAGE VAULT",
  description: "Token vesting dashboard on Stellar Soroban",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-[#0a0a0f]">
        <WalletProvider>
          <div className="min-h-screen flex flex-col">
            <header className="sticky top-0 z-50 bg-[#0d0d12]/90 backdrop-blur-xl border-b border-emerald-900/30">
              <div className="mx-5 flex items-center justify-between py-4">
                {/* Logo */}
                <div className="flex items-center gap-3">
                  <img
                    src="/mirage.png"
                    alt="Mirage"
                    className="h-9 w-9 object-contain"
                  />
                  <span
                    className="text-white text-lg tracking-widest"
                    style={{
                      fontFamily: "'Orbitron', sans-serif",
                      fontWeight: 900,
                      letterSpacing: "0.15em",
                      background: "linear-gradient(90deg, #ffffff, #34d399)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    MIRAGE
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <WalletConnection />
                </div>
              </div>
            </header>
            <main className="flex-1 overflow-x-hidden">{children}</main>
          </div>
        </WalletProvider>
      </body>
    </html>
  );
}