/* ============================================
   BOT.JS - AI Bot for Capsa Banting
   Smart strategy: analyze hand, play optimally
   ============================================ */

class CapsaBot {
    constructor(difficulty = 'medium') {
        this.difficulty = difficulty;
    }
    
    // Main decision function
    decidePlay(hand, gameState, playerIndex) {
        const { lastPlay, isNewRound, isFirstTurn, jokerMode } = gameState;
        
        if (isFirstTurn && playerIndex === gameState.currentPlayer) {
            return this.playFirst(hand, jokerMode);
        }
        
        if (isNewRound || !lastPlay) {
            return this.playFree(hand, jokerMode);
        }
        
        return this.playCounter(hand, lastPlay.combo, jokerMode);
    }
    
    // First turn - must include 3♦
    playFirst(hand, jokerMode) {
        const threeD = hand.find(c => c.rank === '3' && c.suit === 'diamonds');
        if (!threeD) return null;
        
        // Try to play 3♦ in a combo
        const threes = hand.filter(c => c.value === 0); // value 0 = rank 3
        
        if (threes.length >= 3) {
            return threes.slice(0, 3);
        }
        if (threes.length >= 2) {
            return [threeD, threes.find(c => c.id !== threeD.id)];
        }
        
        // Try straight starting from 3
        const straight = this.findStraightContaining(hand, threeD);
        if (straight) return straight;
        
        return [threeD]; // Single
    }
    
    // Free play - lead with weakest possible
    playFree(hand, jokerMode) {
        if (hand.length === 0) return null;
        
        const sorted = [...hand].sort(compareCards);
        const normals = sorted.filter(c => c.type !== 'joker');
        
        // If only 1 card left, play it
        if (hand.length === 1) return [hand[0]];
        
        // Try to play weakest single
        if (normals.length > 0) {
            // Prefer playing low singles
            return [normals[0]];
        }
        
        return [sorted[0]];
    }
    
    // Counter the current play
    playCounter(hand, tableCombo, jokerMode) {
        const category = getComboCategory(tableCombo.type);
        
        switch (category) {
            case 1: return this.counterSingle(hand, tableCombo, jokerMode);
            case 2: return this.counterPair(hand, tableCombo, jokerMode);
            case 3: return this.counterThree(hand, tableCombo, jokerMode);
            case 5: return this.counterFive(hand, tableCombo, jokerMode);
            default: return null;
        }
    }
    
    counterSingle(hand, tableCombo, jokerMode) {
        const normals = hand.filter(c => c.type !== 'joker');
        
        // Handle joker single
        if (tableCombo.type === COMBO.JOKER_SINGLE) {
            if (tableCombo.jokerType === 'mono') {
                // Need color joker
                const colorJoker = hand.find(c => c.type === 'joker' && c.jokerType === 'color');
                if (colorJoker) return [colorJoker];
                // Or pure bomb
                const bomb = this.findBomb(hand, jokerMode);
                if (bomb) return bomb;
                return null;
            }
            if (tableCombo.jokerType === 'color') {
                // Only pure bomb
                const bomb = this.findBomb(hand, jokerMode);
                if (bomb) return bomb;
                return null;
            }
        }
        
        // Normal single or single 2
        // Find lowest card that beats it
        for (const card of normals.sort(compareCards)) {
            if (card.value > tableCombo.rank || 
                (card.value === tableCombo.rank && card.suitValue > tableCombo.highCard.suitValue)) {
                return [card];
            }
        }
        
        // If table is single 2, try bomb
        if (tableCombo.rank === 12) {
            // Try joker single first
            if (jokerMode) {
                const monoJoker = hand.find(c => c.type === 'joker' && c.jokerType === 'mono');
                if (monoJoker) return [monoJoker];
                const colorJoker = hand.find(c => c.type === 'joker' && c.jokerType === 'color');
                if (colorJoker) return [colorJoker];
            }
            
            const bomb = this.findBomb(hand, jokerMode);
            if (bomb) return bomb;
        }
        
        return null; // Pass
    }
    
    counterPair(hand, tableCombo, jokerMode) {
        // Handle joker pairs
        if (tableCombo.type === COMBO.JOKER_PAIR_MONO) {
            const jokers = hand.filter(c => c.type === 'joker');
            const colorJokers = jokers.filter(c => c.jokerType === 'color');
            const monoJokers = jokers.filter(c => c.jokerType === 'mono');
            
            // Pair joker mixed or pair joker color
            if (colorJokers.length >= 1 && monoJokers.length >= 1) {
                return [colorJokers[0], monoJokers[0]];
            }
            if (colorJokers.length >= 2) {
                return [colorJokers[0], colorJokers[1]];
            }
            return null;
        }
        if (tableCombo.type === COMBO.JOKER_PAIR_MIXED) {
            const colorJokers = hand.filter(c => c.type === 'joker' && c.jokerType === 'color');
            if (colorJokers.length >= 2) return [colorJokers[0], colorJokers[1]];
            return null;
        }
        if (tableCombo.type === COMBO.JOKER_PAIR_COLOR) {
            return null; // Absolute, cannot be beaten
        }
        
        // Normal pair
        const normals = hand.filter(c => c.type !== 'joker');
        const pairs = this.findPairs(normals);
        
        for (const pair of pairs) {
            const pairCombo = identifyCombo(pair, jokerMode);
            if (canBeat(pairCombo, tableCombo, jokerMode)) {
                return pair;
            }
        }
        
        return null;
    }
    
    counterThree(hand, tableCombo, jokerMode) {
        const normals = hand.filter(c => c.type !== 'joker');
        const triples = this.findTriples(normals);
        
        for (const triple of triples) {
            const tripleCombo = identifyCombo(triple, jokerMode);
            if (canBeat(tripleCombo, tableCombo, jokerMode)) {
                return triple;
            }
        }
        
        return null;
    }
    
