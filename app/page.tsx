"use client";
import VestingDashboard from "./components/VestingDashboard";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-200 font-mono">
      {/* Subtle grid background hero */}
      <div
        className="w-full relative overflow-hidden"
        style={{
          background: "#0d0d12",
          backgroundImage: `
            linear-gradient(rgba(124, 58, 237, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124, 58, 237, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      >
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] 
          bg-violet-600/10 blur-[80px] rounded-full pointer-events-none" />

        <section className="relative z-10 max-w-4xl mx-auto px-4 pt-16 pb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full 
            bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Live on Stellar Testnet
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            Mirage <span className="text-violet-400">Vault</span>
          </h1>
          <p className="text-zinc-500 mt-3 text-sm max-w-md">
            On-chain token vesting on Stellar Soroban. Tokens unlock linearly after the cliff — claim what's yours, whenever you're ready.
          </p>
        </section>
      </div>

      <VestingDashboard />
    </div>
  );
}