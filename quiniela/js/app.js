import { renderHome } from './views/home.js';
import { renderPorra } from './views/porra.js';
import { renderJornada } from './views/jornada.js';
import { renderRanking } from './views/ranking.js';
import { initPreviewModal } from './match-preview.js';

let appData = null;

function parseRoute() {
  const hash = window.location.hash.slice(1) || '/';
  const [pathPart, queryPart] = hash.split('?');
  const path = pathPart || '/';
  const params = new URLSearchParams(queryPart || '');
  const jornada = params.has('jornada') ? Number(params.get('jornada')) : null;
  return { path, jornada };
}

function setActiveNav(path) {
  document.querySelectorAll('.nav-link').forEach((link) => {
    const route = link.dataset.route;
    let active = false;
    if (path === '/' || path === '') active = route === 'home';
    else if (path.startsWith('/porra')) active = route === 'porra';
    else if (path.startsWith('/jornada')) active = route === 'jornada';
    else if (path.startsWith('/ranking')) active = route === 'ranking';
    link.classList.toggle('active', active);
  });
}

function getSelectedJornadaId(data, override) {
  if (override && data.jornadas.some((j) => j.id === override)) return override;
  return data.currentJornada;
}

async function loadData() {
  const res = await fetch('data/jornadas.json');
  return res.json();
}

async function render() {
  if (!appData) appData = await loadData();
  const { path, jornada } = parseRoute();
  const jornadaId = getSelectedJornadaId(appData, jornada);
  const app = document.getElementById('app');
  if (!app) return;

  setActiveNav(path);

  if (path === '/' || path === '') {
    renderHome(app, appData, jornadaId);
  } else if (path.startsWith('/porra')) {
    renderPorra(app, appData, jornadaId);
  } else if (path.startsWith('/jornada')) {
    renderJornada(app, appData, jornadaId);
  } else if (path.startsWith('/ranking')) {
    renderRanking(app, appData, jornadaId);
  } else {
    renderHome(app, appData, jornadaId);
  }
}

initPreviewModal();
window.addEventListener('hashchange', render);
loadData().then(render);
