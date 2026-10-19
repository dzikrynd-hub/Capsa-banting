/* ============================================
   APP.JS - Main Application Controller
   Smooth animations, delayed bot turns,
   polished UI transitions
   ============================================ */

// ---- State ----
let game = null;
let bot = null;
let playerName = 'Player';
let selectedCards = [];
let jokerMode = false;
let currentScreen = 'lobby';
let botThinking = false;
let botTimeouts = [];

// ---- DOM ----
const $ = id => document.getElementById(id);

// ---- Initialize ----
document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initLobby();
});

// ---- Background Particles ----
function initParticles() {
    const container = $('bg-particles');
    if (!container) return;
    const symbols = ['♠', '♥', '♦', '♣', '🃏', '👑', 'A', 'K', 'Q', 'J', '2'];
    for (let i = 0; i < 25; i++) {
        const p = document.createElement('span');
        p.className = 'particle';
        p.textContent = symbols[Math.floor(Math.random() * symbols.length)];
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDelay = Math.random() * 25 + 's';
        p.style.animationDuration = (18 + Math.random() * 18) + 's';
        p.style.fontSize = (0.8 + Math.random() * 1.4) + 'rem';
        container.appendChild(p);
    }
}

// ---- Utility: smooth delay ----
function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// Clear all bot timeouts (when quitting)
function clearBotTimeouts() {
    botTimeouts.forEach(t => clearTimeout(t));
    botTimeouts = [];
    botThinking = false;
}

// ---- Lobby ----
function initLobby() {
    $('btn-host-bot').addEventListener('click', () => showSection('bot-section'));
    $('btn-host').addEventListener('click', () => showSection('host-section'));
    $('btn-join').addEventListener('click', () => showSection('join-section'));

    $('btn-bot-confirm').addEventListener('click', startBotGame);
    $('btn-bot-cancel').addEventListener('click', () => showSection('lobby-menu'));

    $('btn-host-confirm').addEventListener('click', hostGame);
    $('btn-host-cancel').addEventListener('click', () => showSection('lobby-menu'));

    $('btn-join-confirm').addEventListener('click', joinGame);
    $('btn-join-cancel').addEventListener('click', () => showSection('lobby-menu'));

    $('btn-leave-room').addEventListener('click', () => { clearBotTimeouts(); showSection('lobby-menu'); });
    $('btn-copy-code').addEventListener('click', copyRoomCode);
    $('btn-start-game').addEventListener('click', startMultiplayerGame);

    $('btn-play').addEventListener('click', playerPlay);
    $('btn-pass').addEventListener('click', playerPass);
    $('btn-sort').addEventListener('click', () => { if (game) { sortHand(game.hands[0]); renderPlayerHand(); } });
    $('btn-rules').addEventListener('click', () => $('rules-modal').classList.remove('hidden'));
    $('btn-rules-close').addEventListener('click', () => $('rules-modal').classList.add('hidden'));
    $('btn-quit-game').addEventListener('click', quitGame);

    $('btn-play-again').addEventListener('click', playAgain);
    $('btn-back-lobby').addEventListener('click', backToLobby);
}

function showSection(sectionId) {
    ['lobby-menu', 'bot-section', 'host-section', 'join-section', 'waiting-room'].forEach(id => {
        $(id).classList.add('hidden');
    });
    $(sectionId).classList.remove('hidden');
}

// ---- Start Bot Game ----
function startBotGame() {
    playerName = $('bot-player-name').value.trim() || 'Player';
    jokerMode = $('joker-toggle-bot').checked;

    const names = [playerName, 'Bot Alfa ♠', 'Bot Beta ♥', 'Bot Gamma ♦'];
    game = new CapsaGame(names, jokerMode);
    bot = new CapsaBot('medium');
    game.deal();
    switchToGame();
}

