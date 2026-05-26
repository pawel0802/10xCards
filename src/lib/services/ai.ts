function getEnvVar(name: string): string | undefined {
  try {
    // Astro SSR runtime — loaded dynamically to avoid breaking non-Astro environments
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require("astro:env/server") as Record<string, string>)[name];
  } catch {
    return process.env[name];
  }
}

export interface FlashcardCandidate {
  front: string;
  back: string;
}

export async function generateFlashcardsFromText(text: string): Promise<FlashcardCandidate[]> {
  // Ensure API key is never logged or committed
const apiKey = getEnvVar("OPENROUTER_API_KEY");
  const model = getEnvVar("OPENROUTER_MODEL") ?? "gpt-4.1";

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set in environment variables.");
  }

  // Retry logic for transient API failures
  let response: Response | undefined;
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "You are an expert at creating spaced repetition flashcards. " +
                'Always respond with a valid JSON array of objects, each with "front" and "back" string fields. ' +
                "No markdown, no explanation — only the JSON array.",
            },
            {
              role: "user",
              content: `Generate flashcards from the following text:\n${text}`,
            },
          ],
          max_tokens: 1024,
        }),
      });
      if (response.ok) break;
      lastError = new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    } catch (err) {
      lastError = err;
    }
    if (attempt < 3) await new Promise((res) => setTimeout(res, 500 * attempt));
  }
  if (!response || !response.ok) {
    throw lastError || new Error("OpenRouter API call failed");
  }

  const data = await response.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`AI returned invalid JSON. Output truncated: ${content.slice(0, 100)}...`);
  }

  if (
    !Array.isArray(parsed) ||
    !parsed.every(
      (item) =>
        item !== null &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>).front === "string" &&
        typeof (item as Record<string, unknown>).back === "string",
    )
  ) {
    throw new Error("AI response did not match expected flashcard format.");
  }

  return parsed as FlashcardCandidate[];
}
