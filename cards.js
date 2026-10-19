/* ============================================
   CARDS.JS - Card Definitions & Classic Rendering
   - Illustrated Royal Cards (J, Q, K, A) matching silaturemi.vercel.app
   - Enlarged Suit Logo for Number Cards (2-10) for maximum clarity
   - 4 Jokers (2 Warna, 2 Monochrome) with special styling
   - Fallback protection for offline / slow connections
   ============================================ */

const SUITS = ['diamonds', 'clubs', 'hearts', 'spades'];
const SUIT_SYMBOLS = { diamonds: '♦', clubs: '♣', hearts: '♥', spades: '♠' };
const SUIT_ORDER = { diamonds: 0, clubs: 1, hearts: 2, spades: 3 };
const SUIT_COLORS = { diamonds: '#e53e3e', clubs: '#1a202c', hearts: '#e53e3e', spades: '#1a202c' };

// Big Two hierarchy: 3 lowest, 2 highest
const RANK_ORDER = { '3': 0, '4': 1, '5': 2, '6': 3, '7': 4, '8': 5, '9': 6, '10': 7, 'J': 8, 'Q': 9, 'K': 10, 'A': 11, '2': 12 };
const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];

// Classic playing card assets (same source as silaturemi.vercel.app)
const CARD_IMAGE_BASE = 'https://raw.githubusercontent.com/hayeah/playing-cards-assets/master/png/';
const RANK_FULL = {
    'A': 'ace', '2': '2', '3': '3', '4': '4', '5': '5',
    '6': '6', '7': '7', '8': '8', '9': '9', '10': '10',
    'J': 'jack', 'Q': 'queen', 'K': 'king'
};

// SVG Paths for razor-sharp enlarged suit logos
const SUIT_SVGS = {
    spades: `<svg viewBox="0 0 100 100" class="card-suit-svg"><path fill="currentColor" d="M50,15 C45,30 20,48 20,68 C20,78 28,84 38,84 C44,84 48,81 50,77 C48,85 45,95 38,100 L62,100 C55,95 52,85 50,77 C52,81 56,84 62,84 C72,84 80,78 80,68 C80,48 55,30 50,15 Z"/></svg>`,
    hearts: `<svg viewBox="0 0 100 100" class="card-suit-svg"><path fill="currentColor" d="M50,28 C45,15 32,8 20,15 C8,22 5,38 12,52 C20,67 50,92 50,92 C50,92 80,67 88,52 C95,38 92,22 80,15 C68,8 55,15 50,28 Z"/></svg>`,
    diamonds: `<svg viewBox="0 0 100 100" class="card-suit-svg"><path fill="currentColor" d="M50,8 L88,50 L50,92 L12,50 Z"/></svg>`,
    clubs: `<svg viewBox="0 0 100 100" class="card-suit-svg"><path fill="currentColor" d="M50,12 C42,12 36,18 36,26 C36,32 39,37 44,40 C37,39 23,43 23,55 C23,65 33,70 42,67 C44,66 46,65 48,63 C46,72 43,84 37,92 L63,92 C57,84 54,72 52,63 C54,65 56,66 58,67 C67,70 77,65 77,55 C77,43 63,39 56,40 C61,37 64,32 64,26 C64,18 58,12 50,12 Z"/></svg>`
};

// 4 Jokers definitions
const JOKER_MONO_1 = { id: 'JOKER_M1', type: 'joker', jokerType: 'mono', jokerIndex: 0 };
const JOKER_MONO_2 = { id: 'JOKER_M2', type: 'joker', jokerType: 'mono', jokerIndex: 1 };
const JOKER_COLOR_1 = { id: 'JOKER_C1', type: 'joker', jokerType: 'color', jokerIndex: 0 };
const JOKER_COLOR_2 = { id: 'JOKER_C2', type: 'joker', jokerType: 'color', jokerIndex: 1 };

function createDeck(withJokers = false) {
    const deck = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({
                id: `${rank}_${suit}`,
                rank, suit,
                type: 'normal',
                value: RANK_ORDER[rank],
                suitValue: SUIT_ORDER[suit]
            });
        }
    }
    if (withJokers) {
        deck.push(
            { ...JOKER_MONO_1, value: 13, suitValue: 0 },
            { ...JOKER_MONO_2, value: 13, suitValue: 1 },
            { ...JOKER_COLOR_1, value: 14, suitValue: 2 },
            { ...JOKER_COLOR_2, value: 14, suitValue: 3 }
        );
    }
    return deck;
}

