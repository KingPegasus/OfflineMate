/**
 * Run the same DuckDuckGo + summarization path as the in-app search.web tool
 * (runWebSearchPipeline). Does not use Settings; hits the network unless the
 * query is answered locally (date/time).
 *
 * Usage: npm run search:live -- "Search for population of Tokyo"
 */
import { routeIntent } from "@/ai/intent-router";
import { runWebSearchPipeline } from "@/tools/web-search-pipeline";

async function main() {
  const query = process.argv.slice(2).join(" ").trim() || "Search for population of Tokyo";

  console.log("Query:", JSON.stringify(query));
  console.log("routeIntent:", routeIntent(query));
  console.log("");

  const result = await runWebSearchPipeline({ query, text: query });

  console.log("--- pipeline (JSON) ---");
  console.log(JSON.stringify(result, null, 2));
  console.log("");
  console.log("--- message (as shown after search) ---");
  console.log(result.message);

  process.exit(result.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
