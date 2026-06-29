// AI moderation — runs server-side so it can never be bypassed from the phone.
// Every free topic and every comment passes through here BEFORE it is stored.

export type ModerationCategory =
  | "none"
  | "harassment"
  | "sexual"
  | "spam"
  | "medical_misinfo"
  | "hate"
  | "other";

export interface ModerationResult {
  allowed: boolean;
  category: ModerationCategory;
}

const VALID_CATEGORIES: ModerationCategory[] = [
  "none",
  "harassment",
  "sexual",
  "spam",
  "medical_misinfo",
  "hate",
  "other",
];

const SYSTEM_PROMPT = `You are a strict but fair content moderator for "NonToxic Hub", a community forum inside a health app. Members discuss the toxicity of food, cosmetics and household products, debate ingredients, ask questions, and "denounce" (report) products they find harmful or carcinogenic.

Analyze the user's post or comment (it may be French, English or Korean) and decide whether it can be published.

BLOCK the content ONLY when it clearly contains one of:
- harassment: insults, personal attacks, bullying, threats aimed at a PERSON.
- sexual: sexual or +18 content, sexual solicitation.
- spam: scams, repetitive advertising, links to unrelated promotions, pure gibberish.
- medical_misinfo: DANGEROUS medical misinformation that could harm someone (e.g. "stop your chemotherapy", "drink bleach to cure cancer", fake miracle cures presented as fact).
- hate: hate speech or discrimination against a protected group (race, religion, gender, sexual orientation, disability, nationality).

ALLOW normal forum activity, including:
- Strong criticism of PRODUCTS, BRANDS or INGREDIENTS — denouncing toxic products is the whole purpose of this app and is encouraged.
- Opinions, questions, health tips, debates about additives, sharing personal experiences.
- Mild frustration or strong wording ABOUT A PRODUCT is NOT harassment.

Respond ONLY with a JSON object of the exact shape:
{"allowed": true|false, "category": "none|harassment|sexual|spam|medical_misinfo|hate|other"}
If allowed is true, category MUST be "none". If allowed is false, category MUST be the single best matching reason.`;

interface ModEnv {
  EXPO_PUBLIC_OPEN_AI?: string;
}

/**
 * Classifies free text. Fails OPEN (allows) on configuration/network errors so an
 * AI outage never freezes the whole forum — the report + auto-hide system is the
 * backstop for anything that slips through during such a window.
 */
export async function moderateText(
  text: string,
  context: string,
  env: ModEnv,
): Promise<ModerationResult> {
  const trimmed = (text ?? "").trim();
  if (trimmed.length === 0) return { allowed: true, category: "none" };

  const apiKey = env.EXPO_PUBLIC_OPEN_AI;
  if (!apiKey) {
    console.warn("[moderation] No OpenAI key configured — failing open");
    return { allowed: true, category: "none" };
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-nano",
        max_tokens: 120,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Context: ${context}\n\nContent to moderate:\n"""${trimmed.slice(0, 4000)}"""`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[moderation] API error", res.status, errText.slice(0, 300));
      return { allowed: true, category: "none" };
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data?.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(content) as { allowed?: unknown; category?: unknown };

    const allowed = parsed.allowed !== false;
    let category = (typeof parsed.category === "string" ? parsed.category : "none") as ModerationCategory;
    if (!VALID_CATEGORIES.includes(category)) {
      category = allowed ? "none" : "other";
    }
    if (allowed) category = "none";
    else if (category === "none") category = "other";

    console.log("[moderation] verdict", { allowed, category, context });
    return { allowed, category };
  } catch (e) {
    console.error("[moderation] Exception — failing open", e);
    return { allowed: true, category: "none" };
  }
}
