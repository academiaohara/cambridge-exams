import {
  loadUserData,
  getJornadaState,
  setJornadaPicks,
  markSaved,
  setEditing,
} from '../storage.js';
import {
  formatKickoff,
  canEditJornada,
  isJornadaLocked,
  renderVoteStats,
  escHtml,
} from '../utils.js';
import { openMatchPreview } from '../match-preview.js';

export function renderHome(app, data, selectedJornadaId) {
  const jornada = data.jornadas.find((j) => j.id === selectedJornadaId) || data.jornadas.at(-1);
  const userData = loadUserData();
  const state = getJornadaState(userData, jornada.id);
  const locked = isJornadaLocked(jornada);
  const editable = canEditJornada(jornada, state);
  const allPicked = jornada.matches.every((m) => state.picks[m.id]);

  let banner = '';
  if (locked) {
    banner = '<div class="status-banner status-banner--warning">La edición está cerrada: ya ha comenzado el primer partido de la jornada.</div>';
  } else if (state.saved && !state.editing) {
    banner = '<div class="status-banner status-banner--success">Quiniela guardada. Pulsa <strong>Editar</strong> para modificar tus pronósticos.</div>';
  } else if (state.editing) {
    banner = '<div class="status-banner status-banner--info">Modo edición activo. Guarda cuando termines.</div>';
  }

  const minJ = data.jornadas[0].id;
  const maxJ = data.jornadas[data.jornadas.length - 1].id;

  app.innerHTML = `
    <h1 class="page-title">Quiniela</h1>
    <p class="page-subtitle">Rellena tu quiniela de la jornada y consulta qué eligen el resto.</p>

    ${renderJornadaBar(data, jornada)}

    <section class="card mi-quiniela-section">
      <h2 class="page-title" style="font-size:1.25rem;margin-bottom:0.75rem">Mi quiniela</h2>
      ${banner}
      <div class="match-list" id="match-list">
        ${jornada.matches.map((m) => renderMatchRow(m, state, editable)).join('')}
      </div>
      <div class="actions-bar">
        <button type="button" class="btn btn-secondary" id="btn-edit" ${!state.saved || locked ? 'disabled' : ''}>Editar</button>
        <button type="button" class="btn btn-primary" id="btn-save" ${!editable || !allPicked ? 'disabled' : ''}>Guardar</button>
      </div>
    </section>
  `;

  bindHomeEvents(app, jornada, userData, minJ, maxJ, data);
}

function renderJornadaBar(data, jornada) {
  const ids = data.jornadas.map((j) => j.id);
  const idx = ids.indexOf(jornada.id);
  return `
    <div class="jornada-bar-wrap card">
      <div class="jornada-bar-labels">
        <span>${data.jornadas[0].label}</span>
        <span>${jornada.label}</span>
        <span>${data.jornadas.at(-1).label}</span>
      </div>
      <input type="range" class="jornada-slider" id="jornada-slider" min="0" max="${ids.length - 1}" value="${idx}" step="1" />
      <div class="jornada-pills" id="jornada-pills">
        ${data.jornadas
          .map(
            (j) => `
          <button type="button" class="jornada-pill ${j.id === data.currentJornada ? 'is-current' : ''} ${j.id === jornada.id ? 'is-selected' : ''}" data-jornada-id="${j.id}">
            ${escHtml(j.label)}
          </button>`
          )
          .join('')}
      </div>
    </div>
  `;
}

function renderMatchRow(match, state, editable) {
  const pick = state.picks[match.id];
  const avilesClass = match.isAviles ? ' is-aviles' : '';
  return `
    <article class="match-row ${editable ? '' : 'is-locked'}" data-match-id="${match.id}">
      <div class="match-teams">
        <span class="match-team${avilesClass}">${escHtml(match.home)}</span>
        <span class="match-team${avilesClass}">${escHtml(match.away)}</span>
        <span class="match-meta">${formatKickoff(match.kickoff)}</span>
      </div>
      <div class="pick-group" role="group" aria-label="Pronóstico 1 X 2">
        ${['1', 'X', '2']
          .map(
            (opt) => `
          <button type="button" class="pick-btn ${pick === opt ? 'is-selected' : ''}" data-pick="${opt}" ${editable ? '' : 'disabled'}>${opt}</button>`
          )
          .join('')}
      </div>
      <div class="match-actions">
        <button type="button" class="btn-preview" data-preview="${match.id}">Ver previa</button>
        <div class="vote-stats">${renderVoteStats(match.votes)}</div>
      </div>
    </article>
  `;
}

function bindHomeEvents(app, jornada, userData, minJ, maxJ, data) {
  const onJornadaChange = (id) => {
    window.location.hash = `#/?jornada=${id}`;
  };

  app.querySelector('#jornada-slider')?.addEventListener('input', (e) => {
    const ids = data.jornadas.map((j) => j.id);
    onJornadaChange(ids[Number(e.target.value)]);
  });

  app.querySelectorAll('.jornada-pill').forEach((pill) => {
    pill.addEventListener('click', () => onJornadaChange(Number(pill.dataset.jornadaId)));
  });

  app.querySelectorAll('.pick-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const row = btn.closest('.match-row');
      const matchId = row.dataset.matchId;
      const state = getJornadaState(userData, jornada.id);
      const picks = { ...state.picks, [matchId]: btn.dataset.pick };
      setJornadaPicks(userData, jornada.id, picks);
      renderHome(document.getElementById('app'), data, jornada.id);
    });
  });

  app.querySelectorAll('[data-preview]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const match = jornada.matches.find((m) => m.id === btn.dataset.preview);
      if (match) openMatchPreview(match);
    });
  });

  app.querySelector('#btn-save')?.addEventListener('click', () => {
    markSaved(userData, jornada.id, true);
    renderHome(document.getElementById('app'), data, jornada.id);
  });

  app.querySelector('#btn-edit')?.addEventListener('click', () => {
    setEditing(userData, jornada.id, true);
    renderHome(document.getElementById('app'), data, jornada.id);
  });
}
