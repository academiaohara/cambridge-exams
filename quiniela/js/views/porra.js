import {
  loadUserData,
  getJornadaState,
  setJornadaPorra,
  setJornadaGoleador,
  markSaved,
  setEditing,
} from '../storage.js';
import { canEditJornada, isJornadaLocked, escHtml } from '../utils.js';

const SCORE_OPTS = ['0', '1', '2', 'M'];

export function renderPorra(app, data, selectedJornadaId) {
  const jornada = data.jornadas.find((j) => j.id === selectedJornadaId) || data.jornadas.at(-1);
  const avilesMatch = jornada.matches.find((m) => m.isAviles);
  const userData = loadUserData();
  const state = getJornadaState(userData, jornada.id);
  const locked = isJornadaLocked(jornada);
  const editable = canEditJornada(jornada, state);
  const players = jornada.avilesPlayers || [];

  if (!avilesMatch) {
    app.innerHTML = '<p>No hay partido del Avilés en esta jornada.</p>';
    return;
  }

  const porraComplete = state.porra.home != null && state.porra.away != null;
  const goleadorOk = state.goleador != null;

  app.innerHTML = `
    <h1 class="page-title">Porra del Avilés</h1>
    <p class="page-subtitle">${escHtml(avilesMatch.home)} vs ${escHtml(avilesMatch.away)} — ${jornada.label}</p>
    ${renderJornadaSlider(data, jornada)}
    <section class="card porra-section">
      <h2>Marcador exacto</h2>
      <p class="page-subtitle" style="margin-top:0">M = 3 o más goles</p>
      ${renderScoreRow('Local (Avilés)', 'home', state.porra.home, editable)}
      ${renderScoreRow('Visitante', 'away', state.porra.away, editable)}
      <h2 style="margin-top:1.5rem">Goleador del Avilés</h2>
      <p class="page-subtitle" style="margin-top:0">Elige un jugador o «Nadie mete»</p>
      <div class="goleador-grid" id="goleador-grid">
        <button type="button" class="goleador-chip ${state.goleador === 'Nadie' ? 'is-selected' : ''}" data-goleador="Nadie" ${editable ? '' : 'disabled'}>Nadie mete</button>
        ${players
          .map(
            (p) => `
          <button type="button" class="goleador-chip ${state.goleador === p ? 'is-selected' : ''}" data-goleador="${escHtml(p)}" ${editable ? '' : 'disabled'}>${escHtml(p)}</button>`
          )
          .join('')}
      </div>
      <div class="actions-bar">
        <button type="button" class="btn btn-secondary" id="btn-edit-porra" ${!state.saved || locked ? 'disabled' : ''}>Editar</button>
        <button type="button" class="btn btn-primary" id="btn-save-porra" ${!editable || !porraComplete || !goleadorOk ? 'disabled' : ''}>Guardar</button>
      </div>
    </section>
  `;

  bindPorraEvents(app, jornada, userData, data, avilesMatch);
}

function renderJornadaSlider(data, jornada) {
  const ids = data.jornadas.map((j) => j.id);
  const idx = ids.indexOf(jornada.id);
  return `
    <div class="jornada-bar-wrap card">
      <input type="range" class="jornada-slider" id="jornada-slider-porra" min="0" max="${ids.length - 1}" value="${idx}" />
      <div class="jornada-pills">
        ${data.jornadas
          .map(
            (j) => `
          <button type="button" class="jornada-pill ${j.id === data.currentJornada ? 'is-current' : ''} ${j.id === jornada.id ? 'is-selected' : ''}" data-jornada-id="${j.id}">${escHtml(j.label)}</button>`
          )
          .join('')}
      </div>
    </div>
  `;
}

function renderScoreRow(label, side, selected, editable) {
  return `
    <div class="porra-score-row">
      <span class="porra-team-label">${escHtml(label)}</span>
      <div class="score-cells" data-side="${side}">
        ${SCORE_OPTS.map(
          (opt) => `
          <button type="button" class="score-cell ${selected === opt ? 'is-selected' : ''}" data-score="${opt}" ${editable ? '' : 'disabled'}>${opt}</button>`
        ).join('')}
      </div>
    </div>
  `;
}

function bindPorraEvents(app, jornada, userData, data) {
  const go = (id) => {
    window.location.hash = `#/porra?jornada=${id}`;
  };

  app.querySelector('#jornada-slider-porra')?.addEventListener('input', (e) => {
    const ids = data.jornadas.map((j) => j.id);
    go(ids[Number(e.target.value)]);
  });

  app.querySelectorAll('.jornada-pill').forEach((pill) => {
    pill.addEventListener('click', () => go(Number(pill.dataset.jornadaId)));
  });

  app.querySelectorAll('.score-cells').forEach((group) => {
    group.querySelectorAll('.score-cell').forEach((cell) => {
      cell.addEventListener('click', () => {
        const state = getJornadaState(userData, jornada.id);
        const porra = { ...state.porra, [group.dataset.side]: cell.dataset.score };
        setJornadaPorra(userData, jornada.id, porra);
        renderPorra(document.getElementById('app'), data, jornada.id);
      });
    });
  });

  app.querySelectorAll('.goleador-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      setJornadaGoleador(userData, jornada.id, chip.dataset.goleador);
      renderPorra(document.getElementById('app'), data, jornada.id);
    });
  });

  app.querySelector('#btn-save-porra')?.addEventListener('click', () => {
    markSaved(userData, jornada.id, true);
    renderPorra(document.getElementById('app'), data, jornada.id);
  });

  app.querySelector('#btn-edit-porra')?.addEventListener('click', () => {
    setEditing(userData, jornada.id, true);
    renderPorra(document.getElementById('app'), data, jornada.id);
  });
}
