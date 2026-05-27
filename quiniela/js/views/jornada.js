import { loadUserData, getJornadaState } from '../storage.js';
import { escHtml } from '../utils.js';

function computePoints(participant, jornada, allUserPicks) {
  let pts = 0;
  const picks = allUserPicks[participant.id] || {};
  jornada.matches.forEach((m) => {
    if (m.result && picks[m.id] === m.result) pts += 1;
  });
  if (jornada.matches.some((m) => m.isAviles)) {
    const av = jornada.matches.find((m) => m.isAviles);
    const porra = allUserPicks[participant.id]?.porra;
    if (porra && av.porraResult) {
      const homeHit = porra.home === String(av.porraResult.home) || (porra.home === 'M' && av.porraResult.home >= 3);
      const awayHit = porra.away === String(av.porraResult.away) || (porra.away === 'M' && av.porraResult.away >= 3);
      if (homeHit && awayHit) pts += 3;
    }
    const gol = allUserPicks[participant.id]?.goleador;
    if (gol && av.goleadorResult && gol === av.goleadorResult) pts += 2;
  }
  return pts;
}

function mockParticipantPicks(data, jornada) {
  const map = {};
  const options = ['1', 'X', '2'];
  data.participants.forEach((p, i) => {
    const picks = {};
    jornada.matches.forEach((m, mi) => {
      if (m.result) {
        picks[m.id] = i % 3 === mi % 3 ? m.result : options[(i + mi) % 3];
      }
    });
    if (p.isYou) {
      const state = getJornadaState(loadUserData(), jornada.id);
      Object.assign(picks, state.picks);
      map[p.id] = { ...picks, porra: state.porra, goleador: state.goleador };
    } else {
      map[p.id] = picks;
    }
  });
  return map;
}

export function renderJornada(app, data, selectedJornadaId) {
  const jornada = data.jornadas.find((j) => j.id === selectedJornadaId) || data.jornadas.at(-1);
  const allPicks = mockParticipantPicks(data, jornada);
  const hasStarted = jornada.matches.some((m) => m.result);

  const sorted = [...data.participants]
    .map((p) => ({
      ...p,
      points: hasStarted ? computePoints(p, jornada, allPicks) : 0,
    }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return new Date(a.submittedAt) - new Date(b.submittedAt);
    });

  if (!hasStarted) {
    sorted.sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
  }

  app.innerHTML = `
    <h1 class="page-title">Resultado de la jornada</h1>
    <p class="page-subtitle">${jornada.label} — ${hasStarted ? 'Clasificación en vivo' : 'Participantes por orden de envío'}</p>
    ${renderJornadaBar(data, jornada)}
    <section class="card">
      <ol class="leaderboard">
        ${sorted
          .map(
            (p, i) => `
          <li class="leaderboard-item ${p.isYou ? 'is-you' : ''}">
            <span class="leaderboard-rank">${hasStarted ? i + 1 : '—'}</span>
            <span class="leaderboard-name">${escHtml(p.name)}</span>
            <span class="leaderboard-points">${p.points} pts</span>
          </li>`
          )
          .join('')}
      </ol>
    </section>
  `;

  bindJornadaNav(app, data);
}

function renderJornadaBar(data, jornada) {
  const ids = data.jornadas.map((j) => j.id);
  const idx = ids.indexOf(jornada.id);
  return `
    <div class="jornada-bar-wrap card">
      <input type="range" class="jornada-slider" id="jornada-slider-live" min="0" max="${ids.length - 1}" value="${idx}" />
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

function bindJornadaNav(app, data) {
  const go = (id) => {
    window.location.hash = `#/jornada?jornada=${id}`;
  };
  app.querySelector('#jornada-slider-live')?.addEventListener('input', (e) => {
    const ids = data.jornadas.map((j) => j.id);
    go(ids[Number(e.target.value)]);
  });
  app.querySelectorAll('.jornada-pill').forEach((pill) => {
    pill.addEventListener('click', () => go(Number(pill.dataset.jornadaId)));
  });
}
