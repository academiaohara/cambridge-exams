import { loadUserData, getJornadaState } from '../storage.js';
import { escHtml } from '../utils.js';

function porraLabel(porra) {
  if (!porra || porra.home == null) return '—';
  return `${porra.home}-${porra.away}`;
}

function symbolHeader(icon, label) {
  return `<div class="symbol-header"><i class="${icon}" aria-hidden="true"></i><span>${label}</span></div>`;
}

export function renderRanking(app, data, selectedJornadaId) {
  const jornada = data.jornadas.find((j) => j.id === selectedJornadaId) || data.jornadas.at(-1);
  const userState = getJornadaState(loadUserData(), jornada.id);
  const aviles = jornada.matches.find((m) => m.isAviles);

  app.innerHTML = `
    <h1 class="page-title">Resultados y ranking</h1>
    <p class="page-subtitle">Tus aciertos en ${jornada.label}</p>
    ${renderJornadaBar(data, jornada)}
    <section class="card ranking-table-wrap">
      <table class="ranking-table">
        <thead>
          <tr>
            <th>Partido</th>
            <th class="col-symbol">${symbolHeader('fas fa-list-ol', '1·X·2')}</th>
            <th class="col-symbol">${symbolHeader('fas fa-border-all porra-symbol', 'Porra')}</th>
            <th class="col-symbol">${symbolHeader('fas fa-futbol', 'Goleador')}</th>
          </tr>
        </thead>
        <tbody>
          ${jornada.matches.map((m) => renderResultRow(m, userState, aviles)).join('')}
        </tbody>
      </table>
    </section>
    <section class="card" style="margin-top:1rem">
      <h2 style="margin:0 0 0.75rem;font-size:1.1rem">Clasificación acumulada</h2>
      <table class="ranking-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Participante</th>
            <th class="col-symbol"><i class="fas fa-list-ol"></i></th>
            <th class="col-symbol"><i class="fas fa-border-all porra-symbol"></i></th>
            <th class="col-symbol"><i class="fas fa-futbol"></i></th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${renderAccumulatedRows(data)}
        </tbody>
      </table>
    </section>
  `;

  bindRankingNav(app, data);
}

function renderResultRow(match, userState, avilesMatch) {
  const pick = userState.picks[match.id];
  const result = match.result;
  const hit = result && pick === result;

  let porraCell = '<span class="result-badge result-badge--pending">—</span>';
  let golCell = '<span class="result-badge result-badge--pending">—</span>';

  if (match.isAviles && avilesMatch) {
    const porra = userState.porra;
    const pr = match.porraResult;
    if (pr && porra.home != null) {
      const ok =
        (porra.home === String(pr.home) || (porra.home === 'M' && pr.home >= 3)) &&
        (porra.away === String(pr.away) || (porra.away === 'M' && pr.away >= 3));
      porraCell = `<span class="result-badge ${ok ? 'result-badge--hit' : 'result-badge--miss'}">${porraLabel(porra)}</span>`;
    } else if (porra.home != null) {
      porraCell = `<span class="result-badge result-badge--pending">${porraLabel(porra)}</span>`;
    }
    const gol = userState.goleador;
    if (match.goleadorResult && gol) {
      const ok = gol === match.goleadorResult;
      golCell = `<span class="result-badge ${ok ? 'result-badge--hit' : 'result-badge--miss'}">${escHtml(gol)}</span>`;
    } else if (gol) {
      golCell = `<span class="result-badge result-badge--pending">${escHtml(gol)}</span>`;
    }
  }

  return `
    <tr>
      <td><strong>${escHtml(match.home)}</strong> – ${escHtml(match.away)}</td>
      <td class="result-cell">
        <span class="result-badge ${result ? (hit ? 'result-badge--hit' : 'result-badge--miss') : 'result-badge--pending'}">${pick || '—'}</span>
      </td>
      <td class="result-cell">${porraCell}</td>
      <td class="result-cell">${golCell}</td>
    </tr>
  `;
}

function renderAccumulatedRows(data) {
  const scores = [
    { name: 'María G.', q: 24, p: 6, g: 4, t: 34 },
    { name: 'Carlos R.', q: 22, p: 9, g: 2, t: 33 },
    { name: 'Laura M.', q: 21, p: 6, g: 5, t: 32 },
    { name: 'Tú', q: 20, p: 6, g: 3, t: 29, isYou: true },
    { name: 'Pablo S.', q: 19, p: 3, g: 4, t: 26 },
  ];
  return scores
    .map(
      (s, i) => `
    <tr class="${s.isYou ? 'is-you' : ''}">
      <td>${i + 1}</td>
      <td>${escHtml(s.name)}</td>
      <td class="result-cell">${s.q}</td>
      <td class="result-cell">${s.p}</td>
      <td class="result-cell">${s.g}</td>
      <td><strong>${s.t}</strong></td>
    </tr>`
    )
    .join('');
}

function renderJornadaBar(data, jornada) {
  const ids = data.jornadas.map((j) => j.id);
  const idx = ids.indexOf(jornada.id);
  return `
    <div class="jornada-bar-wrap card">
      <input type="range" class="jornada-slider" id="jornada-slider-rank" min="0" max="${ids.length - 1}" value="${idx}" />
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

function bindRankingNav(app, data) {
  const go = (id) => {
    window.location.hash = `#/ranking?jornada=${id}`;
  };
  app.querySelector('#jornada-slider-rank')?.addEventListener('input', (e) => {
    const ids = data.jornadas.map((j) => j.id);
    go(ids[Number(e.target.value)]);
  });
  app.querySelectorAll('.jornada-pill').forEach((pill) => {
    pill.addEventListener('click', () => go(Number(pill.dataset.jornadaId)));
  });
}
