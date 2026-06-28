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
      <body className="antialiased bg-[#0a0a0f]">
        <WalletProvider>
          <div className="min-h-screen flex flex-col">
            <header className="sticky top-0 z-50 bg-[#232328] backdrop-blur-xl border-b border-zinc-800/50">
              <div className="mx-5 flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <span
                    className="text-white text-xl tracking-wide"
                    style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, letterSpacing: "0.08em" }}
                  >
                    MIRAGE VAULT
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