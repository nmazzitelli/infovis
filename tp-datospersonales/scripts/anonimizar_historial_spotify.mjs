import fs from "node:fs/promises";
import path from "node:path";

const [sourceDirectory, outputDirectory] = process.argv.slice(2);

if (!sourceDirectory || !outputDirectory) {
  throw new Error(
    "Uso: node anonimizar_historial_spotify.mjs <carpeta-origen> <carpeta-salida>",
  );
}

const files = (await fs.readdir(sourceDirectory))
  .filter((name) => /^Streaming_History_Audio_.*\.json$/.test(name))
  .sort();

await fs.mkdir(outputDirectory, { recursive: true });

const manifestFiles = [];
const preservedFields = new Set();
let totalRecords = 0;
let firstTimestamp = null;
let lastTimestamp = null;

for (const file of files) {
  const sourcePath = path.join(sourceDirectory, file);
  const outputPath = path.join(outputDirectory, file);
  const records = JSON.parse(await fs.readFile(sourcePath, "utf8"));
  const sanitized = records.map(({ ip_addr: _removedIp, ...record }) => record);

  for (const record of sanitized) {
    Object.keys(record).forEach((field) => preservedFields.add(field));
    if (record.ts && (!firstTimestamp || record.ts < firstTimestamp)) {
      firstTimestamp = record.ts;
    }
    if (record.ts && (!lastTimestamp || record.ts > lastTimestamp)) {
      lastTimestamp = record.ts;
    }
  }

  await fs.writeFile(outputPath, `${JSON.stringify(sanitized, null, 2)}\n`, "utf8");

  totalRecords += sanitized.length;
  manifestFiles.push({ file, records: sanitized.length });
}

const manifest = {
  source: "Spotify Extended Streaming History",
  scope: "Streaming_History_Audio",
  removed_fields: ["ip_addr"],
  preserved_fields: [...preservedFields].sort(),
  coverage: {
    first_timestamp: firstTimestamp,
    last_timestamp: lastTimestamp,
  },
  total_files: files.length,
  total_records: totalRecords,
  files: manifestFiles,
};

await fs.writeFile(
  path.join(outputDirectory, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

console.log(`Archivos: ${files.length}`);
console.log(`Registros: ${totalRecords}`);
