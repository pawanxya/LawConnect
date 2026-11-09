import { existsSync } from "node:fs";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envFiles = [resolve(__dirname, "../.env"), resolve(__dirname, ".env")];
const mergedEnv = {};

for (const envFile of envFiles) {
  if (existsSync(envFile)) {
    Object.assign(mergedEnv, dotenv.parse(readFileSync(envFile)));
  }
}

for (const [key, value] of Object.entries(mergedEnv)) {
  if (process.env[key] === undefined) {
    process.env[key] = value;
  }
}
