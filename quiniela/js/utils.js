export function formatKickoff(iso) {
  const d = new Date(iso);
  return d.toLocaleString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isMatchStarted(kickoff) {
  return Date.now() >= new Date(kickoff).getTime();
}

export function isJornadaLocked(jornada) {
  const firstKickoff = jornada.matches
    .map((m) => new Date(m.kickoff).getTime())
    .sort((a, b) => a - b)[0];
  return Date.now() >= firstKickoff;
}

export function canEditJornada(jornada, state) {
  if (isJornadaLocked(jornada)) return false;
  if (!state.saved) return true;
  return state.editing;
}

export function votePercent(count, total) {
  if (!total) return 0;
  return Math.round((count / total) * 100);
}

export function renderVoteStats(votes) {
  const total = (votes['1'] || 0) + (votes['X'] || 0) + (votes['2'] || 0);
  const lines = ['1', 'X', '2'].map((opt) => {
    const n = votes[opt] || 0;
    const pct = votePercent(n, total);
    return `<strong>${opt}</strong> ${n} (${pct}%)`;
  });
  return lines.join(' · ');
}

export function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
