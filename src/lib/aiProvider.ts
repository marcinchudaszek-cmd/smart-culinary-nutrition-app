export type AiProvider = 'groq' | 'gemini' | 'openrouter';

export interface AiRequest {
  text: string;
  imageDataUrl?: string;
  /** base64 data URL of a document (PDF, etc.) — Gemini only */
  documentDataUrl?: string;
}

// Maksymalna długość odpowiedzi. Darmowy Groq ma twardy limit 8000 tokenów/minutę,
// a rezerwacja max_tokens wlicza się do tego limitu — dlatego dla Groq trzymamy
// wartość nisko, żeby zapytania nie były odrzucane („request too large”).
function maxTokensFor(provider: AiProvider): number {
  if (provider === 'groq') return 2048;
  if (provider === 'openrouter') return 4096;
  return 8192; // Gemini — hojne darmowe limity
}

// Modele zapasowe dla dostawców zgodnych z OpenAI. Gdy wybrany model jest
// niedostępny albo ma wyczerpany limit, próbujemy kolejnych — jeden zablokowany
// model nie może wyłączać całego dostawcy.
const OPENROUTER_FALLBACKS = [
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'nvidia/nemotron-nano-12b-v2-vl:free',
  'openrouter/free',
];
const GROQ_FALLBACKS = [
  'qwen/qwen3.6-27b',
  'llama-3.3-70b-versatile',
  'openai/gpt-oss-20b',
];

export async function callAI(
  provider: AiProvider,
  apiKey: string,
  model: string,
  req: AiRequest,
): Promise<string> {
  const maxTokens = maxTokensFor(provider);
  if (provider === 'gemini') return callGemini(apiKey, model, req, maxTokens);
  if (provider === 'openrouter') {
    return callOpenAiCompat('https://openrouter.ai/api/v1/chat/completions', apiKey, model, req, maxTokens, OPENROUTER_FALLBACKS);
  }
  return callOpenAiCompat('https://api.groq.com/openai/v1/chat/completions', apiKey, model, req, maxTokens, GROQ_FALLBACKS);
}

// Czytelny komunikat, gdy dostawca wycofa model (zdarzyło się już z Gemini 1.5 i Llama 4).
// OpenRouter blokuje DARMOWE modele, dopóki na koncie nie włączy się zgody
// w ustawieniach prywatności. Zwraca wtedy 404 „No endpoints found matching
// your data policy" — co wygląda jak brak modelu, a jest ustawieniem konta.
export function isDataPolicyBlocked(msg: string): boolean {
  return /data policy|no endpoints found|free model publication|no allowed providers/i.test(msg);
}

/** Błąd z zachowanym surowym komunikatem dostawcy (przydatny do diagnozy). */
export function aiError(rawMsg: string, model: string): Error {
  const e = new Error(friendlyModelError(rawMsg, model)) as Error & { raw?: string };
  e.raw = rawMsg;
  return e;
}

function friendlyModelError(msg: string, _model: string): string {
  if (isDataPolicyBlocked(msg)) {
    return 'OpenRouter blokuje darmowe modele przy obecnych ustawieniach konta. '
      + 'Wejdź na openrouter.ai/settings/privacy i włącz darmowe modele („free endpoints"), '
      + 'albo przełącz dostawcę na Gemini w Ustawieniach → Skaner AI.';
  }
  if (isModelUnavailable(msg)) {
    return 'Model AI jest chwilowo niedostępny u dostawcy. Spróbuj ponownie lub przełącz dostawcę w Ustawieniach → Skaner AI (np. na Gemini).';
  }
  if (/limit:\s*0/i.test(msg)) {
    return 'Ten model nie jest dostępny na darmowym planie. Przełącz dostawcę w Ustawieniach → Skaner AI (Gemini lub OpenRouter).';
  }
  if (/quota|rate limit|429|RESOURCE_EXHAUSTED/i.test(msg)) {
    return 'Wyczerpany dzienny limit zapytań AI. Spróbuj później albo przełącz dostawcę w Ustawieniach → Skaner AI.';
  }
  return msg;
}

async function callOpenAiCompat(
  baseUrl: string,
  apiKey: string,
  model: string,
  req: AiRequest,
  maxTokens: number,
  fallbacks: string[] = [],
): Promise<string> {
  const content: unknown[] = [{ type: 'text', text: req.text }];
  if (req.imageDataUrl) {
    content.push({ type: 'image_url', image_url: { url: req.imageDataUrl } });
  }

  const candidates = [model, ...fallbacks].filter((m, i, a) => a.indexOf(m) === i);
  let lastErr = 'Błąd połączenia';

  for (const m of candidates) {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: m,
        messages: [{ role: 'user', content }],
        temperature: 0.3,
        max_tokens: maxTokens,
      }),
    });

    if (res.ok) {
      const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
      const text = (data.choices?.[0]?.message?.content ?? '').trim();
      if (text) return text;
      lastErr = 'Model zwrócił pustą odpowiedź.';
      continue;
    }

    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    lastErr = err?.error?.message ?? `HTTP ${res.status}`;
    // Problem z konfiguracją konta (np. polityka danych) dotyczy wszystkich
    // darmowych modeli — zmiana modelu nic nie da, więc przerywamy od razu.
    if (isDataPolicyBlocked(lastErr)) break;
    if (!isModelUnavailable(lastErr) && !isRateLimited(lastErr) && res.status !== 429) break;
  }
  throw aiError(lastErr, model);
}

