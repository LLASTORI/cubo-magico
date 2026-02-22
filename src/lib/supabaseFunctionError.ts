interface SupabaseFunctionErrorLike {
  message?: string;
  context?: Response;
}

/**
 * Extracts a human-readable message from Supabase Edge Function invoke errors.
 * Supabase often returns a generic "Edge Function returned a non-2xx status code"
 * while the actual error payload lives inside `error.context`.
 */
export async function getFunctionErrorMessage(
  error: SupabaseFunctionErrorLike | null | undefined,
  fallback = 'Falha ao executar função.'
): Promise<string> {
  if (!error) return fallback;

  const genericMessage = error.message || fallback;
  const response = error.context;

  if (!response) return genericMessage;

  try {
    const text = await response.text();
    if (!text) return genericMessage;

    try {
      const parsed = JSON.parse(text);
      if (typeof parsed?.error === 'string' && parsed.error.trim()) return parsed.error;
      if (typeof parsed?.message === 'string' && parsed.message.trim()) return parsed.message;
      if (typeof parsed?.details === 'string' && parsed.details.trim()) return parsed.details;
    } catch {
      // Non-JSON response
    }

    return text;
  } catch {
    return genericMessage;
  }
}