// ---- Host Game ----
function hostGame() {
    playerName = $('host-player-name').value.trim() || 'Host';
    jokerMode = $('joker-toggle-host').checked;

    const code = 'CB-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    $('display-room-code').textContent = code;

    renderWaitingRoom([playerName, null, null, null], true);
    showSection('waiting-room');

    const t1 = setTimeout(() => {
        renderWaitingRoom([playerName, 'Bot Alfa ♠', null, null], true);
        $('waiting-status').textContent = 'Menunggu pemain... (2/4)';
    }, 1200);

    const t2 = setTimeout(() => {
        renderWaitingRoom([playerName, 'Bot Alfa ♠', 'Bot Beta ♥', null], true);
        $('waiting-status').textContent = 'Menunggu pemain... (3/4)';
    }, 2800);

    const t3 = setTimeout(() => {
        renderWaitingRoom([playerName, 'Bot Alfa ♠', 'Bot Beta ♥', 'Bot Gamma ♦'], true);
        $('waiting-status').textContent = 'Room penuh! Siap mulai! 🎮';
        $('btn-start-game').classList.remove('hidden');
    }, 4200);

    botTimeouts.push(t1, t2, t3);
}

function startMultiplayerGame() {
    const names = [playerName, 'Bot Alfa ♠', 'Bot Beta ♥', 'Bot Gamma ♦'];
    game = new CapsaGame(names, jokerMode);
    bot = new CapsaBot('medium');
    game.deal();
    switchToGame();
}

function joinGame() {
    const name = $('join-player-name').value.trim() || 'Player';
    const code = $('room-code-input').value.trim().toUpperCase();
    if (!code) { showToast('Masukkan kode room!'); return; }

    playerName = name;
    $('display-room-code').textContent = code;
    renderWaitingRoom(['Host', playerName, 'Bot Beta ♥', null], false);
    $('waiting-status').textContent = 'Menunggu pemain... (3/4)';
    showSection('waiting-room');

    const t1 = setTimeout(() => {
        renderWaitingRoom(['Host', playerName, 'Bot Beta ♥', 'Bot Gamma ♦'], false);
        $('waiting-status').textContent = 'Room penuh! Menunggu host mulai...';
    }, 2500);

    const t2 = setTimeout(() => {
        jokerMode = false;
        const names = [playerName, 'Host', 'Bot Beta ♥', 'Bot Gamma ♦'];
        game = new CapsaGame(names, jokerMode);
        bot = new CapsaBot('medium');
        game.deal();
        switchToGame();
    }, 5000);

    botTimeouts.push(t1, t2);
}

function renderWaitingRoom(players, isHost) {
    const list = $('players-list');
    list.innerHTML = '';
    players.forEach((name, i) => {
        const slot = document.createElement('div');
        slot.className = `player-slot ${!name ? 'empty' : ''}`;
        slot.innerHTML = `
            <span class="slot-number">${i + 1}</span>
            <span class="slot-name">${name || 'Menunggu...'}</span>
            ${i === 0 && isHost ? '<span style="color:var(--gold);font-size:0.8rem">👑</span>' : ''}
        `;
        list.appendChild(slot);
    });
}

function copyRoomCode() {
    const code = $('display-room-code').textContent;
    navigator.clipboard.writeText(code).then(() => showToast('Kode disalin! 📋')).catch(() => showToast(code));
}

// ---- Screen Transitions ----
function switchToGame() {
    currentScreen = 'game';
    $('lobby-screen').classList.add('hidden');
    $('game-container').classList.remove('hidden');

    if (jokerMode) $('joker-mode-badge').classList.remove('hidden');
    else $('joker-mode-badge').classList.add('hidden');

    selectedCards = [];
    renderGame();

    // Announce whose turn
    if (game.currentPlayer !== 0) {
        showToast(`${game.playerNames[game.currentPlayer]} memulai permainan`);
        scheduleBotTurn(1500);
    } else {
        showToast('Kamu memulai permainan! 🎯');
    }
}

function quitGame() {
    if (confirm('Keluar dari game?')) backToLobby();
}

function backToLobby() {
    clearBotTimeouts();
    currentScreen = 'lobby';
    $('game-container').classList.add('hidden');
    $('lobby-screen').classList.remove('hidden');
    $('gameover-modal').classList.add('hidden');
    showSection('lobby-menu');
    game = null;
}

