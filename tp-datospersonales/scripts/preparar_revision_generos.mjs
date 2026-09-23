import fs from "node:fs/promises";
import path from "node:path";

const projectDirectory = path.resolve(import.meta.dirname, "..");
const dataDirectory = path.join(projectDirectory, "data");
const tableauPath = path.join(dataDirectory, "artistas_por_anio_tableau.csv");
const tagsPath = path.join(dataDirectory, "artistas_generos_musicbrainz.json");
const historyDirectory = path.join(
  dataDirectory,
  "fuente_anonimizada",
  "spotify_extended",
);
const outputPath = path.join(dataDirectory, "generos_pendientes_revision.csv");
const limit = 100;

const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
};

const csvCell = (value) => {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const rows = parseCsv(await fs.readFile(tableauPath, "utf8"));
const [header, ...body] = rows;
const column = Object.fromEntries(header.map((name, index) => [name, index]));
const pending = new Map();

for (const row of body) {
  if (
    row.length !== header.length ||
    row[column["Género"]] !== "Sin clasificar"
  ) {
    continue;
  }

  const artist = row[column["Artista"]];
  const hours = Number(row[column["Horas escuchadas"]]);
  const year = Number(row[column["Año"]]);
  if (!artist || !Number.isFinite(hours) || !Number.isInteger(year)) continue;

  const current = pending.get(artist) ?? { hours: 0, years: new Set() };
  current.hours += hours;
  current.years.add(year);
  pending.set(artist, current);
}

const totalPendingHours = [...pending.values()].reduce(
  (sum, value) => sum + value.hours,
  0,
);
const selected = [...pending.entries()]
  .sort((a, b) => b[1].hours - a[1].hours || a[0].localeCompare(b[0], "es"))
  .slice(0, limit);
const selectedNames = new Set(selected.map(([artist]) => artist));

const tracks = new Map();
const historyFiles = (await fs.readdir(historyDirectory))
  .filter((name) => /^Streaming_History_Audio_20(1[7-9]|2[0-5]).*\.json$/.test(name))
  .sort();

for (const fileName of historyFiles) {
  const entries = JSON.parse(
    await fs.readFile(path.join(historyDirectory, fileName), "utf8"),
  );
  for (const entry of entries) {
    const artist = entry.master_metadata_album_artist_name;
    const track = entry.master_metadata_track_name;
    const played = Number(entry.ms_played);
    if (!selectedNames.has(artist) || !track || !Number.isFinite(played)) continue;

    const artistTracks = tracks.get(artist) ?? new Map();
    artistTracks.set(track, (artistTracks.get(track) ?? 0) + played);
    tracks.set(artist, artistTracks);
  }
}

const tagsData = JSON.parse(await fs.readFile(tagsPath, "utf8"));
const lookupByArtist = new Map(
  tagsData.artists.map((artist) => [artist.source_artist_name, artist]),
);

const topTracksFor = (artist) =>
  [...(tracks.get(artist) ?? new Map()).entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"))
    .slice(0, 3)
    .map(([track]) => track)
    .join(" | ");

const suggestedReview = (artist, topTracks) => {
  const combined = `${artist} ${topTracks}`.toLocaleLowerCase("es");
  if (/\b(rkt|dembow|perreo|turreo|reggaet[oó]n)\b/.test(combined)) {
    return "Posible Urbano latino";
  }
  if (/\b(dj|remix|mix|edit|mashup)\b/.test(combined)) {
    return "Revisar: Urbano latino o Electrónica y dance";
  }
  return "";
};

const outputRows = [
  [
    "Prioridad",
    "Artista",
    "Horas escuchadas",
    "% de horas sin clasificar",
    "Años",
    "Canciones principales",
    "Estado MusicBrainz",
    "Método de coincidencia",
    "Sugerencia inicial",
    "Decisión final",
  ],
];

selected.forEach(([artist, value], index) => {
  const lookup = lookupByArtist.get(artist) ?? {};
  const topTracks = topTracksFor(artist);
  outputRows.push([
    index + 1,
    artist,
    value.hours.toFixed(3),
    ((value.hours / totalPendingHours) * 100).toFixed(2),
    [...value.years].sort((a, b) => a - b).join("–"),
    topTracks,
    lookup.lookup_status ?? "sin registro",
    lookup.match_method ?? "",
    suggestedReview(artist, topTracks),
    "",
  ]);
});

await fs.writeFile(
  outputPath,
  `${outputRows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`,
  "utf8",
);

const selectedHours = selected.reduce((sum, [, value]) => sum + value.hours, 0);
console.log(`Pendientes totales: ${pending.size}`);
console.log(`Horas sin clasificar: ${totalPendingHours.toFixed(3)}`);
console.log(
  `Incluidos: ${selected.length} artistas, ${selectedHours.toFixed(3)} horas (${(
    (selectedHours / totalPendingHours) *
    100
  ).toFixed(1)}% de lo pendiente)`,
);
console.log(`Salida: ${outputPath}`);
