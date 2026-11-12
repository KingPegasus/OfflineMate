import fs from "node:fs";
import path from "node:path";

import { getModelsForTier, MODEL_TIERS } from "@/ai/model-registry";

const readPage = (name: string) => fs.readFileSync(path.join(process.cwd(), "website", name), "utf8");

const displaySize = (mb: number) => (mb < 1000 ? `~${mb} MB` : `~${Number((mb / 1000).toFixed(1))} GB`);

const expectedRows = (tier: (typeof MODEL_TIERS)[number]) =>
  getModelsForTier(tier.key)
    .map((m) => `${m.family} ${m.size}: ${displaySize(m.estimatedSizeMb)}`)
    .sort();

describe("website content", () => {
  const home = readPage("index.html");
  const modelsPage = readPage("models.html");

  it.each(MODEL_TIERS.map((tier) => [tier.name, tier] as const))("homepage lists the %s models from the registry", (name, tier) => {
    const card = home.match(new RegExp(`<article class="tier-card">\\s*<h3>${name}</h3>([\\s\\S]*?)</article>`))?.[1] ?? "";
    const rows = [...card.matchAll(/<li><span><a href="[^"]*">([^<]+)<\/a>(.*?)<\/span><span>([^<]+)<\/span><\/li>/g)];

    expect(rows.map((r) => `${r[1]}: ${r[3]}`).sort()).toEqual(expectedRows(tier));
    expect(rows.filter((r) => r[2].includes("tier-default")).map((r) => r[1])).toEqual([
      `${tier.primary.family} ${tier.primary.size}`,
    ]);
  });

  it.each(MODEL_TIERS.map((tier) => [tier.name, tier] as const))("models page lists the %s models from the registry", (name, tier) => {
    const section = modelsPage.match(new RegExp(`id="${tier.key}-heading"([\\s\\S]*?)</section>`))?.[1] ?? "";
    const rows = [
      ...section.matchAll(/<tr><th scope="row"><a href="[^"]*">([^<]+)<\/a><\/th><td>([^<]+)<\/td><td>(Default|Alternative)<\/td><\/tr>/g),
    ];

    expect(rows.map((r) => `${r[1]}: ${r[2]}`).sort(), name).toEqual(expectedRows(tier));
    expect(rows.filter((r) => r[3] === "Default").map((r) => r[1])).toEqual([`${tier.primary.family} ${tier.primary.size}`]);
  });

  it("every page gets the one shared footer, which links to the social profiles", async () => {
    const { renderIncludes } = await import("../../scripts/website-includes.mjs");
    const websiteDir = path.join(process.cwd(), "website");
    const social = [
      "https://youtube.com/@rhymesolutions",
      "https://www.linkedin.com/company/rhymesolutions",
      "https://www.instagram.com/rhymesolutions/",
    ];
    for (const page of ["index.html", "models.html", "run-ai-offline-on-android.html", "privacy.html", "terms.html"]) {
      const source = readPage(page);
      // The source has only the marker, never its own copy of the footer.
      expect(source, page).toContain("<!--#include footer.html -->");
      expect(source, page).not.toContain('<footer class="site-footer">');
      const built = renderIncludes(source, websiteDir) as string;
      const footers = built.match(/<footer class="site-footer">[\s\S]*?<\/footer>/g) ?? [];
      expect(footers, page).toHaveLength(1);
      for (const url of social) expect(footers[0], `${page} footer`).toContain(`href="${url}"`);
      expect(footers[0]).toContain("iOS coming soon");
    }
  });

  it("the home page links to Google Play and says iOS is coming soon", () => {
    const play = "https://play.google.com/store/apps/details?id=com.offlinemate.app";
    const getSection = home.match(/<section id="get"[\s\S]*?<\/section>/)?.[0] ?? "";
    expect(getSection).toContain(`href="${play}"`);
    expect(home).not.toContain("isn’t on Google Play yet");
    expect(home).not.toContain("Not available on iOS yet");
    expect(home).toContain("iOS coming soon");
  });

  it("video structured data has an uploadDate with a time zone (Search Console rejects a bare date)", () => {
    const jsonLd = JSON.parse(home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] ?? "{}");
    const video = jsonLd["@graph"].find((item: { "@type": string }) => item["@type"] === "VideoObject");
    expect(video.uploadDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})$/);
    expect(Number.isNaN(Date.parse(video.uploadDate))).toBe(false);
  });

  it("FAQ structured data matches the visible answers", () => {
    const jsonLd = JSON.parse(home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] ?? "{}");
    const faq = jsonLd["@graph"].find((item: { "@type": string }) => item["@type"] === "FAQPage");
    const visible = new Map(
      [...home.matchAll(/<summary>([^<]+)<\/summary>\s*<p>([\s\S]*?)<\/p>/g)].map((m) => [
        m[1],
        m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim(),
      ]),
    );

    expect(faq.mainEntity).toHaveLength(visible.size);
    for (const entry of faq.mainEntity) {
      expect(visible.get(entry.name), entry.name).toContain(entry.acceptedAnswer.text);
    }
  });

  it("the home page shows one real chat using four tools, with the prompts it shows", () => {
    const html = readPage("index.html");
    expect(html).toContain('src="/screenshots/tools-chat.webp"');
    expect(html).toContain("https://offlinemate.com/screenshots/tools-chat.webp");
    expect(fs.existsSync(path.join(process.cwd(), "website", "screenshots", "tools-chat.webp"))).toBe(true);
    for (const prompt of [
      "Remind me in 20 minutes to stretch",
      "What’s on my calendar tomorrow?",
      "Add a note to pick up bread",
      "What did I save about the dentist?",
    ]) {
      expect(html).toContain(`“${prompt}”`);
    }
  });
});