function playAgain() {
    clearBotTimeouts();
    $('gameover-modal').classList.add('hidden');
    game.deal();
    selectedCards = [];
    renderGame();

    if (game.currentPlayer !== 0) {
        showToast(`${game.playerNames[game.currentPlayer]} memulai putaran baru`);
        scheduleBotTurn(1500);
    } else {
        showToast('Giliranmu memulai! 🎯');
    }
}

// ============================================
// GAME RENDERING
// ============================================

function renderGame() {
    renderOpponents();
    renderPlayerHand();
    renderPlayArea();
    updateTurnIndicator();
    updateActions();
}

function renderOpponents() {
    const positions = ['left', 'top', 'right'];

    positions.forEach((pos, i) => {
        const pIdx = i + 1;
        const zone = $(`opponent-${pos}`);
        const hand = game.hands[pIdx];
        const info = zone.querySelector('.opponent-info');
        const cardsContainer = zone.querySelector('.opponent-cards');

        info.querySelector('.opponent-name').textContent = game.playerNames[pIdx];
        info.querySelector('.opponent-card-count').textContent = hand.length;

        // Turn / pass styling with smooth transition
        zone.classList.toggle('active-turn', game.currentPlayer === pIdx);
        zone.classList.toggle('passed', game.passedPlayers.has(pIdx));

        // Card backs
        cardsContainer.innerHTML = '';
        const maxShow = Math.min(hand.length, pos === 'top' ? 14 : 8);
        for (let j = 0; j < maxShow; j++) {
            const back = renderCardBack();
            back.style.animationDelay = `${j * 0.03}s`;
            cardsContainer.appendChild(back);
        }
        if (hand.length > maxShow) {
            const more = document.createElement('span');
            more.style.cssText = 'font-size:0.6rem;color:var(--text-muted);align-self:center;margin-left:2px;';
            more.textContent = `+${hand.length - maxShow}`;
            cardsContainer.appendChild(more);
        }
    });
}

function renderPlayerHand() {
    const container = $('player-hand');
    container.innerHTML = '';

    const hand = game.hands[0];
    $('my-card-count').textContent = hand.length;
    $('my-name').textContent = game.playerNames[0];

    hand.forEach((card, index) => {
        const el = renderCard(card, 'normal', true);
        el.style.animationDelay = `${index * 0.04}s`;
        el.classList.add('card-deal-anim');

        if (selectedCards.some(sc => sc.id === card.id)) {
            el.classList.add('selected');
        }

        el.addEventListener('click', () => toggleCardSelection(card, el));
        container.appendChild(el);
    });
}

function toggleCardSelection(card, el) {
    if (game.currentPlayer !== 0 || game.gameOver || botThinking) return;

    const idx = selectedCards.findIndex(c => c.id === card.id);
    if (idx >= 0) {
        selectedCards.splice(idx, 1);
        el.classList.remove('selected');
    } else {
        selectedCards.push(card);
        el.classList.add('selected');
    }

    updateActions();
    updateComboHint();
}

function updateComboHint() {
    const hint = $('combo-hint');
    if (selectedCards.length === 0) { hint.textContent = ''; return; }

    const combo = identifyCombo(selectedCards, game.jokerMode);
    if (combo.type === COMBO.INVALID) {
        hint.textContent = '❌ Invalid';
        hint.style.color = 'var(--accent-red)';
    } else {
        const name = COMBO_NAMES[combo.type] || 'Unknown';
        const isBomb = !combo.hasJoker && isBombType(combo.type);
        hint.textContent = `${name}${isBomb ? ' 💣' : ''}${combo.hasJoker ? ' 🃏' : ''}`;
        hint.style.color = isBomb ? 'var(--accent-red)' : 'var(--gold)';
    }
}

function renderPlayArea() {
    const container = $('played-cards');
    const label = $('play-area-label');
    const area = $('play-area');

    container.innerHTML = '';

    if (!game.lastPlay) {
        label.textContent = game.isFirstTurn ? '🎴 Putaran Pertama' : '✨ Putaran Baru — Bebas';
        area.classList.remove('highlight');
        return;
    }

    const { cards, combo, player } = game.lastPlay;
    const comboName = COMBO_NAMES[combo.type] || '';
    label.textContent = `${game.playerNames[player]}: ${comboName}`;
    area.classList.add('highlight');

    cards.forEach((card, i) => {
        const el = renderCard(card, 'small', false);
        el.classList.add('play-anim');
        el.style.animationDelay = `${i * 0.1}s`;
        container.appendChild(el);
    });
}

