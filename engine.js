/* ============================================
   ENGINE.JS - Capsa Banting Game Rules Engine
   Includes Bomb rules & Joker mode
   ============================================ */

// Combo types ranked
const COMBO = {
    INVALID: 0,
    SINGLE: 1,
    PAIR: 2,
    THREE: 3,
    STRAIGHT: 10,
    FLUSH: 11,
    FULL_HOUSE: 12,
    FOUR_OF_A_KIND: 13,
    STRAIGHT_FLUSH: 14,
    ROYAL_FLUSH: 15,
    // Special joker combos
    JOKER_SINGLE: 20,
    JOKER_PAIR_MONO: 21,
    JOKER_PAIR_MIXED: 22,
    JOKER_PAIR_COLOR: 23
};

const COMBO_NAMES = {
    [COMBO.SINGLE]: 'Single',
    [COMBO.PAIR]: 'Pair',
    [COMBO.THREE]: 'Three of a Kind',
    [COMBO.STRAIGHT]: 'Straight',
    [COMBO.FLUSH]: 'Flush',
    [COMBO.FULL_HOUSE]: 'Full House',
    [COMBO.FOUR_OF_A_KIND]: 'Four of a Kind',
    [COMBO.STRAIGHT_FLUSH]: 'Straight Flush',
    [COMBO.ROYAL_FLUSH]: 'Royal Flush',
    [COMBO.JOKER_SINGLE]: 'Joker',
    [COMBO.JOKER_PAIR_MONO]: 'Pair Joker Mono',
    [COMBO.JOKER_PAIR_MIXED]: 'Pair Joker Mixed',
    [COMBO.JOKER_PAIR_COLOR]: 'Pair Joker Color'
};

// ---- Helper: count jokers and normal cards ----
function separateJokers(cards) {
    const jokers = cards.filter(c => c.type === 'joker');
    const normals = cards.filter(c => c.type !== 'joker');
    return { jokers, normals };
}

function isJokerCard(card) {
    return card.type === 'joker';
}

// ---- Identify a 5-card combo (without joker wildcard help) ----
function identifyFiveCardCombo(cards) {
    if (cards.length !== 5) return null;
    
    const sorted = [...cards].sort((a, b) => a.value - b.value || a.suitValue - b.suitValue);
    const ranks = sorted.map(c => c.value);
    const suits = sorted.map(c => c.suit);
    
    // Check straight (sequential values)
    // Special case: A-2-3-4-5 is NOT valid in Big Two. 
    // Valid straights: 3-4-5-6-7 up to 10-J-Q-K-A but NOT include 2
    function isStraightSeq() {
        // No card with rank 2 (value 12) allowed in straight
        if (ranks.includes(12)) return false;
        for (let i = 1; i < ranks.length; i++) {
            if (ranks[i] !== ranks[i-1] + 1) return false;
        }
        return true;
    }
    
    // Check flush (all same suit)
    const isFlush = suits.every(s => s === suits[0]);
    const isStraight = isStraightSeq();
    
    // Royal Flush: 10-J-Q-K-A same suit
    const isRoyal = isStraight && ranks[0] === 7 && ranks[4] === 11; // 10=7, A=11
    
    if (isRoyal && isFlush) {
        return { type: COMBO.ROYAL_FLUSH, rank: sorted[4].value, highCard: sorted[4], cards: sorted };
    }
    
    if (isStraight && isFlush) {
        return { type: COMBO.STRAIGHT_FLUSH, rank: sorted[4].value, highCard: sorted[4], cards: sorted };
    }
    
    // Four of a Kind
    const rankCounts = {};
    sorted.forEach(c => { rankCounts[c.value] = (rankCounts[c.value] || 0) + 1; });
    const fourRank = Object.keys(rankCounts).find(r => rankCounts[r] === 4);
    if (fourRank) {
        const fourCards = sorted.filter(c => c.value === parseInt(fourRank));
        return { type: COMBO.FOUR_OF_A_KIND, rank: parseInt(fourRank), highCard: fourCards[3], cards: sorted };
    }
    
    // Full House
    const threeRank = Object.keys(rankCounts).find(r => rankCounts[r] === 3);
    const pairRank = Object.keys(rankCounts).find(r => rankCounts[r] === 2);
    if (threeRank && pairRank) {
        return { type: COMBO.FULL_HOUSE, rank: parseInt(threeRank), highCard: sorted.filter(c => c.value === parseInt(threeRank)).pop(), cards: sorted };
    }
    
    // Flush
    if (isFlush) {
        return { type: COMBO.FLUSH, rank: sorted[4].value, highCard: sorted[4], cards: sorted };
    }
    
    // Straight
    if (isStraight) {
        return { type: COMBO.STRAIGHT, rank: sorted[4].value, highCard: sorted[4], cards: sorted };
    }
    
    return null;
}

