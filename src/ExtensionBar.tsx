import React, { useEffect, useState } from "react";
import { isExtensionReady, subscribeExtension, pauseQueue, resumeQueue, stopQueue, type QueueState, type ExtEvent } from "./extension-client";

const EXTENSION_ZIP_URL = "/sorarepilot-extension.zip";

export const ExtensionBar: React.FC = () => {
  const [ready, setReady] = useState<boolean>(() => isExtensionReady());
  const [qState, setQState] = useState<QueueState | null>(null);
  const [showGuide, setShowGuide] = useState<boolean>(false);

  useEffect(() => {
    const unsub = subscribeExtension((ev: ExtEvent) => {
      if (ev.type === "ready") setReady(true);
      if (ev.type === "state") setQState(ev.state);
    });
    return unsub;
  }, []);

  const mode = qState ? qState.mode : "idle";
  const flow = qState ? qState.flow : null;
  const cur = qState && qState.currentItem ? (qState.currentItem.label || qState.currentItem.id || "elemento") : "--";
  const rem = qState ? (qState.remainingCount + "/" + qState.totalCount) : "0/0";
  const msg = qState ? qState.lastMessage : (ready ? "Pronto" : "Estensione non rilevata");

  return (
    <div className="flex flex-col gap-2 px-3 py-2.5 mb-3 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <span className={ready ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
            {ready ? "Estensione attiva" : "Estensione offline"}
          </span>
          <span>Stato: <strong>{flow ? mode + " (" + flow + ")" : mode}</strong></span>
          <span>In corso: <strong>{cur}</strong></span>
          <span>Rimanenti: <strong>{rem}</strong></span>
          <span className="text-slate-400">{msg}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <a
            href={EXTENSION_ZIP_URL}
            download="sorarepilot-extension.zip"
            className={ready
              ? "px-2.5 py-1 rounded bg-slate-800 border border-slate-600 text-slate-200 font-semibold hover:bg-slate-700"
              : "px-2.5 py-1 rounded bg-sky-500 text-slate-950 font-semibold hover:bg-sky-400"}
          >
            {ready ? "Scarica .ZIP" : "Scarica / Installa estensione"}
          </a>
          <button
            type="button"
            onClick={() => setShowGuide((v) => !v)}
            className="px-2.5 py-1 rounded bg-slate-800 border border-slate-600 text-slate-300 font-semibold hover:bg-slate-700"
          >
            {showGuide ? "Nascondi guida" : "Come installare"}
          </button>
          <button type="button" onClick={pauseQueue} className="px-2.5 py-1 rounded bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400">Pausa</button>
          <button type="button" onClick={resumeQueue} className="px-2.5 py-1 rounded bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400">Riprendi</button>
          <button type="button" onClick={stopQueue} className="px-2.5 py-1 rounded bg-rose-600 text-white font-semibold hover:bg-rose-500">Stop</button>
        </div>
      </div>
      {showGuide && (
        <div className="px-3 py-2 rounded bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
          <strong>Installazione manuale su Chrome:</strong> 1) Scarica e decomprimi <code>sorarepilot-extension.zip</code> in una cartella fissa. 2) Apri <code>chrome://extensions</code> e attiva <strong>Modalità sviluppatore</strong>. 3) Clicca <strong>Carica estensione non pacchettizzata</strong> e seleziona la cartella estratta.
        </div>
      )}
    </div>
  );
};

export default ExtensionBar;
