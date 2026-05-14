'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { poolEntries } from '../lib/entries';

const TOURNAMENT_NAME = 'PGA CHAMPIONSHIP';
const COURSE_NAME = 'Aronimink Golf Club';
const FIELD_NOTE = 'Live Pick 3 Competition';

const fallbackPlayers = [
  { name: 'Rory McIlroy', position: 1, positionLabel: 'T1', score: 0, today: '', thru: 'Tee time', teeTime: '8:00 AM' },
  { name: 'Scottie Scheffler', position: 1, positionLabel: 'T1', score: 0, today: '', thru: 'Tee time', teeTime: '8:10 AM' },
  { name: 'Xander Schauffele', position: 1, positionLabel: 'T1', score: 0, today: '', thru: 'Tee time', teeTime: '8:20 AM' },
  { name: 'Bryson DeChambeau', position: 1, positionLabel: 'T1', score: 0, today: '', thru: 'Tee time', teeTime: '8:30 AM' },
  { name: 'Justin Thomas', position: 1, positionLabel: 'T1', score: 0, today: '', thru: 'Tee time', teeTime: '8:40 AM' },
  { name: 'Cameron Young', position: 1, positionLabel: 'T1', score: 0, today: '', thru: 'Tee time', teeTime: '8:50 AM' },
  { name: 'Jon Rahm', position: 1, positionLabel: 'T1', score: 0, today: '', thru: 'Tee time', teeTime: '9:00 AM' },
  { name: 'Tommy Fleetwood', position: 1, positionLabel: 'T1', score: 0, today: '', thru: 'Tee time', teeTime: '9:10 AM' },
  { name: 'Ludvig Åberg', position: 1, positionLabel: 'T1', score: 0, today: '', thru: 'Tee time', teeTime: '9:20 AM' },
  { name: 'Justin Rose', position: 1, positionLabel: 'T1', score: 0, today: '', thru: 'Tee time', teeTime: '9:30 AM' },
  { name: 'Shane Lowry', position: 1, positionLabel: 'T1', score: 0, today: '', thru: 'Tee time', teeTime: '9:40 AM' },
  { name: 'Patrick Cantlay', position: 1, positionLabel: 'T1', score: 0, today: '', thru: 'Tee time', teeTime: '9:50 AM' },
];