// ---- Identify combo with Joker wildcard support ----
function identifyFiveCardComboWithJokers(cards) {
    const { jokers, normals } = separateJokers(cards);
    
    if (jokers.length === 0) {
        return identifyFiveCardCombo(cards);
    }
    
    // With jokers, they act as wildcards to complete combos
    // But combos with jokers CANNOT be bombs
    const numJokers = jokers.length;
    const numNormals = normals.length;
    
    if (numNormals < 1) return null; // Need at least 1 normal card
    
    const sortedNormals = [...normals].sort((a, b) => a.value - b.value || a.suitValue - b.suitValue);
    
    // Try to identify what combo the normals + jokers can form
    // 1. Four of a Kind: need 4 same rank + 1 kicker
    const rankCounts = {};
    sortedNormals.forEach(c => { rankCounts[c.value] = (rankCounts[c.value] || 0) + 1; });
    
    // Check Four of a Kind with joker help
    for (const [rank, count] of Object.entries(rankCounts)) {
        if (count + numJokers >= 4 && numNormals >= 1) {
            const needed = 4 - count;
            if (needed <= numJokers) {
                // Has joker so NOT a bomb - mark as non-bomb
                return { 
                    type: COMBO.FOUR_OF_A_KIND, 
                    rank: parseInt(rank), 
                    highCard: sortedNormals.filter(c => c.value === parseInt(rank)).pop() || sortedNormals[sortedNormals.length - 1],
                    cards,
                    hasJoker: true 
                };
            }
        }
    }
    
    // Check Full House with joker help
    for (const [rank, count] of Object.entries(rankCounts)) {
        if (count >= 2) {
            const remaining = sortedNormals.filter(c => c.value !== parseInt(rank));
            const remainingJokers = numJokers - Math.max(0, 3 - count);
            if (3 - count <= numJokers) {
                // Check if remaining normals + jokers can form pair
                if (remaining.length + remainingJokers >= 2) {
                    return {
                        type: COMBO.FULL_HOUSE,
                        rank: parseInt(rank),
                        highCard: sortedNormals.filter(c => c.value === parseInt(rank)).pop(),
                        cards,
                        hasJoker: true
                    };
                }
            }
        }
    }
    // Full house: 3 jokers + 2 same normals
    if (numJokers >= 3 && numNormals >= 2) {
        const pairFound = Object.entries(rankCounts).find(([r, c]) => c >= 2);
        if (pairFound) {
            return {
                type: COMBO.FULL_HOUSE,
                rank: parseInt(pairFound[0]),
                highCard: sortedNormals[sortedNormals.length - 1],
                cards,
                hasJoker: true
            };
        }
    }
    
    // Check Straight with joker help
    if (sortedNormals.every(c => c.value < 12)) { // No 2s in straight
        const uniqueRanks = [...new Set(sortedNormals.map(c => c.value))].sort((a, b) => a - b);
        if (uniqueRanks.length + numJokers >= 5 && uniqueRanks.length === sortedNormals.length) {
            // Try to fill gaps with jokers
            const minRank = uniqueRanks[0];
            const maxRank = uniqueRanks[uniqueRanks.length - 1];
            const span = maxRank - minRank;
            if (span <= 4 + numJokers) {
                // Check if we can form 5 consecutive with jokers filling gaps
                for (let start = Math.max(0, minRank - numJokers); start <= Math.min(11, minRank); start++) {
                    let end = start + 4;
                    if (end > 11) continue; // Can't include 2 (value 12)
                    let jokersNeeded = 0;
                    let allPresent = true;
                    for (let r = start; r <= end; r++) {
                        if (!uniqueRanks.includes(r)) jokersNeeded++;
                    }
                    if (jokersNeeded <= numJokers && uniqueRanks.every(r => r >= start && r <= end)) {
                        // Check if all same suit for straight flush
                        const allSameSuit = sortedNormals.every(c => c.suit === sortedNormals[0].suit);
                        if (allSameSuit && end >= 7 && start === 7) { // 10-J-Q-K-A
                            return {
                                type: COMBO.ROYAL_FLUSH,
                                rank: end,
                                highCard: sortedNormals[sortedNormals.length - 1],
                                cards,
                                hasJoker: true
                            };
                        }
                        if (allSameSuit) {
                            return {
                                type: COMBO.STRAIGHT_FLUSH,
                                rank: end,
                                highCard: sortedNormals[sortedNormals.length - 1],
                                cards,
                                hasJoker: true
                            };
                        }
                        return {
                            type: COMBO.STRAIGHT,
                            rank: end,
                            highCard: sortedNormals[sortedNormals.length - 1],
                            cards,
                            hasJoker: true
                        };
                    }
                }
            }
        }
    }
    
    // Check Flush with joker help (jokers adopt the suit of normals)
    const suitCounts = {};
    sortedNormals.forEach(c => { suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1; });
    for (const [suit, count] of Object.entries(suitCounts)) {
        if (count + numJokers >= 5 && count >= numNormals) {
            const flushCards = sortedNormals.filter(c => c.suit === suit);
            return {
                type: COMBO.FLUSH,
                rank: flushCards[flushCards.length - 1].value,
                highCard: flushCards[flushCards.length - 1],
                cards,
                hasJoker: true
            };
        }
    }
    
    return null;
}

