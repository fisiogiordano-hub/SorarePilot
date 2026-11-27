import { useEffect, useState } from "react";
import { Puzzle, RefreshCw, Pause, Play, Square, ExternalLink, Download } from "lucide-react";
import { isExtensionReady, requestQueueState, subscribeExtension, pauseQueue, resumeQueue, stopQueue } from "./extension-client";
import type { QueueState } from "./extension-client";

const STORE_URL = (import.meta as { env?: Record<string, string> }).env?.VITE_EXTENSION_STORE_URL || "https://microsoftedge.microsoft.com/addons";

export type SorareFlowKind = "missions" | "lineups" | "sales" | "home";

interface ExtensionBarProps {
  activeFlow?: SorareFlowKind;
  showSorareGuide?: boolean;
}

function getSorareTargetUrl(flow: SorareFlowKind): { url: string; label: string } {
  switch (flow) {
    case "missions": return { url: "https://sorare.com/football/play", label: "Apri Missioni Sorare" };
    case "lineups": return { url: "https://sorare.com/football/play", label: "Apri Formazioni Sorare" };
    case "sales": return { url: "https://sorare.com/football/my-club/cards", label: "Apri Carte / Vendite Sorare" };
    default: return { url: "https://sorare.com", label: "Apri Sorare" };
  }
}

const emptyState: QueueState = { mode: "idle", flow: null, currentItem: null, remainingCount: 0, completedCount: 0, totalCount: 0, items: [], lastMessage: "" };

export function ExtensionBar({ activeFlow = "home", showSorareGuide = true }: ExtensionBarProps) {
  const [ready, setReady] = useState<boolean>(() => isExtensionReady());
  const [qState, setQState] = useState<QueueState>(emptyState);
  const [selectedFlow, setSelectedFlow] = useState<SorareFlowKind>(activeFlow);
  useEffect(() => { setSelectedFlow(activeFlow); }, [activeFlow]);
  useEffect(() => {
    setReady(isExtensionReady()); requestQueueState();
    const unsub = subscribeExtension((ev) => { if (ev.type === "ready") { setReady(true); requestQueueState(); } else if (ev.type === "state") { setReady(true); setQState(ev.state); } });
    const onFlowStarted = (e: Event) => { const fl = (e as CustomEvent<{ flow?: SorareFlowKind }>).detail?.flow; if (fl) setSelectedFlow(fl); };
    window.addEventListener("sorarepilot:flow-started", onFlowStarted);
    return () => { unsub(); window.removeEventListener("sorarepilot:flow-started", onFlowStarted); };
  }, []);
  const effectiveFlow: SorareFlowKind = (qState.flow as SorareFlowKind) || selectedFlow;
  const target = getSorareTargetUrl(effectiveFlow);
  const openSorarePage = () => window.open(target.url, "_blank", "noopener,noreferrer");
  const openStorePage = () => window.open(STORE_URL, "_blank", "noopener,noreferrer");
  return (
    <div className="bg-[#16161a] border border-[#2a2a32] p-6 rounded-2xl space-y-4 shadow-md text-white">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0"><Puzzle className="h-5 w-5" /></div>
          <div>
            <h3 className="text-base font-bold text-white">{ready ? "Estensione attiva" : "Estensione non rilevata"}</h3>
            <p className="text-xs text-zinc-400">Stato: {qState.mode} - {qState.completedCount}/{qState.totalCount}{qState.lastMessage ? " - " + qState.lastMessage : ""}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!ready && (<button type="button" onClick={openStorePage} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white border border-blue-500/40 transition-colors cursor-pointer"><Download className="h-3.5 w-3.5" />Installa estensione</button>)}
          <button type="button" onClick={() => { requestQueueState(); setReady(isExtensionReady()); }} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#1e1e26] hover:bg-[#272732] text-zinc-200 border border-[#2f2f3a] transition-colors cursor-pointer"><RefreshCw className="h-3.5 w-3.5" />Verifica stato</button>
          <button type="button" onClick={() => pauseQueue()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#1e1e26] hover:bg-[#272732] text-zinc-200 border border-[#2f2f3a] transition-colors cursor-pointer"><Pause className="h-3.5 w-3.5" />Pausa</button>
          <button type="button" onClick={() => resumeQueue()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#1e1e26] hover:bg-[#272732] text-zinc-200 border border-[#2f2f3a] transition-colors cursor-pointer"><Play className="h-3.5 w-3.5" />Riprendi</button>
          <button type="button" onClick={() => stopQueue()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-red-950/70 hover:bg-red-900/70 text-red-200 border border-red-800/60 transition-colors cursor-pointer"><Square className="h-3.5 w-3.5" />Stop</button>
        </div>
      </div>
      {showSorareGuide && (
        <div className="bg-[#0e0e12] border border-[#282834] px-4 py-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-300">
          <span>Tieni sempre aperta e loggata una scheda di Sorare in un altra pagina.</span>
          <button type="button" onClick={openSorarePage} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/40 transition-colors cursor-pointer"><ExternalLink className="h-3.5 w-3.5" />{target.label}</button>
        </div>
      )}
    </div>
  );
}

export default ExtensionBar;
