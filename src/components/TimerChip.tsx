import { useEffect } from 'react';
import { Pause, Play, X, Timer } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCookingTimer, useTimerLeft, fmtTimer } from '../lib/cookingTimer';

// Krótki sygnał dźwiękowy bez pliku audio (Web Audio) — gdy aplikacja jest na ekranie.
function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.35, 0.7].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.25, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.3);
    });
    setTimeout(() => void ctx.close(), 1500);
  } catch { /* bez dźwięku */ }
}

// Pilnuje końca odliczania w całej aplikacji i pokazuje mały licznik poza widokiem przepisu.
export default function TimerChip({ visible }: { visible: boolean }) {
  const timer = useCookingTimer();
  const left = useTimerLeft();
  const running = timer.endAt !== null;

  useEffect(() => {
    if (running && left === 0) {
      timer.finish();
      beep();
      try { navigator.vibrate?.([400, 200, 400]); } catch { /* brak wibracji */ }
      toast(`⏰ Czas minął!${timer.label ? ` — ${timer.label}` : ''}`, { duration: 6000 });
    }
  }, [running, left, timer]);

  const paused = !running && timer.pausedLeft !== null;
  if (!visible || (!running && !paused && !timer.done)) return null;

  return (
    <div className="fixed top-[calc(var(--sa-top)+8px)] left-1/2 -translate-x-1/2 z-[55]">
      <div className={`flex items-center gap-2 rounded-full pl-3 pr-1.5 py-1.5 shadow-lg text-white text-sm font-semibold ${timer.done ? 'bg-green-600' : 'bg-gray-900/90'}`}>
        <Timer size={15} />
        <span className="tabular-nums">{timer.done ? 'Gotowe!' : fmtTimer(left)}</span>
        {timer.label && <span className="max-w-[120px] truncate text-white/70 font-normal">{timer.label}</span>}
        {!timer.done && (
          <button
            onClick={() => (running ? timer.pause() : timer.start(timer.label))}
            className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center"
            aria-label={running ? 'Pauza' : 'Wznów'}
          >
            {running ? <Pause size={14} /> : <Play size={14} />}
          </button>
        )}
        <button onClick={() => timer.reset()} className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center" aria-label="Wyłącz minutnik">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