// ---- Main combo identification ----
function identifyCombo(cards, jokerMode = false) {
    if (!cards || cards.length === 0) return { type: COMBO.INVALID };
    
    const { jokers, normals } = separateJokers(cards);
    
    // ---- Joker-specific combos ----
    if (jokerMode && cards.length === 1 && jokers.length === 1) {
        return { 
            type: COMBO.JOKER_SINGLE, 
            jokerType: jokers[0].jokerType,
            rank: jokers[0].value,
            highCard: jokers[0],
            cards 
        };
    }
    
    if (jokerMode && cards.length === 2 && jokers.length === 2) {
        const j1 = jokers[0], j2 = jokers[1];
        if (j1.jokerType === 'mono' && j2.jokerType === 'mono') {
            return { type: COMBO.JOKER_PAIR_MONO, rank: 13, highCard: j2, cards };
        }
        if (j1.jokerType === 'color' && j2.jokerType === 'color') {
            return { type: COMBO.JOKER_PAIR_COLOR, rank: 15, highCard: j2, cards };
        }
        // Mixed: one mono one color
        return { type: COMBO.JOKER_PAIR_MIXED, rank: 14, highCard: j2, cards };
    }
    
    // ---- Normal combos ----
    
    // Single
    if (cards.length === 1 && normals.length === 1) {
        return { type: COMBO.SINGLE, rank: normals[0].value, suitRank: normals[0].suitValue, highCard: normals[0], cards };
    }
    
    // Pair (with possible joker wildcard)
    if (cards.length === 2) {
        if (normals.length === 2 && normals[0].value === normals[1].value) {
            const sorted = [...normals].sort(compareCards);
            return { type: COMBO.PAIR, rank: sorted[1].value, highCard: sorted[1], cards };
        }
        if (jokerMode && normals.length === 1 && jokers.length === 1) {
            return { type: COMBO.PAIR, rank: normals[0].value, highCard: normals[0], cards, hasJoker: true };
        }
        return { type: COMBO.INVALID };
    }
    
    // Three of a Kind (with possible joker wildcard)
    if (cards.length === 3) {
        if (normals.length === 3 && normals[0].value === normals[1].value && normals[1].value === normals[2].value) {
            const sorted = [...normals].sort(compareCards);
            return { type: COMBO.THREE, rank: sorted[2].value, highCard: sorted[2], cards };
        }
        if (jokerMode && jokers.length > 0) {
            const rankCounts = {};
            normals.forEach(c => { rankCounts[c.value] = (rankCounts[c.value] || 0) + 1; });
            for (const [rank, count] of Object.entries(rankCounts)) {
                if (count + jokers.length >= 3) {
                    return { type: COMBO.THREE, rank: parseInt(rank), highCard: normals.find(c => c.value === parseInt(rank)), cards, hasJoker: true };
                }
            }
        }
        return { type: COMBO.INVALID };
    }
    
    // Five card combos
    if (cards.length === 5) {
        if (jokerMode && jokers.length > 0) {
            return identifyFiveCardComboWithJokers(cards) || { type: COMBO.INVALID };
        }
        return identifyFiveCardCombo(cards) || { type: COMBO.INVALID };
    }
    
    return { type: COMBO.INVALID };
}

