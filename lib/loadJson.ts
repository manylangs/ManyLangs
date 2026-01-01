import fs from "fs/promises";
import path from "path";

/**
 * Load a JSON file safely from /public folder
 * relativePath: e.g. "books/korean/grammar_a1/001.json"
 */
export async function loadJson(relativePath: string) {
  const filePath = path.join(process.cwd(), "public", relativePath);

  try {
    const jsonText = await fs.readFile(filePath, "utf-8");
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("❌ JSON LOAD ERROR:", filePath, error);
    return { error: true, message: "JSON load failed", filePath };
  }
}