function shuffleDeck(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function dealCards(withJokers = false) {
    const deck = shuffleDeck(createDeck(withJokers));
    const cardsPerPlayer = withJokers ? 14 : 13;
    const hands = [[], [], [], []];
    for (let i = 0; i < cardsPerPlayer * 4; i++) {
        hands[i % 4].push(deck[i]);
    }
    hands.forEach(h => sortHand(h));
    return hands;
}

function sortHand(hand) {
    hand.sort((a, b) => {
        if (a.type === 'joker' && b.type === 'joker') return a.value - b.value || a.suitValue - b.suitValue;
        if (a.type === 'joker') return 1;
        if (b.type === 'joker') return -1;
        return a.value - b.value || a.suitValue - b.suitValue;
    });
}

function compareCards(a, b) {
    if (a.value !== b.value) return a.value - b.value;
    return a.suitValue - b.suitValue;
}

function cardToString(card) {
    if (card.type === 'joker') return card.jokerType === 'color' ? '🃏🌈' : '🃏⬛';
    return `${card.rank}${SUIT_SYMBOLS[card.suit]}`;
}

function getCardImageUrl(card) {
    const rankFull = RANK_FULL[card.rank];
    const suitName = card.suit;
    return `${CARD_IMAGE_BASE}${rankFull}_of_${suitName}.png`;
}

// ============================================
// Card DOM Rendering
// ============================================
function renderCard(card, size = 'normal', clickable = true) {
    const el = document.createElement('div');
    el.dataset.cardId = card.id;

    // --- JOKER CARD ---
    if (card.type === 'joker') {
        el.className = `card ${size === 'small' ? 'card-small' : ''} joker-${card.jokerType}`;
        const isColor = card.jokerType === 'color';

        const jokerInner = document.createElement('div');
        jokerInner.className = 'card-joker-inner';

        const label = document.createElement('div');
        label.className = 'joker-label';
        label.textContent = 'JOKER';

        const icon = document.createElement('div');
        icon.className = 'joker-icon';
        icon.textContent = '🃏';

        const subLabel = document.createElement('div');
        subLabel.className = 'joker-sublabel';
        subLabel.textContent = isColor ? '🌈 WARNA' : '⬛ MONO';

        jokerInner.appendChild(label);
        jokerInner.appendChild(icon);
        jokerInner.appendChild(subLabel);
        el.appendChild(jokerInner);
    } 
    // --- ROYAL PICTURE CARDS (J, Q, K, A) ---
    // Uses classic illustrated portraits matching silaturemi.vercel.app
    else if (['J', 'Q', 'K', 'A'].includes(card.rank)) {
        el.className = `card ${size === 'small' ? 'card-small' : ''} suit-${card.suit} card-royal`;
        const face = document.createElement('div');
        face.className = 'card-face';

        const img = document.createElement('img');
        img.className = 'card-image';
        img.src = getCardImageUrl(card);
        img.alt = `${card.rank} of ${card.suit}`;
        img.loading = 'lazy';
        img.draggable = false;

        // Fallback if image network fails
        img.onerror = function () {
            this.style.display = 'none';
            face.innerHTML = createClassicCardInner(card, true);
        };

        face.appendChild(img);
        el.appendChild(face);
    } 
    // --- NUMBER CARDS (2 through 10) ---
    // User requirement: "(perbesar logo kartu terutama di kartu angka)"
    // Features enlarged central suit logo + prominent corner ranks
    else {
        el.className = `card ${size === 'small' ? 'card-small' : ''} suit-${card.suit} card-number`;
        el.innerHTML = createClassicCardInner(card, false);
    }

    if (!clickable) el.style.cursor = 'default';
    return el;
}

function createClassicCardInner(card, isRoyalFallback = false) {
    const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
    const colorClass = isRed ? 'color-red' : 'color-black';
    const suitSvg = SUIT_SVGS[card.suit];
    const symbol = SUIT_SYMBOLS[card.suit];

    return `
        <div class="card-inner-classic ${colorClass}">
            <div class="corner-group corner-top">
                <span class="corner-rank">${card.rank}</span>
                <span class="corner-suit-icon">${symbol}</span>
            </div>
            <div class="card-center-logo">
                ${suitSvg}
            </div>
            <div class="corner-group corner-bottom">
                <span class="corner-rank">${card.rank}</span>
                <span class="corner-suit-icon">${symbol}</span>
            </div>
        </div>
    `;
}

function renderCardBack() {
    const el = document.createElement('div');
    el.className = 'opponent-card-back';
    return el;
}