function updateTurnIndicator() {
    const indicator = $('turn-indicator');

    if (game.gameOver) {
        indicator.textContent = '🏆 Game Over!';
        indicator.classList.remove('active');
        return;
    }

    const name = game.playerNames[game.currentPlayer];
    if (game.currentPlayer === 0) {
        indicator.textContent = '🎯 Giliranmu!';
        indicator.classList.add('active');
    } else {
        indicator.innerHTML = `⏳ ${name} <span class="thinking-dots"><span></span><span></span><span></span></span>`;
        indicator.classList.remove('active');
    }
}

function updateActions() {
    const playBtn = $('btn-play');
    const passBtn = $('btn-pass');

    const isMyTurn = game.currentPlayer === 0 && !game.gameOver && !botThinking;

    if (!isMyTurn) {
        playBtn.disabled = true;
        passBtn.disabled = true;
        return;
    }

    passBtn.disabled = game.isNewRound || game.isFirstTurn;

    if (selectedCards.length === 0) { playBtn.disabled = true; return; }
    const combo = identifyCombo(selectedCards, game.jokerMode);
    playBtn.disabled = combo.type === COMBO.INVALID;
}

// ============================================
// PLAYER ACTIONS
// ============================================

function playerPlay() {
    if (selectedCards.length === 0 || botThinking) return;

    const result = game.play(0, selectedCards);

    if (!result.valid) {
        showToast(result.reason, 'error');
        return;
    }

    if (result.isBomb) {
        showToast('💣 BOMB!!! 💥', 'bomb');
        $('game-container').classList.add('bomb-flash');
        setTimeout(() => $('game-container').classList.remove('bomb-flash'), 600);
    }

    selectedCards = [];
    $('combo-hint').textContent = '';
    renderGame();
    updateGameLog(result, 0);

    if (game.gameOver) {
        setTimeout(showGameOver, 1000);
        return;
    }

    if (game.hands[0].length === 0 && !game.gameOver) {
        showToast('🎉 Kartumu habis! Menunggu pemain lain...');
    }

    if (game.currentPlayer !== 0) {
        scheduleBotTurn(1200);
    }
}

function playerPass() {
    if (botThinking) return;
    const result = game.pass(0);

    if (!result.valid) {
        showToast(result.reason, 'error');
        return;
    }

    selectedCards = [];
    $('combo-hint').textContent = '';
    updateGameLog({ type: 'pass' }, 0);

    if (result.newRound) {
        showToast('🔄 Putaran baru!');
    }

    renderGame();

    if (game.currentPlayer !== 0) {
        scheduleBotTurn(1000);
    }
}

// ============================================
// BOT LOGIC — with smooth delays
// ============================================

function scheduleBotTurn(delayMs) {
    const t = setTimeout(() => botTurnSequence(), delayMs);
    botTimeouts.push(t);
}

