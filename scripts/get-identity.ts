#!/usr/bin/env npx tsx
/**
 * One-off script to run payclaw_getAgentIdentity and output the token.
 * Usage: npx tsx scripts/get-identity.ts [merchant]
 */
import { getAgentIdentity, formatIdentityResponse } from "../src/tools/getAgentIdentity.js";

(async () => {
  const merchant = process.argv[2];
  let result = await getAgentIdentity(merchant);

  if (result.activation_required && result.message) {
    // 1. Issue auth path first — user must see this before we wait
    process.stdout.write(result.message + "\n\n");
    process.stdout.write(">>> Approve at the URL above, then we'll fetch your token.\n");
    process.stdout.write(">>> Waiting 60s...\n\n");
    // 2. Then wait for approval
    await new Promise((r) => setTimeout(r, 60_000));
    result = await getAgentIdentity(merchant);
  }

  if (result.status === "error") {
    console.log("✗ BADGE ERROR\n\n  " + result.message);
    process.exit(1);
  }

  console.log(formatIdentityResponse(result));
  console.log("\n--- JSON ---");
  console.log(JSON.stringify(result, null, 2));

  if (result.verification_token) {
    console.log("\n--- TOKEN ---");
    console.log(result.verification_token);
  }
})();
