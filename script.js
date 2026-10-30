const STORAGE_KEY = 'halloween-party-state';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'halloween';
const PLAYER_MESSAGE_KEY = 'halloween-player-message';
const PLAYER_LOGOUT_REASON_KEY = 'halloween-player-logout-reason';
const API_BASE_URL = ((window.HALLOWEEN_APP_CONFIG && window.HALLOWEEN_APP_CONFIG.apiBaseUrl) || '').replace(/\/$/, '');

const playerLoginForm = document.getElementById('player-login-form');
const playerNameInput = document.getElementById('player-name');
const playerStatus = document.getElementById('player-status');
const playerMessage = document.getElementById('player-message');

function apiUrl(path) {
  return `${API_BASE_URL || ''}${path}`;
}

const adminLoginForm = document.getElementById('admin-login-form');
const adminUsernameInput = document.getElementById('admin-username');
const adminPasswordInput = document.getElementById('admin-password');
const adminPanel = document.getElementById('admin-panel');
const playerList = document.getElementById('player-list');
const adminLogoutButton = document.getElementById('admin-logout');
const playerLogoutButton = document.getElementById('player-logout');

async function loadState() {
  const response = await fetch(apiUrl('/api/players'));
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Unable to load players.');
  }

  return data.players || {};
}

function normaliseName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ');
}

function getStatusLabel(state) {
  if (state === 'safe') return 'Safe';
  if (state === 'danger') return 'Not Safe';
  return 'Waiting';
}

async function ensurePlayer(name) {
  const response = await fetch(apiUrl('/api/players'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Unable to create player.');
  }

  return data.player;
}

async function updatePlayerState(name, status) {
  const response = await fetch(apiUrl(`/api/players/${encodeURIComponent(name)}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Unable to update player.');
  }

  return data;
}

async function deletePlayer(name) {
  const response = await fetch(apiUrl(`/api/players/${encodeURIComponent(name)}`), {
    method: 'DELETE'
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Unable to remove player.');
  }

  return data;
}

function renderLandingMessage() {
  if (!playerMessage) return;

  const message = sessionStorage.getItem(PLAYER_MESSAGE_KEY);
  if (!message) {
    playerMessage.textContent = '';
    playerMessage.classList.add('hidden');
    return;
  }

  playerMessage.textContent = message;
  playerMessage.classList.remove('hidden');
}

async function renderPlayerStatus() {
  if (!playerStatus) return;

  const name = sessionStorage.getItem('halloween-player-name');
  if (!name) {
    document.body.classList.remove('player-safe', 'player-danger', 'player-waiting');
    playerStatus.classList.add('hidden');
    return;
  }

  try {
    const state = await loadState();

    if (!(name in state)) {
      const logoutReason = sessionStorage.getItem(PLAYER_LOGOUT_REASON_KEY);

      if (logoutReason === 'self') {
        sessionStorage.removeItem(PLAYER_LOGOUT_REASON_KEY);
        sessionStorage.removeItem('halloween-player-name');
        window.location.href = 'index.html';
        return;
      }

      const removedMessage = 'You were removed from the game by the admin.';
      sessionStorage.setItem(PLAYER_MESSAGE_KEY, removedMessage);
      sessionStorage.removeItem('halloween-player-name');
      window.location.href = 'index.html';
      return;
    }

    const status = state[name] || 'waiting';

    if (!status || status === 'waiting') {
      document.body.classList.add('player-waiting');
      document.body.classList.remove('player-safe', 'player-danger');
      playerStatus.classList.remove('hidden');
      playerStatus.className = 'status-panel waiting player-full-status';
      playerStatus.textContent = 'Waiting For Admin';
      return;
    }

    const isSafe = status === 'safe';
    document.body.classList.toggle('player-safe', isSafe);
    document.body.classList.toggle('player-danger', !isSafe);
    document.body.classList.remove('player-waiting');

    playerStatus.classList.remove('hidden');
    playerStatus.className = `status-panel ${isSafe ? 'safe' : 'danger'} player-full-status`;
    playerStatus.textContent = isSafe ? 'Safe' : 'Not Safe';
  } catch (error) {
    console.error('Could not render player status:', error);
  }
}

async function renderAdminList() {
  if (!playerList) return;

  try {
    const state = await loadState();
    const names = Object.keys(state).sort((a, b) => a.localeCompare(b));

    if (!names.length) {
      playerList.innerHTML = '<p>No players have joined yet.</p>';
      return;
    }

    playerList.innerHTML = names
      .map((name) => {
        const status = state[name] || 'waiting';
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
              <button class="remove-btn" type="button" data-name="${name}" data-action="remove">Remove</button>
            </div>
          </div>
        `;
      })
      .join('');

    playerList.querySelectorAll('button[data-action]').forEach((button) => {
      button.addEventListener('click', async () => {
        const { name, action } = button.dataset;

        if (action === 'remove') {
          const confirmed = window.confirm(`Remove ${name} from the game?`);
          if (!confirmed) {
            return;
          }

          try {
            await deletePlayer(name);
            await renderAdminList();
            await renderPlayerStatus();
          } catch (error) {
            alert(error.message || 'Could not remove player.');
          }
          return;
        }

        const actionLabels = {
          safe: 'Safe',
          danger: 'Not Safe',
          waiting: 'Waiting'
        };

        const confirmed = window.confirm(`Are you sure you want to mark ${name} as ${actionLabels[action] || 'update'}?`);
        if (!confirmed) {
          return;
        }

        await updatePlayerState(name, action);
        await renderAdminList();
        await renderPlayerStatus();
      });
    });
  } catch (error) {
    console.error('Could not render admin list:', error);
  }
}

