export const dynamic = 'force-dynamic';

const TOURN_ID = process.env.SLASH_GOLF_TOURN_ID || '033';
const YEAR = process.env.SLASH_GOLF_YEAR || '2026';

function flattenPlayers(payload) {
  if (!payload) return [];

  const candidates = [
    payload.leaderboard,
    payload.leaderboards,
    payload.players,
    payload.data?.leaderboard,
    payload.data?.leaderboards,
    payload.data?.players,
    payload.rounds?.[0]?.leaderboard,
    payload.rounds?.[0]?.players,
  ];

  for (const c of candidates) {
    if (Array.isArray(c)) return c;
  }

  if (Array.isArray(payload)) return payload;
  return [];
}

function nameFromPlayer(p) {
  return (
    p.playerName ||
    p.player_name ||
    p.name ||
    p.displayName ||
    p.display_name ||
    p.player?.displayName ||
    p.player?.name ||
    [p.firstName || p.first_name || p.player?.firstName, p.lastName || p.last_name || p.player?.lastName]
      .filter(Boolean)
      .join(' ')
  );
}

function parsePosition(value, score) {
  if (value === null || value === undefined || value === '') return score === 999 ? 999 : 999;
  const s = String(value).trim().toUpperCase();
  if (s.includes('CUT') || s === 'MC' || s === 'WD' || s === 'DQ') return 999;
  const m = s.match(/\d+/);
  return m ? Number(m[0]) : 999;
}

function parseScore(value) {
  if (value === null || value === undefined || value === '') return 0;
  const s = String(value).trim().toUpperCase();
  if (s === 'E' || s === 'EVEN') return 0;
  if (s.includes('CUT') || s === 'MC' || s === 'WD' || s === 'DQ') return 999;
  const n = Number(s.replace('+', ''));
  return Number.isFinite(n) ? n : 0;
}

function normalizePlayer(p) {
  const name = nameFromPlayer(p);
  const totalScore =
    p.totalToPar ??
    p.total_to_par ??
    p.totalRelativeToPar ??
    p.total_score_relative_to_par ??
    p.scoreToPar ??
    p.score_to_par ??
    p.score ??
    p.total ??
    p.current_score;

  const score = parseScore(totalScore);

  const positionValue =
    p.position ??
    p.currentPosition ??
    p.current_position ??
    p.rank ??
    p.pos ??
    p.place;

  return {
    name,
    position: parsePosition(positionValue, score),
    positionLabel: String(positionValue || (score === 999 ? 'MC' : '')),
    score,
    today: p.today ?? p.roundScore ?? p.round_score ?? p.currentRoundScore ?? '',
    thru: p.thru ?? p.holesThrough ?? p.holes_through ?? p.status ?? '',
    teeTime: p.teeTime ?? p.tee_time ?? p.startTime ?? p.start_time ?? '',
    raw: p
  };
}

export async function GET() {
  const key = process.env.SLASH_GOLF_API_KEY;

  if (!key) {
    return Response.json({
      mode: 'missing-key',
      message: 'Missing SLASH_GOLF_API_KEY in Vercel environment variables.',
      players: [],
      updatedAt: new Date().toISOString()
    }, { status: 200 });
  }

  const endpoints = [
    `https://live-golf-data.p.rapidapi.com/leaderboards?tournId=${TOURN_ID}&year=${YEAR}`,
    `https://slashgolf.p.rapidapi.com/leaderboards?tournId=${TOURN_ID}&year=${YEAR}`,
    `https://api.slashgolf.dev/leaderboards?tournId=${TOURN_ID}&year=${YEAR}`
  ];

  let lastError = null;

  for (const url of endpoints) {
    try {
      const headers = {
        'X-RapidAPI-Key': key,
        'X-RapidAPI-Host': process.env.SLASH_GOLF_API_HOST || 'live-golf-data.p.rapidapi.com',
      };

      // If using a direct Slash endpoint instead of RapidAPI, this header is harmless but add common auth too.
      headers['Authorization'] = `Bearer ${key}`;

      const res = await fetch(url, {
        headers,
        next: { revalidate: 0 },
        cache: 'no-store'
      });

      if (!res.ok) {
        lastError = `${url} returned ${res.status}`;
        continue;
      }

      const payload = await res.json();
      const players = flattenPlayers(payload)
        .map(normalizePlayer)
        .filter(p => p.name);

      if (players.length > 0) {
        return Response.json({
          mode: 'live',
          source: url,
          tournId: TOURN_ID,
          year: YEAR,
          updatedAt: new Date().toISOString(),
          players
        });
      }

      lastError = `${url} returned no players`;
    } catch (err) {
      lastError = err?.message || String(err);
    }
  }

  return Response.json({
    mode: 'api-error',
    message: lastError || 'Unable to fetch Slash Golf leaderboard.',
    players: [],
    updatedAt: new Date().toISOString()
  }, { status: 200 });
}
