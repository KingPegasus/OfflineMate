import { describe, expect, it } from "vitest";
import {
  isRagAnswerGroundedInSnippets,
  isRagDismissiveRefusal,
  ragAnswerOrFallback,
  tidySnippet,
  verbatimRagFallback,
} from "@/ai/rag-grounding";

describe("rag-grounding", () => {
  const snippet = "Need to go to dentist for checkup next Tuesday.";

  it("accepts answers that contain a long substring of the note", () => {
    expect(
      isRagAnswerGroundedInSnippets(
        "You saved that you need to go to the dentist for a checkup next Tuesday.",
        [snippet],
      ),
    ).toBe(true);
  });

  it("rejects generic trivia with no overlap in wording", () => {
    expect(
      isRagAnswerGroundedInSnippets(
        "Dentists provide dental care including fillings and extractions.",
        [snippet],
      ),
    ).toBe(false);
  });

  it("replaces ungrounded answers with verbatim fallback", () => {
    const out = ragAnswerOrFallback("Dentists are medical professionals.", [snippet]);
    expect(out).toBe(verbatimRagFallback([snippet]));
    expect(out).toContain("Need to go to dentist");
  });

  it("keeps grounded answers", () => {
    const g = "Your note says: need to go to dentist for checkup next Tuesday.";
    expect(ragAnswerOrFallback(g, [snippet])).toBe(g);
  });

  it("detects dismissive 'insufficient context' refusals", () => {
    expect(
      isRagDismissiveRefusal(
        'The context provided is insufficient. The statement "Dentist Need to go to dentist for checkup" is incomplete.',
      ),
    ).toBe(true);
    expect(isRagDismissiveRefusal("Your note says you need a dentist checkup.")).toBe(false);
  });

  it("replaces dismissive refusals with verbatim fallback even when note text is quoted", () => {
    const bad =
      'The context is insufficient. The statement "Dentist Need to go to dentist for checkup" does not contain sufficient information.';
    const out = ragAnswerOrFallback(bad, [snippet]);
    expect(out).toBe(verbatimRagFallback([snippet]));
  });

  it("shows notes in plain words, without a repeated title", () => {
    expect(tidySnippet("Dentist Dentist appointment is Friday at 3pm.")).toBe("Dentist appointment is Friday at 3pm.");
    expect(tidySnippet("Trip checklist: Passport, charger")).toBe("Trip checklist: Passport, charger");
    expect(verbatimRagFallback(["Dentist Dentist appointment is Friday at 3pm."])).toBe(
      "Here's what your note says:\n\nDentist appointment is Friday at 3pm.",
    );
    expect(verbatimRagFallback(["Bread: pick up bread", "Milk: buy milk"])).toBe(
      "Here's what your notes say:\n\n- Bread: pick up bread\n- Milk: buy milk",
    );
    expect(verbatimRagFallback(["x"])).not.toContain("indexed");
  });
});
