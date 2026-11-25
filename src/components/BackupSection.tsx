import { useRef, useState } from 'react';
import { Download, Upload, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { exportBackup, parseBackup, restoreBackup, describeBackup } from '../lib/backup';

// Sekcja Ustawień: kopia zapasowa danych do pliku i przywracanie z pliku.
export default function BackupSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [lastAt, setLastAt] = useState<string | null>(() => {
    try { return localStorage.getItem('lastBackupAt'); } catch { return null; }
  });

  const doExport = async () => {
    setBusy(true);
    try {
      await exportBackup();
      setLastAt(new Date().toISOString());
      toast.success('Kopia gotowa — zapisz ją na Dysku, w mailu albo w Plikach');
    } catch (e) {
      // Zamknięcie okna „Udostępnij” bez wyboru też kończy się błędem — to nie jest awaria.
      const msg = e instanceof Error ? e.message : '';
      if (!/cancel/i.test(msg)) toast.error('Nie udało się utworzyć kopii: ' + msg);
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    ev.target.value = '';
    if (!file) return;
    try {
      const backup = parseBackup(await file.text());
      const ok = window.confirm(
        `${describeBackup(backup)}\n\nPrzywrócenie ZASTĄPI obecne dane w aplikacji (klucze API zostaną). Kontynuować?`,
      );
      if (!ok) return;
      restoreBackup(backup);
      toast.success('Dane przywrócone — uruchamiam aplikację ponownie');
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Nie udało się wczytać kopii');
    }
  };

  const lastLabel = lastAt
    ? new Date(lastAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
      <h2 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
        <ShieldCheck size={18} className="text-emerald-500" /> Kopia zapasowa
      </h2>
      <p className="text-xs text-gray-400 mb-4">
        Dziennik, przepisy, waga, plan posiłków i spiżarnia są zapisane tylko na tym telefonie.
        Zrób kopię przed zmianą telefonu albo odinstalowaniem aplikacji.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={doExport}
          disabled={busy}
          className="flex items-center justify-center gap-2 bg-emerald-500 text-white py-3 rounded-xl font-semibold text-sm active:scale-95 transition-all disabled:opacity-60"
        >
          <Download size={16} /> Zapisz kopię
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold text-sm active:scale-95 transition-all"
        >
          <Upload size={16} /> Przywróć
        </button>
      </div>
      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
      <p className="text-[11px] text-gray-400 mt-3">
        {lastLabel ? `Ostatnia kopia: ${lastLabel}.` : 'Nie zrobiono jeszcze kopii.'} Klucze API nie trafiają do pliku.
      </p>
    </div>
  );
}
