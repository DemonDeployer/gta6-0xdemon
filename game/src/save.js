// Neon Bay — save / load (localStorage). Progress persists across reloads.
const KEY = 'neon-bay-save-v1';
export function saveGame(state) {
  try {
    const data = {
      cash: state.cash, jobsDone: state.jobsDone, debt: state.debt, debtPaid: state.debtPaid,
      completed: state.completed || [], wanted: state.wanted || 0,
      px: state.player ? state.player.x : 0, py: state.player ? state.player.y : 0,
      time: state.time || 0, savedAt: Date.now(),
    };
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch { return false; }
}
export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
export function clearSave() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } }
export function hasSave() { try { return localStorage.getItem(KEY) !== null; } catch { return false; } }
