import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import {
  AppUpdate,
  AppUpdateAvailability,
  FlexibleUpdateInstallStatus,
} from '@capawesome/capacitor-app-update';
import { Download, RefreshCw, Sparkles, X } from 'lucide-react';
import { appVersion } from '../lib/appInfo';
import { pendingChangelog, markVersionSeen, type ChangelogEntry } from '../lib/changelog';
import { useBackHandler } from '../lib/backButton';
import { useAppStore } from '../store/useAppStore';

// „Później” chowa propozycję danej wersji na 2 dni.
const SNOOZE_KEY = 'kulinapp.updateSnooze';
const SNOOZE_MS = 2 * 24 * 3600 * 1000;

function snoozed(code: string | undefined): boolean {
  try {
    const s = JSON.parse(localStorage.getItem(SNOOZE_KEY) || 'null') as { code?: string; until?: number } | null;
    return !!s && s.code === code && (s.until ?? 0) > Date.now();
  } catch { return false; }
}
function snooze(code: string | undefined) {
  try { localStorage.setItem(SNOOZE_KEY, JSON.stringify({ code, until: Date.now() + SNOOZE_MS })); } catch { /* bez pamięci */ }
}

type Offer = { state: 'available'; version?: string; code?: string; flexible: boolean }
  | { state: 'downloading'; percent: number | null }
  | { state: 'ready' };

/**
 * Aktualizacje z Google Play (In-App Updates) + okienko „Co nowego” po aktualizacji.
 * Sprawdza Play przy starcie i przy powrocie do aplikacji; działa tylko w instalacji ze Sklepu Play.
 */
export default function UpdatePrompt() {
  const onboardingDone = useAppStore((s) => s.onboardingDone);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [news, setNews] = useState<ChangelogEntry[]>([]);

  // Co nowego — raz po zmianie wersji.
  useEffect(() => {
    setNews(pendingChangelog(appVersion, onboardingDone));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;
    let alive = true;

    const check = async () => {
      try {
        const info = await AppUpdate.getAppUpdateInfo();
        if (!alive) return;
        if (info.installStatus === FlexibleUpdateInstallStatus.DOWNLOADED) {
          setOffer({ state: 'ready' });
          return;
        }
        if (info.updateAvailability === AppUpdateAvailability.UPDATE_AVAILABLE && !snoozed(info.availableVersionCode)) {
          setOffer((cur) => cur ?? {
            state: 'available',
            version: info.availableVersionName,
            code: info.availableVersionCode,
            flexible: info.flexibleUpdateAllowed !== false,
          });
        }
      } catch { /* aplikacja spoza Sklepu Play albo brak sieci — po cichu */ }
    };

    const progress = AppUpdate.addListener('onFlexibleUpdateStateChange', (s) => {
      if (s.installStatus === FlexibleUpdateInstallStatus.DOWNLOADED) setOffer({ state: 'ready' });
      else if (s.installStatus === FlexibleUpdateInstallStatus.DOWNLOADING) {
        const pct = s.totalBytesToDownload ? Math.round(((s.bytesDownloaded ?? 0) / s.totalBytesToDownload) * 100) : null;
        setOffer({ state: 'downloading', percent: pct });
      } else if (s.installStatus === FlexibleUpdateInstallStatus.FAILED || s.installStatus === FlexibleUpdateInstallStatus.CANCELED) {
        setOffer(null);
      }
    });
    const resume = CapApp.addListener('resume', () => void check());
    const t = setTimeout(() => void check(), 2500); // po starcie, żeby nie spowalniać otwarcia

    return () => {
      alive = false;
      clearTimeout(t);
      void progress.then((h) => h.remove());
      void resume.then((h) => h.remove());
    };
  }, []);

  const startUpdate = async () => {
    if (offer?.state !== 'available') return;
    try {
      if (offer.flexible) {
        setOffer({ state: 'downloading', percent: null });
        await AppUpdate.startFlexibleUpdate();
      } else {
        setOffer(null);
        await AppUpdate.performImmediateUpdate();
      }
    } catch {
      setOffer(null);
      try { await AppUpdate.openAppStore(); } catch { /* brak Sklepu Play */ }
    }
  };

  const closeNews = () => {
    markVersionSeen(appVersion);
    setNews([]);
  };
  useBackHandler(news.length > 0, closeNews);

  return (
    <>
      {offer && (
        <div className="fixed left-3 right-3 bottom-[calc(132px+var(--sa-bottom))] z-[56] max-w-lg mx-auto">
          <div className="flex items-center gap-3 rounded-2xl bg-gray-900/95 text-white shadow-xl px-4 py-3">
            <div className="w-9 h-9 shrink-0 rounded-full bg-orange-500 flex items-center justify-center">
              {offer.state === 'ready' ? <RefreshCw size={18} /> : <Download size={18} />}
            </div>
            <div className="flex-1 min-w-0 text-sm">
              {offer.state === 'available' && (
                <>
                  <div className="font-semibold">Dostępna nowa wersja{offer.version ? ` ${offer.version}` : ''}</div>
                  <div className="text-white/70 text-xs">Zaktualizuj, żeby mieć najnowsze przepisy i poprawki</div>
                </>
              )}
              {offer.state === 'downloading' && (
                <>
                  <div className="font-semibold">Pobieranie aktualizacji{offer.percent !== null ? ` — ${offer.percent}%` : '…'}</div>
                  <div className="text-white/70 text-xs">Możesz dalej korzystać z aplikacji</div>
                </>
              )}
              {offer.state === 'ready' && (
                <>
                  <div className="font-semibold">Aktualizacja pobrana</div>
                  <div className="text-white/70 text-xs">Uruchom ponownie, żeby ją zainstalować</div>
                </>
              )}
            </div>
            {offer.state === 'available' && (
              <>
                <button onClick={() => void startUpdate()} className="shrink-0 rounded-full bg-orange-500 px-3 py-1.5 text-sm font-semibold">
                  Aktualizuj
                </button>
                <button
                  onClick={() => { snooze(offer.code); setOffer(null); }}
                  className="shrink-0 w-7 h-7 rounded-full bg-white/15 flex items-center justify-center"
                  aria-label="Później"
                >
                  <X size={14} />
                </button>
              </>
            )}
            {offer.state === 'ready' && (
              <button onClick={() => void AppUpdate.completeFlexibleUpdate()} className="shrink-0 rounded-full bg-orange-500 px-3 py-1.5 text-sm font-semibold">
                Uruchom ponownie
              </button>
            )}
          </div>
        </div>
      )}

      {news.length > 0 && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 p-3" onClick={closeNews}>
          <div
            className="w-full max-w-md rounded-3xl bg-white dark:bg-gray-800 p-5 shadow-2xl max-h-[80dvh] overflow-y-auto mb-[var(--sa-bottom)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-orange-100 dark:bg-orange-500/20 text-orange-500 flex items-center justify-center">
                <Sparkles size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Co nowego w KulinApp</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Wersja {appVersion}</p>
              </div>
            </div>
            {news.map((e) => (
              <div key={e.version} className="mb-4 last:mb-2">
                {news.length > 1 && (
                  <div className="text-xs font-semibold uppercase tracking-wide text-orange-500 mb-1.5">Wersja {e.version}</div>
                )}
                <ul className="space-y-1.5">
                  {e.items.map((it) => (
                    <li key={it} className="flex gap-2 text-sm text-gray-700 dark:text-gray-200">
                      <span className="text-orange-500 mt-0.5">•</span>
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <button onClick={closeNews} className="mt-3 w-full rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3">
              Super, dzięki!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
