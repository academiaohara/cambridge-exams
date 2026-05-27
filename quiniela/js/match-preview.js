import { escHtml, formatKickoff } from './utils.js';

export function openMatchPreview(match) {
  if (match.isAviles && match.previewPath) {
    window.open(match.previewPath, '_blank');
    return;
  }
  const modal = document.getElementById('match-preview-modal');
  const body = document.getElementById('preview-modal-body');
  const title = document.getElementById('preview-modal-title');
  if (!modal || !body || !title) return;

  title.textContent = `${match.home} vs ${match.away}`;
  const p = match.preview;
  if (!p) {
    body.innerHTML = '<p>No hay datos de previa disponibles.</p>';
  } else {
    body.innerHTML = `
      <p class="match-meta">${formatKickoff(match.kickoff)}</p>
      <div class="preview-grid">
        ${renderTeamPreview(match.home, p.homeStats)}
        ${renderTeamPreview(match.away, p.awayStats)}
      </div>
      <div class="preview-lists">
        <h4>Sancionados</h4>
        <p><strong>${escHtml(match.home)}:</strong> ${listOrNone(p.sanctioned?.home)}</p>
        <p><strong>${escHtml(match.away)}:</strong> ${listOrNone(p.sanctioned?.away)}</p>
        <h4>Lesionados</h4>
        <p><strong>${escHtml(match.home)}:</strong> ${listOrNone(p.injured?.home)}</p>
        <p><strong>${escHtml(match.away)}:</strong> ${listOrNone(p.injured?.away)}</p>
      </div>
    `;
  }
  modal.classList.remove('hidden');
}

function renderTeamPreview(name, stats) {
  if (!stats) return `<div class="preview-team"><h3>${escHtml(name)}</h3><p>Sin datos</p></div>`;
  const formLabel = stats.homeForm ? 'Como local' : 'Como visitante';
  const form = stats.homeForm || stats.awayForm || '—';
  return `
    <div class="preview-team">
      <h3>${escHtml(name)}</h3>
      <div class="preview-stat"><span>Posición</span><span>${stats.pos}º</span></div>
      <div class="preview-stat"><span>Puntos</span><span>${stats.pts}</span></div>
      <div class="preview-stat"><span>Goles a favor</span><span>${stats.gf}</span></div>
      <div class="preview-stat"><span>Goles en contra</span><span>${stats.gc}</span></div>
      <div class="preview-stat"><span>Racha</span><span>${escHtml(stats.streak)}</span></div>
      <div class="preview-stat"><span>${formLabel}</span><span>${escHtml(form)}</span></div>
    </div>
  `;
}

function listOrNone(arr) {
  if (!arr || !arr.length) return 'Ninguno';
  return arr.map(escHtml).join(', ');
}

export function initPreviewModal() {
  const modal = document.getElementById('match-preview-modal');
  if (!modal) return;
  modal.querySelectorAll('[data-close-modal]').forEach((el) => {
    el.addEventListener('click', () => modal.classList.add('hidden'));
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') modal.classList.add('hidden');
  });
}
