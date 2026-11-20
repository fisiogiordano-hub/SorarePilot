import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { seedSampleCollection } from '../lib/collection-service';
import { fetchAndSyncSorareUserCards } from '../lib/sorare-api-service';

function SettingsPage() {
  const [nickname, setNickname] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSyncSorare = async () => {
    if (!nickname.trim()) {
      setSyncStatus({ type: 'error', message: 'Inserisci un nickname Sorare valido.' });
      return;
    }

    setLoading(true);
    setSyncStatus(null);

    const result = await fetchAndSyncSorareUserCards(nickname.trim(), apiKey.trim());
    setLoading(false);

    if (result.success) {
      setSyncStatus({
        type: 'success',
        message: `Sincronizzazione completata! ${result.cardsCount} carte reali importate.`,
      });
      setTimeout(() => {
        window.location.href = '/collection';
      }, 1500);
    } else {
      setSyncStatus({
        type: 'error',
        message: result.error || 'Impossibile sincronizzare l\'account.',
      });
    }
  };

  const handleResetData = () => {
    if (confirm('Vuoi davvero ripristinare i dati demo di prova?')) {
      seedSampleCollection();
      alert('Dati di mock ripristinati con successo!');
      window.location.reload();
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6 text-white">
      <div>
        <h1 className="text-2xl font-bold">Collega Account Sorare</h1>
        <p className="text-sm text-gray-400 mt-1">
          Inserisci il tuo Nickname e la tua API Key per sincronizzare la tua galleria reale.
        </p>
      </div>

      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-4">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-mono uppercase text-gray-400 block mb-1">
              Nickname Sorare *
            </label>
            <input
              type="text"
              placeholder="Es. IlTuoNickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3.5 py-2 text-sm text-white outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-mono uppercase text-gray-400 block mb-1">
              API Key Sorare (Opzionale)
            </label>
            <input
              type="password"
              placeholder="Incolla la tua API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3.5 py-2 text-sm text-white outline-none focus:border-emerald-500"
            />
          </div>

          <button
            onClick={handleSyncSorare}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Sincronizzazione in corso...' : 'Sincronizza Galleria Reale'}
          </button>
        </div>

        {syncStatus && (
          <div
            className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
              syncStatus.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}
          >
            <span>{syncStatus.message}</span>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-gray-800">
        <button
          onClick={handleResetData}
          className="text-xs text-gray-400 hover:text-white underline cursor-pointer"
        >
          Ripristina Carte Demo
        </button>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});