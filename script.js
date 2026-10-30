const STORAGE_KEY = 'halloween-party-state';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'halloween';

const playerLoginForm = document.getElementById('player-login-form');
const playerNameInput = document.getElementById('player-name');
const playerStatus = document.getElementById('player-status');

const adminLoginForm = document.getElementById('admin-login-form');
const adminUsernameInput = document.getElementById('admin-username');
const adminPasswordInput = document.getElementById('admin-password');
const adminPanel = document.getElementById('admin-panel');
const playerList = document.getElementById('player-list');
const adminLogoutButton = document.getElementById('admin-logout');

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { players: {} };
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Could not parse saved state. Resetting it.');
    return { players: {} };
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normaliseName(name) {
  return name.trim().replace(/\s+/g, ' ');
}

function getStatusLabel(state) {
  if (state === 'safe') return 'Safe';
  if (state === 'danger') return 'Not Safe';
  return 'Waiting';
}

function renderPlayerStatus() {
  if (!playerStatus) return;

  const name = sessionStorage.getItem('halloween-player-name');
  if (!name) {
    document.body.classList.remove('player-safe', 'player-danger', 'player-waiting');
    playerStatus.classList.add('hidden');
    return;
  }

  const state = loadState().players[name];
  if (!state || state === 'waiting') {
    document.body.classList.add('player-waiting');
    document.body.classList.remove('player-safe', 'player-danger');
    playerStatus.classList.remove('hidden');
    playerStatus.className = 'status-panel waiting';
    playerStatus.innerHTML = '<strong>Waiting for assignment</strong><br />The admin will assign whether you are safe or not safe.';
    return;
  }

  const isSafe = state === 'safe';
  document.body.classList.toggle('player-safe', isSafe);
  document.body.classList.toggle('player-danger', !isSafe);
  document.body.classList.remove('player-waiting');

  playerStatus.classList.remove('hidden');
  playerStatus.className = `status-panel ${isSafe ? 'safe' : 'danger'}`;
  playerStatus.innerHTML = `
    <strong>${isSafe ? 'You are safe' : 'You are not safe'}</strong><br />
    Your screen colour has been updated for the game.
  `;
}

function renderAdminList() {
  if (!playerList) return;

  const state = loadState();
  const names = Object.keys(state.players).sort((a, b) => a.localeCompare(b));

  if (!names.length) {
    playerList.innerHTML = '<p>No players have joined yet.</p>';
    return;
  }

  playerList.innerHTML = names
    .map((name) => {
      const status = state.players[name] || 'waiting';
      return `
        <div class="player-row">
          <div class="player-meta">
            <span class="player-name">${name}</span>
            <span class="player-state">${getStatusLabel(status)}</span>
          </div>
          <div class="player-actions">
            <button class="safe-btn" type="button" data-name="${name}" data-action="safe">Safe</button>
            <button class="danger-btn" type="button" data-name="${name}" data-action="danger">Not Safe</button>
            <button class="reset-btn" type="button" data-name="${name}" data-action="waiting">Reset</button>
          </div>
        </div>
      `;
    })
    .join('');

  playerList.querySelectorAll('button[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const { name, action } = button.dataset;
      updatePlayerState(name, action);
    });
  });
}

function updatePlayerState(name, status) {
  const state = loadState();
  state.players[name] = status;
  saveState(state);
  renderAdminList();
  renderPlayerStatus();
}

if (playerLoginForm && playerNameInput) {
  playerLoginForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const name = normaliseName(playerNameInput.value);
    if (!name) {
      return;
    }

    const state = loadState();
    if (!state.players[name]) {
      state.players[name] = 'waiting';
      saveState(state);
    }

    sessionStorage.setItem('halloween-player-name', name);
    renderPlayerStatus();
    playerNameInput.value = '';
    window.location.href = 'playerPage.html';
  });
}

if (adminLoginForm && adminUsernameInput && adminPasswordInput) {
  adminLoginForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const username = adminUsernameInput.value.trim();
    const password = adminPasswordInput.value;

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      sessionStorage.setItem('halloween-admin-logged-in', 'true');
      window.location.href = 'adminPage.html';
    } else {
      alert('Incorrect admin username or password.');
    }
  });
}

if (adminLogoutButton) {
  adminLogoutButton.addEventListener('click', () => {
    if (adminPanel) {
      adminPanel.classList.add('hidden');
    }
    sessionStorage.removeItem('halloween-admin-logged-in');
    window.location.href = 'index.html';
  });
}

if (adminPanel && sessionStorage.getItem('halloween-admin-logged-in') === 'true') {
  adminPanel.classList.remove('hidden');
}

if (playerStatus) {
  renderPlayerStatus();
}

const state = loadState();
if (playerList && Object.keys(state.players).length > 0) {
  renderAdminList();
}

window.addEventListener('storage', () => {
  renderPlayerStatus();
  if (adminPanel && !adminPanel.classList.contains('hidden')) {
    renderAdminList();
  }
});
