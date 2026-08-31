import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ResourceDataset } from "./types";

const DATA_PATH = path.join(process.cwd(), "data", "resources.json");

export async function loadResourceDataset(): Promise<ResourceDataset> {
  const raw = await readFile(DATA_PATH, "utf-8");
  return JSON.parse(raw) as ResourceDataset;
}
