import { describe, expect, it } from "vitest";
import {
  isRagAnswerGroundedInSnippets,
  isRagDismissiveRefusal,
  ragAnswerOrFallback,
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
});