if (playerLoginForm && playerNameInput) {
  playerLoginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const name = normaliseName(playerNameInput.value);
    if (!name) {
      return;
    }

    try {
      sessionStorage.removeItem(PLAYER_MESSAGE_KEY);
      sessionStorage.removeItem(PLAYER_LOGOUT_REASON_KEY);
      await ensurePlayer(name);
      sessionStorage.setItem('halloween-player-name', name);
      playerNameInput.value = '';
      window.location.href = 'playerPage.html';
    } catch (error) {
      alert(error.message || 'Could not create player.');
    }
  });
}

if (adminLoginForm && adminUsernameInput && adminPasswordInput) {
  adminLoginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = adminUsernameInput.value.trim();
    const password = adminPasswordInput.value;

    try {
      const response = await fetch(apiUrl('/api/admin/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Incorrect admin username or password.');
      }

      sessionStorage.setItem('halloween-admin-logged-in', 'true');
      window.location.href = 'adminPage.html';
    } catch (error) {
      alert(error.message || 'Incorrect admin username or password.');
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

if (playerLogoutButton) {
  playerLogoutButton.addEventListener('click', async () => {
    const name = sessionStorage.getItem('halloween-player-name');
    if (!name) {
      window.location.href = 'index.html';
      return;
    }

    const confirmed = window.confirm('Log out and remove you from the game?');
    if (!confirmed) {
      return;
    }

    try {
      await deletePlayer(name);
      sessionStorage.setItem(PLAYER_LOGOUT_REASON_KEY, 'self');
      sessionStorage.removeItem(PLAYER_MESSAGE_KEY);
      sessionStorage.removeItem('halloween-player-name');
      window.location.href = 'index.html';
    } catch (error) {
      alert(error.message || 'Could not log out.');
    }
  });
}

async function initializePage() {
  if (playerMessage) {
    renderLandingMessage();
  }

  if (playerStatus) {
    await renderPlayerStatus();
  }

  if (playerList) {
    await renderAdminList();
  }

  if (adminPanel && sessionStorage.getItem('halloween-admin-logged-in') === 'true') {
    adminPanel.classList.remove('hidden');
    await renderAdminList();
  }
}

const AUTO_REFRESH_MS = 2000;

setInterval(async () => {
  if (playerStatus) {
    await renderPlayerStatus();
  }

  if (playerList) {
    await renderAdminList();
  }

  if (adminPanel && !adminPanel.classList.contains('hidden')) {
    await renderAdminList();
  }
}, AUTO_REFRESH_MS);

initializePage();

window.addEventListener('storage', async () => {
  if (playerStatus) {
    await renderPlayerStatus();
  }

  if (adminPanel && !adminPanel.classList.contains('hidden')) {
    await renderAdminList();
  }
});

window.addEventListener('focus', async () => {
  if (playerStatus) {
    await renderPlayerStatus();
  }

  if (adminPanel && !adminPanel.classList.contains('hidden')) {
    await renderAdminList();
  }
});