// ---- Can a play beat the current table cards? ----
function canBeat(playCombo, tableCombo, jokerMode = false) {
    if (!tableCombo || tableCombo.type === COMBO.INVALID) return true; // Free play
    
    // ---- Bomb rules ----
    // Single 2 can be bombed
    if (tableCombo.type === COMBO.SINGLE && tableCombo.rank === 12) { // rank 12 = 2
        // Can beat with higher single 2 (different suit)
        if (playCombo.type === COMBO.SINGLE && playCombo.rank === 12) {
            return playCombo.highCard.suitValue > tableCombo.highCard.suitValue;
        }
        // Can bomb with pure (no joker) five-card bombs
        if (!playCombo.hasJoker && (playCombo.type === COMBO.FOUR_OF_A_KIND || playCombo.type === COMBO.STRAIGHT_FLUSH || playCombo.type === COMBO.ROYAL_FLUSH)) {
            return true;
        }
        // Joker single (higher than 2)
        if (jokerMode && playCombo.type === COMBO.JOKER_SINGLE) {
            return true;
        }
        return false;
    }
    
    // Joker singles
    if (jokerMode && tableCombo.type === COMBO.JOKER_SINGLE) {
        if (tableCombo.jokerType === 'mono') {
            // Must beat with color joker
            if (playCombo.type === COMBO.JOKER_SINGLE && playCombo.jokerType === 'color') return true;
            // Or bomb (pure only)
            if (!playCombo.hasJoker && (playCombo.type === COMBO.FOUR_OF_A_KIND || playCombo.type === COMBO.STRAIGHT_FLUSH || playCombo.type === COMBO.ROYAL_FLUSH)) return true;
            return false;
        }
        if (tableCombo.jokerType === 'color') {
            // Only pure bomb can beat color joker
            if (!playCombo.hasJoker && (playCombo.type === COMBO.FOUR_OF_A_KIND || playCombo.type === COMBO.STRAIGHT_FLUSH || playCombo.type === COMBO.ROYAL_FLUSH)) return true;
            return false;
        }
    }
    
    // Joker pairs
    if (jokerMode && tableCombo.type >= COMBO.JOKER_PAIR_MONO && tableCombo.type <= COMBO.JOKER_PAIR_COLOR) {
        if (tableCombo.type === COMBO.JOKER_PAIR_MONO) {
            // Beaten by pair joker mixed, pair joker color
            if (playCombo.type === COMBO.JOKER_PAIR_MIXED || playCombo.type === COMBO.JOKER_PAIR_COLOR) return true;
            return false;
        }
        if (tableCombo.type === COMBO.JOKER_PAIR_MIXED) {
            // Beaten by pair joker color only
            if (playCombo.type === COMBO.JOKER_PAIR_COLOR) return true;
            return false;
        }
        if (tableCombo.type === COMBO.JOKER_PAIR_COLOR) {
            // ABSOLUTE - cannot be beaten
            return false;
        }
    }
    
    // Bomb vs Bomb
    if (isBombType(tableCombo.type) && isBombType(playCombo.type)) {
        // Both are bombs - compare by bomb hierarchy then rank
        if (playCombo.hasJoker) return false; // Joker combos can't be bombs
        if (playCombo.type !== tableCombo.type) {
            return playCombo.type > tableCombo.type;
        }
        // Same bomb type - compare rank
        if (playCombo.rank !== tableCombo.rank) return playCombo.rank > tableCombo.rank;
        // Same rank - compare high card suit
        return playCombo.highCard.suitValue > tableCombo.highCard.suitValue;
    }
    
    // Normal play - must match combo size/category
    const playSize = getComboCategory(playCombo.type);
    const tableSize = getComboCategory(tableCombo.type);
    
    if (playSize !== tableSize) return false;
    
    // Same category - compare
    if (playCombo.type !== tableCombo.type) {
        // For 5-card combos, higher type wins
        if (playSize === 5) return playCombo.type > tableCombo.type;
        return false;
    }
    
    // Same type - compare rank
    if (playCombo.rank !== tableCombo.rank) return playCombo.rank > tableCombo.rank;
    
    // Same rank - compare high card suit
    if (playCombo.highCard && tableCombo.highCard) {
        return playCombo.highCard.suitValue > tableCombo.highCard.suitValue;
    }
    
    return false;
}

