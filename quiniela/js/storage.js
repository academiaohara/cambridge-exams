const STORAGE_KEY = 'quiniela_aviles_v1';

export function loadUserData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { picks: {}, porra: {}, goleador: {}, saved: {}, editing: {} };
  } catch {
    return { picks: {}, porra: {}, goleador: {}, saved: {}, editing: {} };
  }
}

export function saveUserData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getJornadaState(data, jornadaId) {
  const id = String(jornadaId);
  return {
    picks: data.picks[id] || {},
    porra: data.porra[id] || { home: null, away: null },
    goleador: data.goleador[id] || null,
    saved: Boolean(data.saved[id]),
    editing: Boolean(data.editing[id]),
  };
}

export function setJornadaPicks(data, jornadaId, picks) {
  const id = String(jornadaId);
  data.picks[id] = picks;
  saveUserData(data);
}

export function setJornadaPorra(data, jornadaId, porra) {
  const id = String(jornadaId);
  data.porra[id] = porra;
  saveUserData(data);
}

export function setJornadaGoleador(data, jornadaId, goleador) {
  const id = String(jornadaId);
  data.goleador[id] = goleador;
  saveUserData(data);
}

export function markSaved(data, jornadaId, saved = true) {
  const id = String(jornadaId);
  data.saved[id] = saved;
  data.editing[id] = !saved;
  saveUserData(data);
}

export function setEditing(data, jornadaId, editing = true) {
  const id = String(jornadaId);
  data.editing[id] = editing;
  if (editing) data.saved[id] = false;
  saveUserData(data);
}
