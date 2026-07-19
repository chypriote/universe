// replace-ids-with-uuidv7.js
// Usage: node replace-ids-with-uuidv7.js input.json output.json

import fs from "node:fs";
import {uuidv7FromDate} from "./db.js";

const [, , inputPath, outputPath] = process.argv;

if (!inputPath || !outputPath) {
  console.error("Usage: node replace-ids-with-uuidv7.js input.json output.json");
  process.exit(1);
}

const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));

function parseCreatedAt(value) {
  if (typeof value !== "string") return null;

  const isoLike = value.replace(" ", "T") + "Z";
  const date = new Date(isoLike);

  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function walk(node) {
  if (Array.isArray(node)) {
    node.forEach(walk);
    return;
  }

  if (node && typeof node === "object") {
    if (Object.prototype.hasOwnProperty.call(node, "id")) {
      if (!node.created_at) {
        throw new Error(`Found id without created_at: ${JSON.stringify(node).slice(0, 200)}`);
      }

      const date = parseCreatedAt(node.created_at);
      if (!date) {
        throw new Error(`Invalid created_at value: ${node.created_at}`);
      }

      node.id = uuidv7FromDate(date);
    }

    for (const value of Object.values(node)) {
      walk(value);
    }
  }
}

walk(input);

fs.writeFileSync(outputPath, JSON.stringify(input, null, 2));
console.log(`Written to ${outputPath}`);