function isBombType(type) {
    return type === COMBO.FOUR_OF_A_KIND || type === COMBO.STRAIGHT_FLUSH || type === COMBO.ROYAL_FLUSH;
}

function getComboCategory(type) {
    if (type === COMBO.SINGLE || type === COMBO.JOKER_SINGLE) return 1;
    if (type === COMBO.PAIR || type >= COMBO.JOKER_PAIR_MONO) return 2;
    if (type === COMBO.THREE) return 3;
    if (type >= COMBO.STRAIGHT && type <= COMBO.ROYAL_FLUSH) return 5;
    return 0;
}

// ---- Find who has 3 of diamonds (starts first) ----
function findStartingPlayer(hands) {
    for (let i = 0; i < hands.length; i++) {
        if (hands[i].some(c => c.rank === '3' && c.suit === 'diamonds')) {
            return i;
        }
    }
    return 0;
}

// ---- Check if a play includes 3♦ (required for first play) ----
function includes3D(cards) {
    return cards.some(c => c.rank === '3' && c.suit === 'diamonds');
}

// ---- Game State Manager ----
class CapsaGame {
    constructor(playerNames, jokerMode = false) {
        this.playerNames = playerNames;
        this.jokerMode = jokerMode;
        this.hands = [];
        this.currentPlayer = 0;
        this.lastPlay = null;       // { cards, combo, player }
        this.lastPlayedBy = -1;
        this.passCount = 0;
        this.passedPlayers = new Set();
        this.isFirstTurn = true;
        this.isNewRound = true;     // New round = free play
        this.gameOver = false;
        this.finishOrder = [];
        this.turnHistory = [];
    }
    
    deal() {
        this.hands = dealCards(this.jokerMode);
        this.currentPlayer = findStartingPlayer(this.hands);
        this.isFirstTurn = true;
        this.isNewRound = true;
        this.lastPlay = null;
        this.lastPlayedBy = -1;
        this.passCount = 0;
        this.passedPlayers = new Set();
        this.gameOver = false;
        this.finishOrder = [];
        this.turnHistory = [];
    }
    
    getHand(playerIndex) {
        return this.hands[playerIndex];
    }
    
