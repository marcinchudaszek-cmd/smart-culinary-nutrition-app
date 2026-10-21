import { useEffect, useRef } from 'react';

// Stos obsługi systemowego przycisku „wstecz" (Android). Otwarte okno/arkusz
// rejestruje tu swoje zamknięcie — „wstecz" zamyka najpierw ostatnio otwarte
// okno, a dopiero gdy żadnego nie ma, App.tsx cofa do poprzedniego ekranu.
const stack: Array<{ id: number; close: () => void }> = [];
let nextId = 1;

export function useBackHandler(active: boolean, onBack: (() => void) | undefined) {
  const ref = useRef(onBack);
  ref.current = onBack;

  useEffect(() => {
    if (!active) return;
    const id = nextId++;
    stack.push({ id, close: () => ref.current?.() });
    return () => {
      const i = stack.findIndex((e) => e.id === id);
      if (i >= 0) stack.splice(i, 1);
    };
  }, [active]);
}

/** Zamyka ostatnio otwarte okno. Zwraca false, gdy żadne nie jest otwarte. */
export function closeTopOverlay(): boolean {
  const top = stack[stack.length - 1];
  if (!top) return false;
  top.close();
  return true;
}
