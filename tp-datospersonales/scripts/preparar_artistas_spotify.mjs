import fs from "node:fs/promises";
import path from "node:path";

const projectDirectory = path.resolve(import.meta.dirname, "..");
const sourceDirectory = path.join(
  projectDirectory,
  "data",
  "fuente_anonimizada",
  "spotify_extended",
);
const outputPath = path.join(
  projectDirectory,
  "data",
  "escucha_por_artista_y_anio.csv",
);

const startYear = 2017;
const endYear = 2025;
const timeZone = "America/Argentina/Buenos_Aires";
const yearFormatter = new Intl.DateTimeFormat("en", {
  timeZone,
  year: "numeric",
});

const csvCell = (value) => {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const files = (await fs.readdir(sourceDirectory))
  .filter((name) => /^Streaming_History_Audio_.*\.json$/.test(name))
  .sort();

const seenRecords = new Set();
const byArtistYear = new Map();
let totalRecords = 0;
let duplicateRecords = 0;
let excludedRecords = 0;

for (const file of files) {
  const records = JSON.parse(
    await fs.readFile(path.join(sourceDirectory, file), "utf8"),
  );

  for (const record of records) {
    totalRecords += 1;
    const recordKey = JSON.stringify(record);
    if (seenRecords.has(recordKey)) {
      duplicateRecords += 1;
      continue;
    }
    seenRecords.add(recordKey);

    const artist = record.master_metadata_album_artist_name?.trim();
    const trackUri = record.spotify_track_uri;
    const milliseconds = Number(record.ms_played);
    const timestamp = record.ts ? new Date(record.ts) : null;

    if (
      !artist ||
      !trackUri?.startsWith("spotify:track:") ||
      !Number.isFinite(milliseconds) ||
      milliseconds <= 0 ||
      !timestamp ||
      Number.isNaN(timestamp.getTime())
    ) {
      excludedRecords += 1;
      continue;
    }

    const year = Number(yearFormatter.format(timestamp));
    if (year < startYear || year > endYear) {
      excludedRecords += 1;
      continue;
    }

    const key = `${artist}\u0000${year}`;
    if (!byArtistYear.has(key)) {
      byArtistYear.set(key, {
        artist,
        year,
        milliseconds: 0,
        playbackEvents: 0,
        trackUris: new Set(),
        trackMilliseconds: new Map(),
      });
    }

    const row = byArtistYear.get(key);
    row.milliseconds += milliseconds;
    row.playbackEvents += 1;
    row.trackUris.add(trackUri);
    row.trackMilliseconds.set(
      trackUri,
      (row.trackMilliseconds.get(trackUri) ?? 0) + milliseconds,
    );
  }
}

const artistTotals = new Map();
for (const row of byArtistYear.values()) {
  artistTotals.set(
    row.artist,
    (artistTotals.get(row.artist) ?? 0) + row.milliseconds,
  );
}

const rows = [...byArtistYear.values()].sort(
  (a, b) =>
    artistTotals.get(b.artist) - artistTotals.get(a.artist) ||
    a.artist.localeCompare(b.artist, "es") ||
    a.year - b.year,
);

const header = [
  "artist_name",
  "year",
  "ms_played",
  "hours",
  "playback_events",
  "unique_tracks",
  "representative_track_uri",
];
const csvRows = [header.join(",")];

for (const row of rows) {
  const representativeTrackUri = [...row.trackMilliseconds.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  )[0][0];

  csvRows.push(
    [
      row.artist,
      row.year,
      row.milliseconds,
      (row.milliseconds / 3_600_000).toFixed(6),
      row.playbackEvents,
      row.trackUris.size,
      representativeTrackUri,
    ]
      .map(csvCell)
      .join(","),
  );
}

await fs.writeFile(outputPath, `${csvRows.join("\n")}\n`, "utf8");

console.log(`Archivos leídos: ${files.length}`);
console.log(`Registros originales: ${totalRecords}`);
console.log(`Duplicados exactos excluidos: ${duplicateRecords}`);
console.log(`Registros fuera del alcance: ${excludedRecords}`);
console.log(`Artistas: ${artistTotals.size}`);
console.log(`Filas generadas: ${rows.length}`);
console.log(`Salida: ${outputPath}`);
