export interface AiAvailability {
  available: boolean;
  message?: string;
}

const unavailableMessage = 'خدمة الذكاء الاصطناعي غير مهيأة في هذه النسخة';

export function getAiAvailability(endpoint?: string): AiAvailability {
  if (!endpoint) return { available: false, message: unavailableMessage };
  try {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:') return { available: false, message: unavailableMessage };
    return { available: true };
  } catch {
    return { available: false, message: unavailableMessage };
  }
}

export async function requestAiJson<T>(endpoint: string | undefined, payload: unknown): Promise<T> {
  const availability = getAiAvailability(endpoint);
  if (!availability.available) throw new Error(availability.message);
  const response = await fetch(endpoint!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`فشل اتصال خدمة الذكاء الاصطناعي (${response.status})`);
  return response.json() as Promise<T>;
}
