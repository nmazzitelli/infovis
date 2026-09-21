import fs from "node:fs/promises";
import path from "node:path";

const projectDirectory = path.resolve(import.meta.dirname, "..");
const dataDirectory = path.join(projectDirectory, "data");
const listeningPath = path.join(dataDirectory, "escucha_por_artista_y_anio.csv");
const tagsPath = path.join(dataDirectory, "artistas_generos_musicbrainz.json");
const outputPath = path.join(dataDirectory, "generos_por_anio_flourish.csv");

const startYear = 2017;
const endYear = 2025;
const categories = [
  "Urbano latino",
  "Rock y alternativo",
  "Hip-hop y rap",
  "Electrónica y dance",
  "Pop",
  "Metal",
  "R&B, soul, funk y jazz",
  "Cumbia y tropical",
  "Otros",
  "Sin clasificar",
];

const rules = [
  [
    "Urbano latino",
    /\b(reggaeton|trap latino|latin trap|latin urban|urbano latino|dembow|perreo|neoperreo)\b/,
  ],
  [
    "Metal",
    /\b(metal|metalcore|deathcore|grindcore|doom|sludge|thrash|black metal|death metal|nu metal|heavy metal)\b/,
  ],
  [
    "Rock y alternativo",
    /\b(rock|punk|grunge|shoegaze|new wave|post-punk|indie|alternative|emo|hardcore|psychedelic|progressive|aor)\b/,
  ],
  [
    "Hip-hop y rap",
    /\b(hip hop|hip-hop|rap|trap|boom bap|grime|drill|beats)\b/,
  ],
  [
    "Pop",
    /\b(pop|adult contemporary|synthpop|synth-pop|teen pop|electropop)\b/,
  ],
  [
    "Electrónica y dance",
    /\b(electronic|electronica|electro|house|techno|edm|dance|trance|ambient|downtempo|trip hop|drum and bass|dubstep|breakbeat|garage|disco|club|synthwave)\b/,
  ],
  [
    "R&B, soul, funk y jazz",
    /\b(r&b|rhythm and blues|soul|funk|jazz|neo soul|motown)\b/,
  ],
  [
    "Cumbia y tropical",
    /\b(cumbia|tropical|salsa|merengue|bachata|reggae|dancehall|ska|calypso|reggaet[oó]n)\b/,
  ],
  [
    "Otros",
    /\b(blues|folk|country|classical|opera|soundtrack|film score|gospel|world|new age|singer-songwriter|vocal|acoustic|experimental|avant-garde|tango|bolero|flamenco|bossa|samba|mpb|chanson|cabaret|spoken word|instrumental|orchestra|easy listening|latin)\b/,
  ],
];

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

const categoryForTag = (tagName) => {
  const normalized = String(tagName ?? "").toLocaleLowerCase("es").trim();
  return rules.find(([, pattern]) => pattern.test(normalized))?.[0] ?? null;
};

const classifyArtist = (artist) => {
  if (
    artist?.lookup_status !== "matched" ||
    artist?.match_method === "top_search_result"
  ) {
    return "Sin clasificar";
  }

  const scores = new Map();
  for (const tag of artist.genre_candidate_tags ?? []) {
    const category = categoryForTag(tag.name);
    if (!category) continue;
    const weight = Math.max(1, Number(tag.count) || 0);
    scores.set(category, (scores.get(category) ?? 0) + weight);
  }

  if (scores.size === 0) return "Sin clasificar";

  return [...scores.entries()].sort(
    (a, b) => b[1] - a[1] || categories.indexOf(a[0]) - categories.indexOf(b[0]),
  )[0][0];
};

const tagsData = JSON.parse(await fs.readFile(tagsPath, "utf8"));
const artistCategory = new Map(
  tagsData.artists.map((artist) => [
    artist.source_artist_name,
    classifyArtist(artist),
  ]),
);

const listeningRows = parseCsv(await fs.readFile(listeningPath, "utf8"));
const [header, ...body] = listeningRows;
const column = Object.fromEntries(header.map((name, index) => [name, index]));

const totals = new Map(
  Array.from({ length: endYear - startYear + 1 }, (_, offset) => {
    const year = startYear + offset;
    return [year, new Map(categories.map((category) => [category, 0]))];
  }),
);

for (const row of body) {
  if (row.length !== header.length) continue;
  const year = Number(row[column.year]);
  const hours = Number(row[column.hours]);
  if (!totals.has(year) || !Number.isFinite(hours)) continue;

  const artistName = row[column.artist_name];
  const category = artistCategory.get(artistName) ?? "Sin clasificar";
  totals.get(year).set(category, totals.get(year).get(category) + hours);
}

const outputRows = [["Año", ...categories]];
for (const [year, values] of totals) {
  outputRows.push([
    year,
    ...categories.map((category) => values.get(category).toFixed(6)),
  ]);
}

await fs.writeFile(
  outputPath,
  `${outputRows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`,
  "utf8",
);

const overall = new Map(categories.map((category) => [category, 0]));
for (const yearly of totals.values()) {
  for (const category of categories) {
    overall.set(category, overall.get(category) + yearly.get(category));
  }
}
const allHours = [...overall.values()].reduce((sum, value) => sum + value, 0);

console.log(`Artistas clasificados: ${artistCategory.size}`);
console.log(`Años: ${startYear}-${endYear}`);
for (const category of categories) {
  const hours = overall.get(category);
  console.log(
    `${category}: ${hours.toFixed(1)} horas (${((hours / allHours) * 100).toFixed(1)}%)`,
  );
}
console.log(`Salida: ${outputPath}`);
