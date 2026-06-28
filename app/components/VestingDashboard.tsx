"use client";
import { useEffect, useState, useCallback } from "react";
import { useWallet } from "./contexts/WalletContext";
import { VESTING_CONFIG } from "../lib/vesting";
import {
  rpc as StellarRpc,
  TransactionBuilder,
  Networks,
  Contract,
  scValToNative,
  nativeToScVal,
  Address,
} from "@stellar/stellar-sdk";
import {
  Lock,
  Unlock,
  Clock,
  TrendingUp,
  ExternalLink,
  RefreshCw,
  RotateCcw,
  AlertCircle,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const RPC_URL = "https://soroban-testnet.stellar.org:443";
const PASSPHRASE = Networks.TESTNET;
const READ_ACCOUNT = "GDXK7EYVBXTITLBW2ZCODJW3B7VTVCNNNWDDEHKJ7Y67TZVW5VKRRMU6";

const server = new StellarRpc.Server(RPC_URL);

async function simRead(contractId: string, method: string, args: any[] = []) {
  const account = await server.getAccount(READ_ACCOUNT);
  const contract = new Contract(contractId);
  const tx = new TransactionBuilder(account, {
    fee: "1000",
    networkPassphrase: PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const result = await server.simulateTransaction(tx);
  if (StellarRpc.Api.isSimulationSuccess(result)) {
    return scValToNative(result.result!.retval);
  }
  return null;
}

function formatTokens(amount: number) {
  return amount.toLocaleString();
}

function formatTimeLeft(seconds: number) {
  if (seconds <= 0) return "Unlocked";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

interface VestingState {
  totalAmount: number;
  vestedAmount: number;
  claimedAmount: number;
  claimableAmount: number;
  start: number;
  cliff: number;
  duration: number;
}

export default function VestingDashboard() {
  const { address, walletsKit } = useWallet();
  const [state, setState] = useState<VestingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [txStatus, setTxStatus] = useState<{
    type: "success" | "error" | "pending";
    msg: string;
    hash?: string;
  } | null>(null);
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));

  useEffect(() => {
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(interval);
  }, []);

  // auto-dismiss toast
  useEffect(() => {
    if (txStatus && txStatus.type !== "pending") {
      const t = setTimeout(() => setTxStatus(null), 10000);
      return () => clearTimeout(t);
    }
  }, [txStatus]);

  const fetchState = useCallback(async () => {
    setLoading(true);
    try {
      const [total, vested, claimed, claimable, start, cliff, duration] =
        await Promise.all([
          simRead(VESTING_CONFIG.vestingId, "get_total_amount"),
          simRead(VESTING_CONFIG.vestingId, "vested_amount"),
          simRead(VESTING_CONFIG.vestingId, "get_claimed_amount"),
          simRead(VESTING_CONFIG.vestingId, "claimable_amount"),
          simRead(VESTING_CONFIG.vestingId, "get_start"),
          simRead(VESTING_CONFIG.vestingId, "get_cliff"),
          simRead(VESTING_CONFIG.vestingId, "get_duration"),
        ]);

      setState({
        totalAmount: Number(total ?? 0),
        vestedAmount: Number(vested ?? 0),
        claimedAmount: Number(claimed ?? 0),
        claimableAmount: Number(claimable ?? 0),
        start: Number(start ?? 0),
        cliff: Number(cliff ?? 0),
        duration: Number(duration ?? 0),
      });
    } catch (e) {
      console.error("[vesting] fetchState error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const handleClaim = async () => {
    if (!address || !walletsKit || !state || state.claimableAmount <= 0) return;
    setClaiming(true);
    setTxStatus({ type: "pending", msg: "Broadcasting claim…" });
    try {
      const account = await server.getAccount(address);
      const contract = new Contract(VESTING_CONFIG.vestingId);

      const tx = new TransactionBuilder(account, {
        fee: "10000",
        networkPassphrase: PASSPHRASE,
      })
        .addOperation(
          contract.call("claim", new Address(address).toScVal())
        )
        .setTimeout(30)
        .build();

      const prepared = await server.prepareTransaction(tx);
      const { signedTxXdr } = await walletsKit.signTransaction(
        prepared.toXDR()
      );

      const response = await server.sendTransaction(
        TransactionBuilder.fromXDR(signedTxXdr, PASSPHRASE)
      );

      if (response.status === "ERROR") throw new Error("Transaction rejected");

      const hash = response.hash;
      let getResponse = await server.getTransaction(hash);
      while (getResponse.status === "NOT_FOUND") {
        await new Promise((r) => setTimeout(r, 1000));
        getResponse = await server.getTransaction(hash);
      }

      if (getResponse.status === "SUCCESS") {
        setTxStatus({ type: "success", msg: "Tokens claimed!", hash });
        setTimeout(fetchState, 3000);
      } else {
        throw new Error("Transaction failed");
      }
    } catch (e: any) {
      setTxStatus({ type: "error", msg: e.message || "Claim failed" });
    } finally {
      setClaiming(false);
    }
  };

  const vestedPct = state
    ? Math.min((state.vestedAmount / state.totalAmount) * 100, 100)
    : 0;
  const claimedPct = state
    ? Math.min((state.claimedAmount / state.totalAmount) * 100, 100)
    : 0;

  const cliffEnd = state ? state.start + state.cliff : 0;
  const vestEnd = state ? state.start + state.duration : 0;
  const cliffLeft = Math.max(cliffEnd - now, 0);
  const vestLeft = Math.max(vestEnd - now, 0);
  const pastCliff = now >= cliffEnd;

  const explorerBase = "https://stellar.expert/explorer/testnet";

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Locked", value: state ? formatTokens(state.totalAmount) : "—", icon: Lock, color: "text-zinc-400" },
          { label: "Total Vested", value: state ? formatTokens(state.vestedAmount) : "—", icon: TrendingUp, color: "text-violet-400" },
          { label: "Claimed", value: state ? formatTokens(state.claimedAmount) : "—", icon: Unlock, color: "text-emerald-400" },
          { label: "Claimable Now", value: state ? formatTokens(state.claimableAmount) : "—", icon: Clock, color: "text-amber-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon size={14} className={color} />
              <span className="text-zinc-500 text-xs">{label}</span>
            </div>
            <p className={`text-xl font-black tabular-nums ${color}`}>
              {loading ? (
                <span className="block h-6 w-20 rounded bg-zinc-800 animate-pulse" />
              ) : (
                value
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Vesting Progress */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold text-sm">Vesting Progress</h2>
          <button
            onClick={fetchState}
            className="text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="relative h-3 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            className="absolute left-0 top-0 h-full bg-emerald-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${claimedPct}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
          <motion.div
            className="absolute top-0 h-full bg-violet-500/60 rounded-full"
            style={{ left: `${claimedPct}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(vestedPct - claimedPct, 0)}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>{vestedPct.toFixed(1)}% vested</span>
          <span>{claimedPct.toFixed(1)}% claimed</span>
        </div>

        {/* Cliff + duration */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-zinc-800/50 rounded-xl p-3">
            <p className="text-zinc-500 text-xs mb-1">Cliff</p>
            <p className={`font-bold text-sm ${pastCliff ? "text-emerald-400" : "text-amber-400"}`}>
              {loading ? "—" : pastCliff ? "✓ Passed" : formatTimeLeft(cliffLeft)}
            </p>
          </div>
          <div className="bg-zinc-800/50 rounded-xl p-3">
            <p className="text-zinc-500 text-xs mb-1">Fully Vested In</p>
            <p className={`font-bold text-sm ${vestLeft === 0 ? "text-emerald-400" : "text-violet-400"}`}>
              {loading ? "—" : vestLeft === 0 ? "✓ Complete" : formatTimeLeft(vestLeft)}
            </p>
          </div>
        </div>
      </div>

      {/* Claim */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-white font-bold text-sm mb-4">Claim Tokens</h2>

        {!address ? (
          <p className="text-zinc-500 text-sm">Connect your wallet to claim.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-zinc-800/50 rounded-xl px-4 py-3">
              <span className="text-zinc-400 text-sm">Available to claim</span>
              <span className="text-amber-400 font-black tabular-nums">
                {state ? formatTokens(state.claimableAmount) : "—"} tokens
              </span>
            </div>

            <button
              onClick={handleClaim}
              disabled={claiming || !state || state.claimableAmount <= 0}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500
                disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed
                text-white font-bold text-sm tracking-wider transition-all
                flex items-center justify-center gap-2"
            >
              {claiming ? (
                <>
                  <RotateCcw size={14} className="animate-spin" /> Claiming…
                </>
              ) : (
                "Claim Tokens"
              )}
            </button>
          </div>
        )}
      </div>

      {/* Contract Info */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-3">
        <h2 className="text-white font-bold text-sm mb-2">Contracts</h2>
        {[
          { label: "Vesting", id: VESTING_CONFIG.vestingId },
          { label: "Token", id: VESTING_CONFIG.tokenId },
        ].map(({ label, id }) => (
          <div key={label} className="flex items-center justify-between gap-4">
            <span className="text-zinc-500 text-xs w-12">{label}</span>
            <a
              href={`${explorerBase}/contract/${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-zinc-400 hover:text-violet-400
                transition-colors text-xs font-mono"
            >
              {id.slice(0, 8)}...{id.slice(-8)}
              <ExternalLink size={10} />
            </a>
          </div>
        ))}
      </div>

      {/* TX Toast */}
      <AnimatePresence>
        {txStatus && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-sm
              mx-4 p-4 rounded-2xl flex items-center justify-between gap-4
              border z-50 backdrop-blur
              ${txStatus.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : txStatus.type === "error"
                ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                : "bg-violet-500/10 border-violet-500/20 text-violet-400"
              }`}
          >
            <div className="flex items-center gap-3 font-bold text-sm">
              <AlertCircle size={15} />
              <span className="text-xs">{txStatus.msg}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {txStatus.hash && (
                <a
                  href={`${explorerBase}/tx/${txStatus.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <ExternalLink size={13} />
                </a>
              )}
              <button
                onClick={() => setTxStatus(null)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-zinc-500"
              >
                <X size={13} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}