// Google regularnie wygasza modele Gemini dla nowych kluczy (1.5 → 2.5 → 3.x…).
// Dlatego próbujemy po kolei kilku modeli: preferowany, potem alias „always latest"
// i sprawdzone modele zapasowe. Jeśli model jest niedostępny (404/„no longer
// available"), lecimy do następnego — bez potrzeby aktualizacji aplikacji.
const GEMINI_FALLBACKS = [
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-2.0-flash',
  'gemini-flash-latest',
];

/**
 * Wyciąga JSON z odpowiedzi modelu. Modele lubią owijać wynik w ```json,
 * dopisywać zdanie przed/po albo urywać tekst — dlatego szukamy największego
 * bloku { } / [ ] zamiast ufać, że cała odpowiedź to czysty JSON.
 */
export function parseAiJson<T>(raw: string): T {
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  if (!cleaned) throw new Error('AI zwróciło pustą odpowiedź. Spróbuj ponownie.');

  const candidates: string[] = [cleaned];
  const obj = cleaned.match(/\{[\s\S]*\}/);
  const arr = cleaned.match(/\[[\s\S]*\]/);
  if (obj) candidates.push(obj[0]);
  if (arr) candidates.push(arr[0]);

  for (const c of candidates) {
    try { return JSON.parse(c) as T; } catch { /* próbuj dalej */ }
  }
  throw new Error('AI zwróciło odpowiedź w nieoczekiwanym formacie. Spróbuj ponownie.');
}

function isModelUnavailable(msg: string): boolean {
  return /no longer available|does not exist|do not have access|not found|is not supported|not available to new|no such model|unknown model|invalid model|model_not_found|deprecated|decommissioned/i.test(msg);
}

// Limit zapytań dotyczy KONKRETNEGO modelu — inny model ma własną pulę,
// więc w takim wypadku też warto spróbować kolejnego z listy.
function isRateLimited(msg: string): boolean {
  return /quota|rate limit|429|RESOURCE_EXHAUSTED|limit:\s*0|overloaded|UNAVAILABLE/i.test(msg);
}

async function callGemini(apiKey: string, model: string, req: AiRequest, maxTokens: number): Promise<string> {
  const parts: unknown[] = [{ text: req.text }];
  if (req.imageDataUrl) {
    const [header, data] = req.imageDataUrl.split(',');
    const mimeMatch = header.match(/data:([^;]+)/);
    parts.push({ inline_data: { mime_type: mimeMatch?.[1] ?? 'image/jpeg', data } });
  }
  if (req.documentDataUrl) {
    const [header, data] = req.documentDataUrl.split(',');
    const mimeMatch = header.match(/data:([^;]+)/);
    parts.unshift({ inline_data: { mime_type: mimeMatch?.[1] ?? 'application/pdf', data } });
  }
  const body = JSON.stringify({
    contents: [{ parts }],
    generationConfig: { temperature: 0.3, maxOutputTokens: maxTokens },
  });

  // Kolejka modeli do wypróbowania: wybrany + zapasowe (bez duplikatów).
  const candidates = [model, ...GEMINI_FALLBACKS].filter((m, i, a) => a.indexOf(m) === i);
  let lastErr = 'Błąd połączenia';

  for (const m of candidates) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body },
    );
    if (res.ok) {
      const data = await res.json() as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string; thought?: boolean }> };
          finishReason?: string;
        }>;
      };
      const cand = data.candidates?.[0];
      // Modele „thinking" (3.x) zwracają kilka części — pierwsza bywa myśleniem
      // bez tekstu. Sklejamy wszystkie części z tekstem, pomijając myśli.
      const text = (cand?.content?.parts ?? [])
        .filter((p) => !p.thought && typeof p.text === 'string')
        .map((p) => p.text as string)
        .join('')
        .trim();
      if (text) return text;
      // Pusta odpowiedź (np. budżet tokenów zjedzony przez „myślenie”) →
      // spróbuj kolejnego modelu zamiast zwracać pustkę, która psuje parsowanie.
      lastErr = cand?.finishReason === 'MAX_TOKENS'
        ? 'Model zwrócił pustą odpowiedź (limit długości).'
        : 'Model zwrócił pustą odpowiedź.';
      continue;
    }
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    lastErr = err?.error?.message ?? `HTTP ${res.status}`;
    // Model niedostępny albo wyczerpany limit → spróbuj kolejnego modelu.
    // Przerywamy tylko przy błędach, których zmiana modelu nie naprawi (np. zły klucz).
    if (!isModelUnavailable(lastErr) && !isRateLimited(lastErr) && res.status !== 429) break;
  }
  throw aiError(lastErr, model);
}
