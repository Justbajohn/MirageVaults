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
      linear-gradient(rgba(16, 185, 129, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(16, 185, 129, 0.03) 1px, transparent 1px)
    `,
          backgroundSize: "40px 40px",
        }}
      >
        {/* Glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] 
  bg-emerald-600/10 blur-[80px] rounded-full pointer-events-none"
        />

        <section className="relative z-10 max-w-4xl mx-auto px-4 pt-16 pb-20">
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            Mirage <span className="text-white">Vault</span>
          </h1>
          <p className="text-zinc-500 mt-3 text-sm max-w-md">
            On-chain token vesting on Stellar Soroban. Tokens unlock linearly
            after the cliff — claim what's yours, whenever you're ready.
          </p>
        </section>
      </div>

      <VestingDashboard />
    </div>
  );
}
