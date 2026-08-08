//self note: this script takes the scheme data stored in schemes.seed.json and puts it into the Supabase schemes table
import dotenv from "dotenv";
import { readFile } from "node:fs/promises";
import path from "node:path";

dotenv.config({path: ".env.local"});

import { supabaseAdmin } from "../lib/db/supabaseAdmin";

// the Function to seed schemes into the Supabase database
async function seedSchemes() {
  const filePath = path.join(
    process.cwd(),
    "data",
    "schemes.seed.json",
  );

  const fileContents = await readFile(filePath, "utf-8");

  const schemes = JSON.parse(fileContents);

  if (!Array.isArray(schemes)) {
    throw new Error("schemes.seed.json must contain an array.");
  }

  const { error } = await supabaseAdmin
    .from("schemes")
    .upsert(schemes, { onConflict: "scheme_id" });

  if (error) {
    throw new Error(`Failed to seed schemes: ${error.message}`);
  }

  console.log(`Successfully seeded ${schemes.length} schemes.`);
}

seedSchemes().catch((error) => {
  console.error(error);
  process.exit(1);
});