    // Validate and play cards
    play(playerIndex, selectedCards) {
        if (playerIndex !== this.currentPlayer) return { valid: false, reason: 'Bukan giliranmu!' };
        if (this.gameOver) return { valid: false, reason: 'Game sudah selesai!' };
        if (selectedCards.length === 0) return { valid: false, reason: 'Pilih kartu!' };
        
        // Must include 3♦ on first turn
        if (this.isFirstTurn && !includes3D(selectedCards)) {
            return { valid: false, reason: 'Harus memasukkan 3♦ di putaran pertama!' };
        }
        
        const combo = identifyCombo(selectedCards, this.jokerMode);
        if (combo.type === COMBO.INVALID) {
            return { valid: false, reason: 'Kombinasi kartu tidak valid!' };
        }
        
        // Check if this can beat current play
        if (!this.isNewRound && this.lastPlay) {
            if (!canBeat(combo, this.lastPlay.combo, this.jokerMode)) {
                return { valid: false, reason: 'Kartu tidak cukup kuat!' };
            }
        }
        
        // Remove cards from hand
        const cardIds = new Set(selectedCards.map(c => c.id));
        this.hands[playerIndex] = this.hands[playerIndex].filter(c => !cardIds.has(c.id));
        
        const isBomb = !combo.hasJoker && isBombType(combo.type) && this.lastPlay && this.lastPlay.combo.type === COMBO.SINGLE && this.lastPlay.combo.rank === 12;
        
        this.lastPlay = { cards: selectedCards, combo, player: playerIndex };
        this.lastPlayedBy = playerIndex;
        this.passCount = 0;
        this.passedPlayers = new Set();
        this.isFirstTurn = false;
        this.isNewRound = false;
        
        this.turnHistory.push({
            type: 'play',
            player: playerIndex,
            cards: selectedCards,
            combo,
            isBomb
        });
        
        // Check win
        if (this.hands[playerIndex].length === 0) {
            this.finishOrder.push(playerIndex);
            if (this.finishOrder.length >= 3) {
                this.gameOver = true;
                // Add last remaining player
                for (let i = 0; i < 4; i++) {
                    if (!this.finishOrder.includes(i)) {
                        this.finishOrder.push(i);
                    }
                }
            }
        }
        
        this.advanceTurn();
        
        return { valid: true, combo, isBomb };
    }
    
    pass(playerIndex) {
        if (playerIndex !== this.currentPlayer) return { valid: false, reason: 'Bukan giliranmu!' };
        if (this.isNewRound) return { valid: false, reason: 'Tidak bisa pass di awal putaran!' };
        if (this.isFirstTurn) return { valid: false, reason: 'Tidak bisa pass di turn pertama!' };
        
        this.passedPlayers.add(playerIndex);
        this.passCount++;
        
        this.turnHistory.push({
            type: 'pass',
            player: playerIndex
        });
        
        // Count active players (not finished)
        const activePlayers = [0,1,2,3].filter(i => !this.finishOrder.includes(i));
        const activeNonPassed = activePlayers.filter(i => !this.passedPlayers.has(i) && i !== this.lastPlayedBy);
        
        // If all other active players passed, new round
        if (activeNonPassed.length === 0) {
            this.isNewRound = true;
            this.passCount = 0;
            this.passedPlayers = new Set();
            this.lastPlay = null;
            this.currentPlayer = this.lastPlayedBy;
            
            // If current player finished, find next active
            if (this.finishOrder.includes(this.currentPlayer)) {
                this.advanceTurn();
            }
            return { valid: true, newRound: true };
        }
        
        this.advanceTurn();
        return { valid: true, newRound: false };
    }
    
    advanceTurn() {
        if (this.gameOver) return;
        
        let next = (this.currentPlayer + 1) % 4;
        let safety = 0;
        while (safety < 4) {
            if (!this.finishOrder.includes(next) && !this.passedPlayers.has(next)) {
                break;
            }
            next = (next + 1) % 4;
            safety++;
        }
        
        if (safety >= 4) {
            // All passed or finished - new round for last player
            this.isNewRound = true;
            this.passCount = 0;
            this.passedPlayers = new Set();
            this.lastPlay = null;
            next = this.lastPlayedBy;
            if (this.finishOrder.includes(next)) {
                next = (next + 1) % 4;
                while (this.finishOrder.includes(next)) next = (next + 1) % 4;
            }
        }
        
        this.currentPlayer = next;
    }
    
    getState() {
        return {
            hands: this.hands,
            currentPlayer: this.currentPlayer,
            lastPlay: this.lastPlay,
            isFirstTurn: this.isFirstTurn,
            isNewRound: this.isNewRound,
            gameOver: this.gameOver,
            finishOrder: this.finishOrder,
            passedPlayers: this.passedPlayers,
            jokerMode: this.jokerMode,
            playerNames: this.playerNames
        };
    }
}