function simplifyName(name = '') {
  return String(name)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

const aliasMap = {
  rorymcilroy: 'rorymcilroy',
  mcilroy: 'rorymcilroy',
  scottiescheffler: 'scottiescheffler',
  scheffler: 'scottiescheffler',
  sheffler: 'scottiescheffler',
  cameryoung: 'cameryoung',
  cameronyoung: 'cameryoung',
  young: 'cameryoung',
  xanderschauffele: 'xanderschauffele',
  schauffele: 'xanderschauffele',
  brysondechambeau: 'brysondechambeau',
  dechambeau: 'brysondechambeau',
  dechanbeau: 'brysondechambeau',
  jonrahm: 'jonrahm',
  rahm: 'jonrahm',
  tommyfleetwood: 'tommyfleetwood',
  fleetwood: 'tommyfleetwood',
  justinrose: 'justinrose',
  rose: 'justinrose',
  justinthomas: 'justinthomas',
  thomas: 'justinthomas',
  ludvigaberg: 'ludvigaberg',
  aberg: 'ludvigaberg',
  shanelowry: 'shanelowry',
  lowry: 'shanelowry',
  mattfitzpatrick: 'mattfitzpatrick',
  fitzpatrick: 'mattfitzpatrick',
  minwoolee: 'minwoolee',
  mwlee: 'minwoolee',
  coreyconners: 'coreyconners',
  conners: 'coreyconners',
  patrickreed: 'patrickreed',
  reed: 'patrickreed',
  patrickcantlay: 'patrickcantlay',
  cantlay: 'patrickcantlay',
  collinmorikawa: 'collinmorikawa',
  morikawa: 'collinmorikawa',
  hidekimatsuyama: 'hidekimatsuyama',
  matsuyama: 'hidekimatsuyama',
  brookskoepka: 'brookskoepka',
  koepka: 'brookskoepka',
  viktorhovland: 'viktorhovland',
  hovland: 'viktorhovland',
  tonyfinau: 'tonyfinau',
  finau: 'tonyfinau',
  tyrrellhatton: 'tyrrellhatton',
  hatton: 'tyrrellhatton',
};

function keyName(name) {
  const s = simplifyName(name);
  return aliasMap[s] || s;
}

function scoreLabel(score) {
  if (score === 999) return 'MC';
  if (score === null || score === undefined || score === '') return 'E';
  const n = Number(score);
  if (!Number.isFinite(n)) return String(score);
  if (n === 0) return 'E';
  return n > 0 ? `+${n}` : String(n);
}

function posLabel(player) {
  if (!player || player.position >= 999) return 'MC';
  if (player.positionLabel && String(player.positionLabel).trim() && String(player.positionLabel).toUpperCase() !== 'NULL') {
    const raw = String(player.positionLabel).trim();
    if (/^\d+$/.test(raw)) return raw;
    return raw;
  }
  return String(player.position);
}

function getRefreshDelay() {
  const now = new Date();
  const day = now.getDay(); // 0 Sun, 4 Thu
  const hour = now.getHours();

  // New Zealand local browser time approximation. Outside likely play windows, pause heavily.
  // These are intentionally conservative to protect the 250-call free tier.
  if (day === 4 || day === 5) return 60 * 60 * 1000; // Thu/Fri hourly
  if (day === 6) return 20 * 60 * 1000; // Saturday 20 mins
  if (day === 0) {
    if (hour >= 9 && hour < 14) return 4 * 60 * 1000; // Sunday front nine window
    if (hour >= 14 && hour <= 19) return 2 * 60 * 1000; // Sunday finish
    return 60 * 60 * 1000;
  }
  return 60 * 60 * 1000;
}

function sortPlayersByLeaderboard(players) {
  return [...players].sort((a, b) => {
    if ((a.position ?? 999) !== (b.position ?? 999)) return (a.position ?? 999) - (b.position ?? 999);
    if ((a.score ?? 999) !== (b.score ?? 999)) return (a.score ?? 999) - (b.score ?? 999);
    return String(a.name).localeCompare(String(b.name));
  });
}

function addPositionLabels(players) {
  const sorted = sortPlayersByLeaderboard(players);
  const counts = new Map();
  for (const p of sorted) {
    if (p.position < 999) counts.set(p.position, (counts.get(p.position) || 0) + 1);
  }
  return sorted.map(p => ({
    ...p,
    positionLabel: p.position >= 999 ? 'MC' : counts.get(p.position) > 1 ? `T${p.position}` : String(p.position)
  }));
}

function buildPlayerMap(players) {
  const map = new Map();
  for (const p of players) {
    map.set(keyName(p.name), p);
  }
  return map;
}

function evaluatePool(entries, players, previousRanks) {
  const map = buildPlayerMap(players);
  const evaluated = entries.map((entry, originalIndex) => {
    const picks = entry.picks.map(pick => {
      const found = map.get(keyName(pick));
      return found || {
        name: pick,
        position: 999,
        positionLabel: 'NS',
        score: 999,
        today: '',
        thru: 'Not Started',
        teeTime: ''
      };
    });

    const sortedPicks = [...picks].sort((a, b) => {
      if ((a.position ?? 999) !== (b.position ?? 999)) return (a.position ?? 999) - (b.position ?? 999);
      if ((a.score ?? 999) !== (b.score ?? 999)) return (a.score ?? 999) - (b.score ?? 999);
      return String(a.name).localeCompare(String(b.name));
    });

    return {
      ...entry,
      originalIndex,
      sortedPicks,
      sortKey: [
        sortedPicks[0]?.position ?? 999,
        sortedPicks[1]?.position ?? 999,
        sortedPicks[2]?.position ?? 999,
        originalIndex
      ]
    };
  });

  const hasAnyRealScores = players.some(p => p.thru && !String(p.thru).toLowerCase().includes('tee') && String(p.thru).toLowerCase() !== 'not started');

  const ranked = hasAnyRealScores
    ? evaluated.sort((a, b) => {
        for (let i = 0; i < 3; i++) {
          if (a.sortKey[i] !== b.sortKey[i]) return a.sortKey[i] - b.sortKey[i];
        }
        return a.originalIndex - b.originalIndex;
      })
    : evaluated.sort((a, b) => a.originalIndex - b.originalIndex);

  let lastKey = null;
  let currentRank = 0;

  return ranked.map((entry, index) => {
    const key = hasAnyRealScores
      ? entry.sortedPicks.map(p => p.position).join('|')
      : String(index + 1);

    if (key !== lastKey) {
      currentRank = index + 1;
      lastKey = key;
    }

    const tieCount = hasAnyRealScores
      ? ranked.filter(e => e.sortedPicks.map(p => p.position).join('|') === key).length
      : 1;

    const rankLabel = tieCount > 1 ? `T${currentRank}` : String(currentRank);
    const prev = previousRanks?.[entry.player];
    let move = '—';
    let moveClass = 'move-same';

    if (prev && hasAnyRealScores) {
      const numericNow = currentRank;
      if (numericNow < prev) {
        move = `▲ ${prev - numericNow}`;
        moveClass = 'move-up';
      } else if (numericNow > prev) {
        move = `▼ ${numericNow - prev}`;
        moveClass = 'move-down';
      }
    } else if (index < 3 && hasAnyRealScores) {
      move = '▲';
      moveClass = 'move-up';
    }

    return { ...entry, rankLabel, numericRank: currentRank, move, moveClass };
  });
}

export default function Home() {
  const [apiState, setApiState] = useState({ mode: 'loading', players: [], updatedAt: null, message: '' });
  const [poolExpanded, setPoolExpanded] = useState(false);
  const [golfExpanded, setGolfExpanded] = useState(false);
  const previousRanks = useRef({});

  async function loadLeaderboard() {
    try {
      const res = await fetch('/api/leaderboard', { cache: 'no-store' });
      const data = await res.json();
      setApiState(data);
    } catch (err) {
      setApiState({ mode: 'error', players: [], updatedAt: new Date().toISOString(), message: err?.message || 'Unable to load scores.' });
    }
  }

  useEffect(() => {
    loadLeaderboard();
    const delay = getRefreshDelay();
    const interval = setInterval(loadLeaderboard, delay);
    return () => clearInterval(interval);
  }, []);

  const players = useMemo(() => {
    const livePlayers = apiState.players?.length ? apiState.players : fallbackPlayers;
    return addPositionLabels(livePlayers);
  }, [apiState]);

  const pool = useMemo(() => {
    const ranked = evaluatePool(poolEntries, players, previousRanks.current);
    const next = {};
    ranked.forEach(r => { next[r.player] = r.numericRank; });
    previousRanks.current = next;
    return ranked;
  }, [players]);

  const leader = pool[0];
  const updatedText = apiState.updatedAt
    ? `Updated ${Math.max(0, Math.round((Date.now() - new Date(apiState.updatedAt).getTime()) / 60000))} min ago`
    : 'Waiting for scores';

  const golfLeaderNames = players.filter(p => p.position === players[0]?.position).map(p => p.name).join(' / ');
  const isLive = apiState.mode === 'live';
  const warningText = apiState.mode === 'missing-key'
    ? 'API key missing in Vercel. Add SLASH_GOLF_API_KEY in Environment Variables.'
    : apiState.mode === 'api-error'
      ? `Live API fallback active: ${apiState.message || 'waiting for valid Slash Golf response'}`
      : '';

  return (
    <main className="page">
      <div className="header">
        <div className="logo">
          <h1>PGA</h1>
          <div>CHAMPIONSHIP</div>
          <div>LIVE</div>
        </div>

        <div className="title">
          <h2>{TOURNAMENT_NAME}</h2>
          <div className="subtitle">{COURSE_NAME} • {FIELD_NOTE}</div>
          <div className="livebar">
            <div className="live">{isLive ? 'LIVE' : 'READY'}</div>
            <div className="updated">{updatedText}</div>
          </div>
        </div>
      </div>

      {warningText && <div className="warning">{warningText}</div>}

      <div className="grid">
        <section className={`panel ${golfExpanded ? 'expanded' : ''}`}>
          <div className="panel-title">Tournament Leaderboard</div>
          <table>
            <thead>
              <tr>
                <th>Pos</th>
                <th>Player</th>
                <th>Today</th>
                <th>Thru</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p, idx) => (
                <tr key={`${p.name}-${idx}`} className={idx >= 12 ? 'hidden-row' : ''}>
                  <td>{posLabel(p)}</td>
                  <td className="player">{p.name}</td>
                  <td className="red">{scoreLabel(p.today)}</td>
                  <td>{p.teeTime && (!p.thru || String(p.thru).toLowerCase().includes('tee')) ? p.teeTime : (p.thru || '—')}</td>
                  <td className="red">{scoreLabel(p.score)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="footer-btn" onClick={() => setGolfExpanded(!golfExpanded)}>
            {golfExpanded ? 'COLLAPSE TOURNAMENT LEADERBOARD ▲' : 'FULL TOURNAMENT LEADERBOARD ▶'}
          </button>
        </section>

        <div>
          <section className="panel">
            <div className="panel-title">Projected Pool Leader</div>
            <div className="leader-box">
              <div className="big">{leader?.player?.toUpperCase() || 'WAITING'}</div>
              <div className="reason">
                {golfLeaderNames ? `${golfLeaderNames} currently lead${golfLeaderNames.includes('/') ? '' : 's'} the tournament.` : 'Waiting for first scores.'}<br />
                {leader ? `${leader.player} leads the pool on current tie-breaks.` : 'Pool leaderboard will update once scores arrive.'}
              </div>
              <div className="leader-updated">{updatedText}</div>
            </div>
          </section>

          <section className={`panel pool-panel ${poolExpanded ? 'expanded' : ''}`}>
            <div className="panel-title">Live Pool Leaderboard</div>
            <table>
              <thead>
                <tr>
                  <th>Pos</th>
                  <th>Move</th>
                  <th>Player</th>
                  <th>Best Pick</th>
                  <th>Next Best</th>
                  <th>3rd Pick</th>
                </tr>
              </thead>
              <tbody>
                {pool.map((entry, idx) => {
                  const best = entry.sortedPicks[0];
                  const second = entry.sortedPicks[1];
                  const third = entry.sortedPicks[2];
                  const isBestLeading = best.position === players[0]?.position;
                  return (
                    <tr key={entry.player} className={idx >= 12 ? 'hidden-row' : ''}>
                      <td>{entry.rankLabel}</td>
                      <td className={entry.moveClass}>{entry.move}</td>
                      <td className="player">{entry.player}</td>
                      <td className={isBestLeading ? 'green highlight' : ''}>{best.name} <span className="small">({posLabel(best)})</span></td>
                      <td>{second.name} <span className="small">({posLabel(second)})</span></td>
                      <td>{third.name} <span className="small">({posLabel(third)})</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <button className="footer-btn" onClick={() => setPoolExpanded(!poolExpanded)}>
              {poolExpanded ? 'COLLAPSE POOL LEADERBOARD ▲' : 'FULL POOL LEADERBOARD ▶'}
            </button>
          </section>
        </div>
      </div>

      <div className="note">
        Live rankings compare each entry’s best current golf position, then next best, then third pick. Tied golf positions remain tied and move to the next comparison.
      </div>
    </main>
  );
}
