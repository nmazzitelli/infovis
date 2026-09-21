import fs from "node:fs/promises";
import path from "node:path";

const projectDirectory = path.resolve(import.meta.dirname, "..");
const inputPath = path.join(
  projectDirectory,
  "data",
  "escucha_por_artista_y_anio.csv",
);
const jsonOutputPath = path.join(
  projectDirectory,
  "data",
  "artistas_generos_musicbrainz.json",
);
const csvOutputPath = path.join(
  projectDirectory,
  "data",
  "generos_musicbrainz_sin_clasificar.csv",
);
const maxArtists = Number(process.env.MUSICBRAINZ_MAX_ARTISTS ?? 500);
const requestIntervalMilliseconds = 1_100;
const userAgent =
  "infovis-student-project/1.0 (https://github.com/nmazzitelli/infovis)";

const normalizeName = (value) =>
  value
    .normalize("NFKD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es");

const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  const [header, ...data] = rows;
  return data.map((values) =>
    Object.fromEntries(header.map((column, index) => [column, values[index] ?? ""])),
  );
};

const csvCell = (value) => {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const searchArtist = async (name, attempt = 1) => {
  const query = new URLSearchParams({
    query: `artist:"${name.replaceAll('"', '\\"')}"`,
    fmt: "json",
    limit: "5",
  });
  const response = await fetch(
    `https://musicbrainz.org/ws/2/artist/?${query.toString()}`,
    { headers: { "User-Agent": userAgent, Accept: "application/json" } },
  );

  if ([429, 500, 502, 503, 504].includes(response.status) && attempt <= 6) {
    const retryAfter = Number(response.headers.get("retry-after") ?? attempt * 2);
    await sleep(Math.max(1, retryAfter) * 1_000);
    return searchArtist(name, attempt + 1);
  }

  if (!response.ok) {
    throw new Error(`MusicBrainz ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }

  return response.json();
};

const inputRows = parseCsv(await fs.readFile(inputPath, "utf8"));
const artistsByName = new Map();

for (const row of inputRows) {
  const name = row.artist_name;
  if (!artistsByName.has(name)) {
    artistsByName.set(name, {
      source_artist_name: name,
      total_ms_played: 0,
      playback_events: 0,
      years: new Set(),
    });
  }

  const artist = artistsByName.get(name);
  artist.total_ms_played += Number(row.ms_played);
  artist.playback_events += Number(row.playback_events);
  artist.years.add(Number(row.year));
}

const artists = [...artistsByName.values()]
  .map((artist) => {
    const years = [...artist.years].sort((a, b) => a - b);
    return {
      source_artist_name: artist.source_artist_name,
      total_ms_played: artist.total_ms_played,
      total_hours: Number((artist.total_ms_played / 3_600_000).toFixed(6)),
      playback_events: artist.playback_events,
      first_year: years[0],
      last_year: years.at(-1),
      lookup_status: "not_queried",
      match_method: null,
      musicbrainz_artist_id: null,
      musicbrainz_artist_name: null,
      musicbrainz_score: null,
      musicbrainz_disambiguation: null,
      musicbrainz_tags: [],
      genre_candidate_tags: [],
    };
  })
  .sort(
    (a, b) =>
      b.total_ms_played - a.total_ms_played ||
      a.source_artist_name.localeCompare(b.source_artist_name, "es"),
  );

try {
  const existing = JSON.parse(await fs.readFile(jsonOutputPath, "utf8"));
  const existingByName = new Map(
    existing.artists.map((artist) => [artist.source_artist_name, artist]),
  );
  for (const artist of artists) {
    const cached = existingByName.get(artist.source_artist_name);
    if (cached?.lookup_status && cached.lookup_status !== "not_queried") {
      Object.assign(artist, cached);
    }
  }
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const totalMilliseconds = artists.reduce(
  (total, artist) => total + artist.total_ms_played,
  0,
);
const targetArtists = artists.slice(0, Math.min(maxArtists, artists.length));
const targetMilliseconds = targetArtists.reduce(
  (total, artist) => total + artist.total_ms_played,
  0,
);

const buildOutput = () => {
  const queried = artists.filter((artist) => artist.lookup_status !== "not_queried");
  const matched = artists.filter((artist) => artist.lookup_status === "matched");
  const withTags = artists.filter((artist) => artist.genre_candidate_tags.length > 0);
  const queriedMilliseconds = queried.reduce(
    (total, artist) => total + artist.total_ms_played,
    0,
  );
  const taggedMilliseconds = withTags.reduce(
    (total, artist) => total + artist.total_ms_played,
    0,
  );

  return {
    metadata: {
      history_source: "Spotify Extended Streaming History",
      genre_source: "MusicBrainz artist tags",
      period: { from: 2017, to: 2025 },
      timezone: "America/Argentina/Buenos_Aires",
      generated_at: new Date().toISOString(),
      total_artists: artists.length,
      requested_top_artists: targetArtists.length,
      requested_listening_share: Number(
        (targetMilliseconds / totalMilliseconds).toFixed(6),
      ),
      queried_artists: queried.length,
      queried_listening_share: Number(
        (queriedMilliseconds / totalMilliseconds).toFixed(6),
      ),
      matched_artists: matched.length,
      artists_with_positive_tags: withTags.length,
      listening_share_with_positive_tags: Number(
        (taggedMilliseconds / totalMilliseconds).toFixed(6),
      ),
      note: "Las etiquetas se conservan sin clasificar. genre_candidate_tags solo incluye etiquetas con votos positivos.",
    },
    artists,
  };
};

const saveOutputs = async () => {
  const output = buildOutput();
  await fs.writeFile(jsonOutputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  const header = [
    "source_artist_name",
    "musicbrainz_artist_id",
    "musicbrainz_artist_name",
    "raw_tag",
    "tag_votes",
    "total_hours",
    "first_year",
    "last_year",
    "match_method",
    "lookup_status",
  ];
  const rows = [header.join(",")];
  for (const artist of artists.filter(
    (candidate) => candidate.lookup_status !== "not_queried",
  )) {
    const tags = artist.musicbrainz_tags.length
      ? artist.musicbrainz_tags
      : [{ name: "", count: "" }];
    for (const tag of tags) {
      rows.push(
        [
          artist.source_artist_name,
          artist.musicbrainz_artist_id,
          artist.musicbrainz_artist_name,
          tag.name,
          tag.count,
          artist.total_hours,
          artist.first_year,
          artist.last_year,
          artist.match_method,
          artist.lookup_status,
        ]
          .map(csvCell)
          .join(","),
      );
    }
  }
  await fs.writeFile(csvOutputPath, `${rows.join("\n")}\n`, "utf8");
};

let queriedThisRun = 0;
for (const artist of targetArtists) {
  if (artist.lookup_status !== "not_queried") continue;

  const result = await searchArtist(artist.source_artist_name);
  const candidates = result.artists ?? [];
  const exactCandidates = candidates.filter(
    (candidate) =>
      normalizeName(candidate.name) === normalizeName(artist.source_artist_name),
  );
  const match = exactCandidates[0] ?? candidates[0];

  if (!match) {
    artist.lookup_status = "not_found";
    artist.match_method = "no_result";
  } else {
    artist.lookup_status = "matched";
    artist.match_method = exactCandidates.length
      ? "exact_normalized_name"
      : "top_search_result";
    artist.musicbrainz_artist_id = match.id;
    artist.musicbrainz_artist_name = match.name;
    artist.musicbrainz_score = Number(match.score ?? 0);
    artist.musicbrainz_disambiguation = match.disambiguation ?? null;
    artist.musicbrainz_tags = (match.tags ?? [])
      .map((tag) => ({ name: tag.name, count: Number(tag.count ?? 0) }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    artist.genre_candidate_tags = artist.musicbrainz_tags.filter(
      (tag) => tag.count > 0,
    );
  }

  queriedThisRun += 1;
  if (queriedThisRun % 25 === 0) {
    await saveOutputs();
    console.log(`Consultados: ${queriedThisRun}/${targetArtists.length}`);
  }
  await sleep(requestIntervalMilliseconds);
}

await saveOutputs();
const output = buildOutput();
console.log(`Artistas objetivo: ${targetArtists.length}`);
console.log(`Artistas consultados: ${output.metadata.queried_artists}`);
console.log(`Coincidencias: ${output.metadata.matched_artists}`);
console.log(
  `Cobertura del tiempo consultado: ${(output.metadata.queried_listening_share * 100).toFixed(2)}%`,
);
console.log(
  `Cobertura del tiempo con etiquetas: ${(output.metadata.listening_share_with_positive_tags * 100).toFixed(2)}%`,
);
console.log(`JSON: ${jsonOutputPath}`);
console.log(`CSV: ${csvOutputPath}`);