    counterFive(hand, tableCombo, jokerMode) {
        const allFives = this.findAllFiveCardCombos(hand, jokerMode);
        
        for (const five of allFives) {
            const fiveCombo = identifyCombo(five, jokerMode);
            if (fiveCombo.type !== COMBO.INVALID && canBeat(fiveCombo, tableCombo, jokerMode)) {
                return five;
            }
        }
        
        return null;
    }
    
    // ---- Helper: Find bombs (pure only) ----
    findBomb(hand, jokerMode) {
        const normals = hand.filter(c => c.type !== 'joker');
        
        // Try Four of a Kind + kicker
        const rankGroups = {};
        normals.forEach(c => {
            if (!rankGroups[c.value]) rankGroups[c.value] = [];
            rankGroups[c.value].push(c);
        });
        
        for (const [rank, cards] of Object.entries(rankGroups)) {
            if (cards.length >= 4) {
                const kicker = normals.find(c => c.value !== parseInt(rank));
                if (kicker) {
                    return [...cards.slice(0, 4), kicker];
                }
            }
        }
        
        // Try Straight Flush / Royal Flush
        const bySuit = {};
        normals.forEach(c => {
            if (!bySuit[c.suit]) bySuit[c.suit] = [];
            bySuit[c.suit].push(c);
        });
        
        for (const [suit, cards] of Object.entries(bySuit)) {
            if (cards.length >= 5) {
                const sorted = [...cards].sort((a, b) => a.value - b.value);
                for (let i = 0; i <= sorted.length - 5; i++) {
                    const seq = sorted.slice(i, i + 5);
                    if (seq.every(c => c.value < 12)) { // No 2s
                        let isSeq = true;
                        for (let j = 1; j < 5; j++) {
                            if (seq[j].value !== seq[j-1].value + 1) { isSeq = false; break; }
                        }
                        if (isSeq) return seq;
                    }
                }
            }
        }
        
        return null;
    }
    
    // ---- Helper finders ----
    findPairs(cards) {
        const pairs = [];
        const byRank = {};
        cards.forEach(c => {
            if (!byRank[c.value]) byRank[c.value] = [];
            byRank[c.value].push(c);
        });
        
        for (const [rank, group] of Object.entries(byRank).sort((a, b) => parseInt(a[0]) - parseInt(b[0]))) {
            if (group.length >= 2) {
                group.sort(compareCards);
                pairs.push([group[0], group[group.length - 1]]);
            }
        }
        return pairs;
    }
    
    findTriples(cards) {
        const triples = [];
        const byRank = {};
        cards.forEach(c => {
            if (!byRank[c.value]) byRank[c.value] = [];
            byRank[c.value].push(c);
        });
        
        for (const [rank, group] of Object.entries(byRank).sort((a, b) => parseInt(a[0]) - parseInt(b[0]))) {
            if (group.length >= 3) {
                group.sort(compareCards);
                triples.push(group.slice(0, 3));
            }
        }
        return triples;
    }
    
    findStraightContaining(hand, targetCard) {
        const normals = hand.filter(c => c.type !== 'joker' && c.value < 12); // No 2s
        if (normals.length < 5) return null;
        
        const sorted = [...normals].sort((a, b) => a.value - b.value);
        
        for (let i = 0; i <= sorted.length - 5; i++) {
            const seq = sorted.slice(i, i + 5);
            let isSeq = true;
            for (let j = 1; j < 5; j++) {
                if (seq[j].value !== seq[j-1].value + 1) { isSeq = false; break; }
            }
            if (isSeq && seq.some(c => c.id === targetCard.id)) {
                return seq;
            }
        }
        
        return null;
    }
    
    findAllFiveCardCombos(hand, jokerMode) {
        const combos = [];
        const normals = hand.filter(c => c.type !== 'joker');
        
        // Straights
        const nonTwo = normals.filter(c => c.value < 12).sort((a, b) => a.value - b.value);
        for (let i = 0; i <= nonTwo.length - 5; i++) {
            const seq = nonTwo.slice(i, i + 5);
            let isSeq = true;
            // Remove duplicates by value
            const uniqueVals = [...new Set(seq.map(c => c.value))];
            if (uniqueVals.length < 5) continue;
            
            for (let j = 1; j < 5; j++) {
                if (seq[j].value !== seq[j-1].value + 1) { isSeq = false; break; }
            }
            if (isSeq) combos.push(seq);
        }
        
        // Full Houses
        const rankGroups = {};
        normals.forEach(c => {
            if (!rankGroups[c.value]) rankGroups[c.value] = [];
            rankGroups[c.value].push(c);
        });
        
        for (const [rank3, group3] of Object.entries(rankGroups)) {
            if (group3.length >= 3) {
                for (const [rank2, group2] of Object.entries(rankGroups)) {
                    if (rank2 !== rank3 && group2.length >= 2) {
                        combos.push([...group3.slice(0, 3), ...group2.slice(0, 2)]);
                    }
                }
            }
        }
        
        // Four of a Kind
        for (const [rank, group] of Object.entries(rankGroups)) {
            if (group.length >= 4) {
                const kicker = normals.find(c => c.value !== parseInt(rank));
                if (kicker) combos.push([...group.slice(0, 4), kicker]);
            }
        }
        
        // Sort combos: weakest first so bot plays weakest winning combo
        combos.sort((a, b) => {
            const comboA = identifyCombo(a, jokerMode);
            const comboB = identifyCombo(b, jokerMode);
            if (comboA.type !== comboB.type) return comboA.type - comboB.type;
            return comboA.rank - comboB.rank;
        });
        
        return combos;
    }
}