async function botTurnSequence() {
    if (!game || game.gameOver || game.currentPlayer === 0) return;

    botThinking = true;
    updateActions();
    updateTurnIndicator();

    // Deliberation delay — feels like the bot is "thinking"
    const thinkTime = 800 + Math.random() * 700;
    await delay(thinkTime);

    if (!game || game.gameOver || game.currentPlayer === 0) {
        botThinking = false;
        return;
    }

    const pIdx = game.currentPlayer;
    const hand = game.hands[pIdx];
    const state = game.getState();
    const play = bot.decidePlay(hand, state, pIdx);

    if (play) {
        const result = game.play(pIdx, play);

        if (result.valid) {
            if (result.isBomb) {
                showToast(`💣 ${game.playerNames[pIdx]} BOMB!!! 💥`, 'bomb');
                $('game-container').classList.add('bomb-flash');
                setTimeout(() => $('game-container').classList.remove('bomb-flash'), 600);
            }

            updateGameLog(result, pIdx);
            renderGame();

            if (game.gameOver) {
                botThinking = false;
                setTimeout(showGameOver, 1200);
                return;
            }
        } else {
            // Invalid play → pass
            const passResult = game.pass(pIdx);
            updateGameLog({ type: 'pass' }, pIdx);
            if (passResult && passResult.newRound) {
                showToast('🔄 Putaran baru!');
            }
            renderGame();
        }
    } else {
        // Pass
        const passResult = game.pass(pIdx);

        if (!passResult.valid) {
            // Bot must play on new round — play lowest
            if (hand.length > 0) {
                game.play(pIdx, [hand[0]]);
                updateGameLog({ combo: identifyCombo([hand[0]], game.jokerMode) }, pIdx);
            }
        } else {
            updateGameLog({ type: 'pass' }, pIdx);
            if (passResult.newRound) {
                showToast('🔄 Putaran baru!');
            }
        }
        renderGame();
    }

    botThinking = false;

    // Visual pause between turns — crucial for smooth feel
    await delay(600);

    if (!game || game.gameOver) return;

    if (game.currentPlayer !== 0) {
        // Next bot — schedule with a natural pause
        scheduleBotTurn(400);
    } else {
        // Player's turn
        renderGame();
        showToast('🎯 Giliranmu!');
        // Add a subtle glow to indicate turn
        $('player-zone')?.classList.add('turn-glow');
        setTimeout(() => $('player-zone')?.classList.remove('turn-glow'), 1000);
    }
}

// ============================================
// GAME LOG
// ============================================

function updateGameLog(result, playerIdx) {
    const log = $('game-log');
    const name = game.playerNames[playerIdx !== undefined ? playerIdx : 0];

    let text = '';
    if (result.combo) {
        const comboName = COMBO_NAMES[result.combo.type] || '';
        const cards = result.combo.cards ? result.combo.cards.map(c => cardToString(c)).join(' ') : '';
        text = `${name} → ${comboName}`;
    } else if (result.type === 'pass') {
        text = `${name} pass ⏭`;
    } else if (result.type === 'newRound') {
        text = '✨ Putaran baru dimulai';
    }

    // Smooth text transition
    log.style.opacity = '0';
    log.style.transform = 'translateY(5px)';
    setTimeout(() => {
        log.textContent = text;
        log.style.opacity = '1';
        log.style.transform = 'translateY(0)';
    }, 150);
}

// ============================================
// GAME OVER
// ============================================

function showGameOver() {
    const modal = $('gameover-modal');
    modal.classList.remove('hidden');

    const winnerName = game.playerNames[game.finishOrder[0]];
    $('winner-name').textContent = `🏆 ${winnerName} Menang!`;

    const scoreList = $('score-list');
    scoreList.innerHTML = '';

    const medals = ['🥇', '🥈', '🥉', '4th'];

    game.finishOrder.forEach((pIdx, rank) => {
        const item = document.createElement('div');
        item.className = `score-item ${rank === 0 ? 'winner' : ''}`;
        item.style.animationDelay = `${rank * 0.15}s`;
        item.innerHTML = `
            <span class="score-rank">${medals[rank]}</span>
            <span class="score-name">${game.playerNames[pIdx]}</span>
            <span class="score-cards">${game.hands[pIdx].length} kartu sisa</span>
        `;
        scoreList.appendChild(item);
    });

    if (game.finishOrder[0] === 0) {
        showConfetti();
    }
}

function showConfetti() {
    const container = document.createElement('div');
    container.className = 'celebration';
    document.body.appendChild(container);

    const colors = ['#ffd700', '#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ec4899'];

    for (let i = 0; i < 80; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 2.5 + 's';
        confetti.style.animationDuration = (2.5 + Math.random() * 2.5) + 's';
        confetti.style.width = (4 + Math.random() * 8) + 'px';
        confetti.style.height = (4 + Math.random() * 8) + 'px';
        container.appendChild(confetti);
    }

    setTimeout(() => container.remove(), 6000);
}

// ============================================
// TOAST
// ============================================

function showToast(message, type = '') {
    const container = $('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    const dur = type === 'bomb' ? 4000 : 3200;
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, dur);
}
