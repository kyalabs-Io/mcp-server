// Canonical: badge-server | Synced: 0.7.3 | Do not edit in mcp-server
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { getEnvApiKey } from "./env.js";

const CONSENT_KEY_DIR = ".kya";
const CONSENT_KEY_FILE = "consent_key";
const LEGACY_CONSENT_KEY_DIR = ".payclaw";

/** In-memory fallback when file isn't writable. Lost on restart. */
let memoryConsentKey: string | null = null;

function getConsentKeyPath(): string {
  const home = os.homedir();
  return path.join(home, CONSENT_KEY_DIR, CONSENT_KEY_FILE);
}

function getLegacyConsentKeyPath(): string {
  const home = os.homedir();
  return path.join(home, LEGACY_CONSENT_KEY_DIR, CONSENT_KEY_FILE);
}

/**
 * Layered consent key lookup:
 * 1. KYA_API_KEY env (backward compat with PAYCLAW_API_KEY — device flow never triggers)
 * 2. ~/.kya/consent_key file (migrated from ~/.payclaw/consent_key if needed)
 * 3. In-memory (current process only)
 */
export function getStoredConsentKey(): string | null {
  const envKey = getEnvApiKey();
  if (envKey && envKey.trim().length > 0) {
    return envKey.trim();
  }

  const filePath = getConsentKeyPath();
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8").trim();
      if (content.length > 0) {
        return content;
      }
    }
  } catch {
    // File read failed — try legacy path
  }

  // Migration: check legacy ~/.payclaw/consent_key
  const legacyPath = getLegacyConsentKeyPath();
  try {
    if (fs.existsSync(legacyPath)) {
      const content = fs.readFileSync(legacyPath, "utf8").trim();
      if (content.length > 0) {
        // Best-effort copy to new location
        try {
          const dir = path.dirname(filePath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { mode: 0o700, recursive: true });
          }
          fs.writeFileSync(filePath, content, { mode: 0o600, flag: "w" });
        } catch {
          // Copy failed — still return the key
        }
        return content;
      }
    }
  } catch {
    // Legacy read failed — fall back to memory
  }

  return memoryConsentKey;
}

/**
 * Returns a human-readable description of the active auth mode.
 * Used for startup logging — never exposes full key values.
 */
export function getAuthMode(): string {
  const envKey = getEnvApiKey();
  if (envKey && envKey.trim().length > 0) {
    const masked = envKey.trim().substring(0, 8) + "****";
    return `API key (${masked})`;
  }

  const filePath = getConsentKeyPath();
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8").trim();
      if (content.length > 0) {
        return "consent key (~/.kya/consent_key)";
      }
    }
  } catch {
    // File read failed
  }

  if (memoryConsentKey) {
    return "consent key (in-memory)";
  }

  return "none (device flow will trigger on first tool call)";
}

/**
 * Store consent key to ~/.kya/consent_key.
 * Creates directory if needed. Falls back to memory if file write fails.
 */
export async function storeConsentKey(token: string): Promise<void> {
  const trimmed = token.trim();
  if (trimmed.length === 0) return;

  memoryConsentKey = trimmed;

  const filePath = getConsentKeyPath();
  const dir = path.dirname(filePath);
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { mode: 0o700, recursive: true });
    }
    fs.writeFileSync(filePath, trimmed, { mode: 0o600, flag: "w" });
  } catch {
    // File write failed — key is in memory, will be lost on restart
  }
}
