/**
 * Basic Strategy Charts for Blackjack
 * Vegas Rules: 6 Deck, Dealer Stands on Soft 17, DAS Allowed, No Surrender
 *
 * Actions:
 * H = Hit
 * S = Stand
 * D = Double (if not allowed, hit)
 * Ds = Double (if not allowed, stand)
 * P = Split
 */

const BasicStrategy = {
    // Hard totals (no Ace counted as 11)
    // Rows: Player total (5-17+), Columns: Dealer upcard (2-A)
    hard: {
        5:  ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'],
        6:  ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'],
        7:  ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'],
        8:  ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'],
        9:  ['H', 'D', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
        10: ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'H', 'H'],
        11: ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D'],
        12: ['H', 'H', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
        13: ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
        14: ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
        15: ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
        16: ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
        17: ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
        18: ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
        19: ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
        20: ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
        21: ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S']
    },

    // Soft totals (Ace counted as 11)
    // Rows: Player total (A,2 through A,9), Columns: Dealer upcard (2-A)
    soft: {
        13: ['H', 'H', 'H', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],  // A,2
        14: ['H', 'H', 'H', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],  // A,3
        15: ['H', 'H', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],  // A,4
        16: ['H', 'H', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],  // A,5
        17: ['H', 'D', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],  // A,6
        18: ['S', 'Ds','Ds','Ds','Ds','S', 'S', 'H', 'H', 'H'],  // A,7: Stand vs 2, Double vs 3-6, Stand vs 7-8, Hit vs 9-A
        19: ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],  // A,8: Always Stand
        20: ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],  // A,9
        21: ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S']   // A,10 (Blackjack)
    },

    // Pairs
    // Rows: Pair value (2,2 through A,A), Columns: Dealer upcard (2-A)
    pairs: {
        2:  ['P', 'P', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'],
        3:  ['P', 'P', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'],
        4:  ['H', 'H', 'H', 'P', 'P', 'H', 'H', 'H', 'H', 'H'],
        5:  ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'H', 'H'],  // Treat as 10
        6:  ['P', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H', 'H'],
        7:  ['P', 'P', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'],
        8:  ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
        9:  ['P', 'P', 'P', 'P', 'P', 'S', 'P', 'P', 'S', 'S'],
        10: ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],  // Never split 10s
        11: ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P']   // Aces
    },

    // Dealer card index mapping (2-10, A)
    dealerIndex: {
        2: 0, 3: 1, 4: 2, 5: 3, 6: 4, 7: 5, 8: 6, 9: 7, 10: 8, 11: 9
    },

    /**
     * Get the optimal action for a given hand
     * @param {Object} playerHand - Player's hand info
     * @param {number} dealerUpcard - Dealer's visible card value (2-11, 11=Ace)
     * @param {boolean} canDouble - Whether doubling is allowed
     * @param {boolean} canSplit - Whether splitting is allowed
     * @returns {Object} - { action, explanation }
     */
    getOptimalPlay(playerHand, dealerUpcard, canDouble = true, canSplit = true) {
        const dealerIdx = this.dealerIndex[dealerUpcard];
        let action, chart, handType;

        // Check for pairs first (if splitting is allowed)
        if (canSplit && playerHand.isPair) {
            const pairValue = playerHand.cards[0].value;
            action = this.pairs[pairValue][dealerIdx];
            chart = 'pairs';
            handType = `${this.getCardName(pairValue)},${this.getCardName(pairValue)}`;
        }
        // Check for soft hands (contains Ace counted as 11)
        else if (playerHand.isSoft && playerHand.total <= 21) {
            const softTotal = playerHand.total;
            if (softTotal >= 13 && softTotal <= 21) {
                action = this.soft[softTotal][dealerIdx];
                chart = 'soft';
                handType = `Soft ${softTotal}`;
            } else {
                action = 'H';
                chart = 'soft';
                handType = `Soft ${softTotal}`;
            }
        }
        // Hard hands
        else {
            const hardTotal = Math.min(playerHand.total, 21);
            if (hardTotal >= 5) {
                action = this.hard[Math.min(hardTotal, 21)][dealerIdx];
                chart = 'hard';
                handType = `Hard ${hardTotal}`;
            } else {
                action = 'H';
                chart = 'hard';
                handType = `Hard ${hardTotal}`;
            }
        }

        // Handle double restrictions
        if (action === 'D' && !canDouble) {
            action = 'H';
        }
        if (action === 'Ds' && !canDouble) {
            action = 'S';
        }
        if (action === 'P' && !canSplit) {
            // Fall back to hard total strategy
            const hardTotal = playerHand.total;
            action = this.hard[Math.min(hardTotal, 21)][dealerIdx];
        }

        // Normalize action
        if (action === 'Ds') action = 'D';

        const explanation = this.getExplanation(action, handType, dealerUpcard, chart);

        return {
            action: this.getFullActionName(action),
            shortAction: action,
            explanation,
            handType,
            chart
        };
    },

    getFullActionName(action) {
        const names = {
            'H': 'HIT',
            'S': 'STAND',
            'D': 'DOUBLE',
            'P': 'SPLIT'
        };
        return names[action] || action;
    },

    getCardName(value) {
        if (value === 11) return 'A';
        if (value === 10) return 'T';
        return value.toString();
    },

    getDealerCardName(value) {
        if (value === 11) return 'Ace';
        if (value === 10) return '10';
        return value.toString();
    },

    /**
     * Generate explanation for the optimal play
     */
    getExplanation(action, handType, dealerUpcard, chart) {
        const dealerName = this.getDealerCardName(dealerUpcard);
        const dealerWeak = dealerUpcard >= 2 && dealerUpcard <= 6;
        const dealerStrong = dealerUpcard >= 7 || dealerUpcard === 11;

        // Specific explanations for common situations
        const explanations = {
            // Hard totals
            'hard_H_low': `Your total is too low to stand. Hit to improve your hand.`,
            'hard_H_vs_strong': `Against a strong dealer ${dealerName}, you need to try to improve. The dealer likely has a good hand.`,
            'hard_S_vs_weak': `With ${handType} vs dealer ${dealerName}, stand and let the dealer bust. Dealer must hit and has a high chance of busting.`,
            'hard_S_high': `${handType} is strong enough to stand. Any hit risks busting.`,
            'hard_D_9': `Double on 9 against weak dealer cards (3-6). You have a good chance to make 19 and the dealer may bust.`,
            'hard_D_10': `Double on 10 against dealer 2-9. You'll likely make 20 and have the advantage.`,
            'hard_D_11': `Always double on 11. You have the best chance to make 21 and can't bust with one card.`,
            'hard_12_special': `12 vs ${dealerName}: ${dealerUpcard <= 3 ? 'Hit because 2-3 are less likely to bust' : 'Stand and let the dealer bust with 4-6'}.`,

            // Soft totals
            'soft_H_low': `With a soft hand, you can't bust on one hit. Try to improve your total.`,
            'soft_D': `Double with soft hands against weak dealers. You can't bust and dealer may bust.`,
            'soft_S_18': `Soft 18 is strong against dealer 7-8. Stand and take your 18.`,
            'soft_H_18_vs_strong': `Soft 18 vs ${dealerName}: Hit to try for a better hand. 18 often loses to strong dealer upcards.`,

            // Pairs
            'pair_A': `Always split Aces. Two chances at 21 is better than soft 12.`,
            'pair_8': `Always split 8s. 16 is the worst hand; two 8s give you two chances at 18.`,
            'pair_10': `Never split 10s. 20 is too strong to break up.`,
            'pair_5': `Never split 5s. Treat as hard 10 and double against weak dealers.`,
            'pair_4': `Only split 4s against 5-6. Otherwise, hit your 8.`,
            'pair_weak': `Split low pairs against weak dealers (2-7) to capitalize on dealer bust potential.`,
            'pair_9_special': `Split 9s except against 7 (you'd make 18 vs likely 17), 10, or A.`
        };

        // Select appropriate explanation
        if (chart === 'pairs') {
            // Parse pair value - handle 'A' for Aces and 'T' for 10-value cards
            const pairStr = handType.split(',')[0];
            let pairVal;
            if (pairStr === 'A') {
                pairVal = 11;
            } else if (pairStr === 'T') {
                pairVal = 10;
            } else {
                pairVal = parseInt(pairStr);
            }

            if (pairVal === 11) return explanations['pair_A'];
            if (pairVal === 8) return explanations['pair_8'];
            if (pairVal === 10) return explanations['pair_10'];
            if (pairVal === 5) return explanations['pair_5'];
            if (pairVal === 4) return explanations['pair_4'];
            if (pairVal === 9 && action === 'S') return explanations['pair_9_special'];
            if (action === 'P') return explanations['pair_weak'];
        }

        if (chart === 'soft') {
            if (action === 'D') return explanations['soft_D'];
            if (action === 'S') return explanations['soft_S_18'];
            if (handType === 'Soft 18' && action === 'H') return explanations['soft_H_18_vs_strong'];
            return explanations['soft_H_low'];
        }

        // Hard totals
        if (action === 'D') {
            if (handType.includes('11')) return explanations['hard_D_11'];
            if (handType.includes('10')) return explanations['hard_D_10'];
            if (handType.includes('9')) return explanations['hard_D_9'];
        }

        if (handType.includes('12')) return explanations['hard_12_special'];

        if (action === 'S') {
            if (dealerWeak) return explanations['hard_S_vs_weak'];
            return explanations['hard_S_high'];
        }

        if (action === 'H') {
            const total = parseInt(handType.split(' ')[1]);
            if (total <= 11) return explanations['hard_H_low'];
            return explanations['hard_H_vs_strong'];
        }

        return `Basic strategy recommends ${this.getFullActionName(action)} for ${handType} vs dealer ${dealerName}.`;
    },

    /**
     * Get chart data for display
     */
    getChartData(chartType) {
        if (chartType === 'hard') {
            return {
                headers: ['', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'A'],
                rows: [
                    { label: '17+', data: this.hard[17] },
                    { label: '16', data: this.hard[16] },
                    { label: '15', data: this.hard[15] },
                    { label: '14', data: this.hard[14] },
                    { label: '13', data: this.hard[13] },
                    { label: '12', data: this.hard[12] },
                    { label: '11', data: this.hard[11] },
                    { label: '10', data: this.hard[10] },
                    { label: '9', data: this.hard[9] },
                    { label: '8', data: this.hard[8] },
                    { label: '5-7', data: this.hard[5] }
                ]
            };
        }

        if (chartType === 'soft') {
            return {
                headers: ['', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'A'],
                rows: [
                    { label: 'A,9', data: this.soft[20] },
                    { label: 'A,8', data: this.soft[19] },
                    { label: 'A,7', data: this.soft[18] },
                    { label: 'A,6', data: this.soft[17] },
                    { label: 'A,5', data: this.soft[16] },
                    { label: 'A,4', data: this.soft[15] },
                    { label: 'A,3', data: this.soft[14] },
                    { label: 'A,2', data: this.soft[13] }
                ]
            };
        }

        if (chartType === 'pairs') {
            return {
                headers: ['', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'A'],
                rows: [
                    { label: 'A,A', data: this.pairs[11] },
                    { label: '10,10', data: this.pairs[10] },
                    { label: '9,9', data: this.pairs[9] },
                    { label: '8,8', data: this.pairs[8] },
                    { label: '7,7', data: this.pairs[7] },
                    { label: '6,6', data: this.pairs[6] },
                    { label: '5,5', data: this.pairs[5] },
                    { label: '4,4', data: this.pairs[4] },
                    { label: '3,3', data: this.pairs[3] },
                    { label: '2,2', data: this.pairs[2] }
                ]
            };
        }
    }
};

// Make it available globally
window.BasicStrategy = BasicStrategy;
