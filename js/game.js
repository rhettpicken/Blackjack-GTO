/**
 * Blackjack Game Engine
 * Vegas Rules: 6 Deck, Dealer Stands on Soft 17, DAS Allowed, No Surrender
 */

const Game = {
    // Game configuration
    config: {
        numDecks: 6,
        dealerStandsSoft17: true,
        doubleAfterSplit: true,
        reshuffle: 0.75 // Reshuffle when 75% of shoe is used
    },

    // Game state
    state: {
        shoe: [],
        playerHand: [],
        dealerHand: [],
        gamePhase: 'betting', // betting, playerTurn, dealerTurn, complete
        currentHandIndex: 0,
        splitHands: [],
        mode: 'learning', // 'learning' or 'test'
        awaitingDecision: false,
        lastOptimalPlay: null,
        handComplete: false,
        // Betting state
        currentBet: 25,
        doubled: false,
        lastPayout: 0
    },

    // Card values and suits
    suits: ['♠', '♥', '♦', '♣'],
    ranks: ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'],

    /**
     * Initialize or reset the game
     */
    init() {
        this.state.shoe = this.createShoe();
        this.shuffleShoe();
        this.state.gamePhase = 'betting';
        this.state.currentBet = 25;
        this.state.doubled = false;
    },

    /**
     * Set the current bet amount
     */
    setBet(amount) {
        this.state.currentBet = amount;
    },

    /**
     * Get the current bet amount
     */
    getBet() {
        return this.state.currentBet;
    },

    /**
     * Calculate payout for the hand result
     * @returns {number} - Amount won/lost (positive = win, negative = loss)
     */
    calculatePayout(result) {
        const bet = this.state.currentBet;
        const multiplier = this.state.doubled ? 2 : 1;
        const actualBet = bet * multiplier;

        switch (result.result) {
            case 'blackjack':
                // Blackjack pays 3:2
                return bet * 1.5;
            case 'win':
                return actualBet;
            case 'lose':
                return -actualBet;
            case 'push':
                return 0;
            default:
                return 0;
        }
    },

    /**
     * Create a shoe with multiple decks
     */
    createShoe() {
        const shoe = [];
        for (let d = 0; d < this.config.numDecks; d++) {
            for (const suit of this.suits) {
                for (const rank of this.ranks) {
                    shoe.push({
                        rank,
                        suit,
                        value: this.getCardValue(rank)
                    });
                }
            }
        }
        return shoe;
    },

    /**
     * Get numeric value of a card
     */
    getCardValue(rank) {
        if (rank === 'A') return 11;
        if (['K', 'Q', 'J'].includes(rank)) return 10;
        return parseInt(rank);
    },

    /**
     * Shuffle the shoe using Fisher-Yates algorithm
     */
    shuffleShoe() {
        const shoe = this.state.shoe;
        for (let i = shoe.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
        }
    },

    /**
     * Deal a card from the shoe
     */
    dealCard(faceUp = true) {
        // Check if reshuffle needed
        const cardsUsed = (this.config.numDecks * 52) - this.state.shoe.length;
        const penetration = cardsUsed / (this.config.numDecks * 52);
        if (penetration >= this.config.reshuffle) {
            this.state.shoe = this.createShoe();
            this.shuffleShoe();
        }

        const card = this.state.shoe.pop();
        card.faceUp = faceUp;
        return card;
    },

    /**
     * Start a new hand
     */
    dealNewHand() {
        this.state.playerHand = [];
        this.state.dealerHand = [];
        this.state.splitHands = [];
        this.state.currentHandIndex = 0;
        this.state.handComplete = false;
        this.state.awaitingDecision = false;
        this.state.lastOptimalPlay = null;
        this.state.doubled = false;
        this.state.lastPayout = 0;

        // Deal initial cards
        this.state.playerHand.push(this.dealCard());
        this.state.dealerHand.push(this.dealCard());
        this.state.playerHand.push(this.dealCard());
        this.state.dealerHand.push(this.dealCard(false)); // Hole card face down

        this.state.gamePhase = 'playerTurn';

        // Check for blackjacks
        const playerBJ = this.isBlackjack(this.state.playerHand);
        const dealerBJ = this.isBlackjack(this.state.dealerHand);

        if (playerBJ || dealerBJ) {
            this.revealDealerCards();
            this.state.gamePhase = 'complete';
            this.state.handComplete = true;
            return this.getHandResult();
        }

        // Calculate optimal play for this situation
        this.state.lastOptimalPlay = this.getOptimalPlay();
        this.state.awaitingDecision = true;

        return null;
    },

    /**
     * Get hand analysis info
     */
    getHandInfo(hand) {
        let total = 0;
        let aces = 0;
        let isSoft = false;

        for (const card of hand) {
            if (card.faceUp !== false) {
                total += card.value;
                if (card.rank === 'A') aces++;
            }
        }

        // Adjust for aces
        while (total > 21 && aces > 0) {
            total -= 10;
            aces--;
        }

        isSoft = aces > 0 && total <= 21;

        // Check for pair
        const isPair = hand.length === 2 &&
            hand[0].faceUp !== false &&
            hand[1].faceUp !== false &&
            hand[0].value === hand[1].value;

        return {
            cards: hand,
            total,
            isSoft,
            isPair,
            isBusted: total > 21,
            isBlackjack: this.isBlackjack(hand)
        };
    },

    /**
     * Get dealer's visible card value
     */
    getDealerUpcard() {
        const upcard = this.state.dealerHand.find(c => c.faceUp);
        return upcard ? upcard.value : null;
    },

    /**
     * Check if hand is blackjack
     */
    isBlackjack(hand) {
        if (hand.length !== 2) return false;
        const values = hand.map(c => c.value);
        return (values.includes(11) && values.includes(10));
    },

    /**
     * Get the optimal play for current situation
     */
    getOptimalPlay() {
        const playerInfo = this.getHandInfo(this.state.playerHand);
        const dealerUpcard = this.getDealerUpcard();
        const canDouble = this.state.playerHand.length === 2;
        const canSplit = playerInfo.isPair && this.state.splitHands.length === 0;

        return BasicStrategy.getOptimalPlay(playerInfo, dealerUpcard, canDouble, canSplit);
    },

    /**
     * Check if player action matches optimal play
     */
    checkAction(action) {
        const optimal = this.state.lastOptimalPlay;
        if (!optimal) return { correct: true };

        const actionMap = {
            'hit': 'H',
            'stand': 'S',
            'double': 'D',
            'split': 'P'
        };

        const playerAction = actionMap[action.toLowerCase()];
        const isCorrect = playerAction === optimal.shortAction;

        // Build situation string for stats
        const playerInfo = this.getHandInfo(this.state.playerHand);
        const dealerUpcard = this.getDealerUpcard();
        const dealerName = dealerUpcard === 11 ? 'A' : dealerUpcard.toString();
        const situation = `${optimal.handType} vs ${dealerName}`;

        return {
            correct: isCorrect,
            playerAction: action.toUpperCase(),
            optimalAction: optimal.action,
            explanation: optimal.explanation,
            situation,
            handType: optimal.chart
        };
    },

    /**
     * Player hits
     */
    hit() {
        this.state.playerHand.push(this.dealCard());
        const info = this.getHandInfo(this.state.playerHand);

        if (info.isBusted) {
            this.state.gamePhase = 'complete';
            this.state.handComplete = true;
            this.revealDealerCards();
            return { busted: true, result: this.getHandResult() };
        }

        // Recalculate optimal play
        this.state.lastOptimalPlay = this.getOptimalPlay();
        return { busted: false };
    },

    /**
     * Player stands
     */
    stand() {
        this.state.gamePhase = 'dealerTurn';
        this.playDealerHand();
        this.state.handComplete = true;
        return this.getHandResult();
    },

    /**
     * Player doubles down
     */
    double() {
        this.state.doubled = true;
        this.state.playerHand.push(this.dealCard());
        const info = this.getHandInfo(this.state.playerHand);

        this.state.gamePhase = 'dealerTurn';

        if (!info.isBusted) {
            this.playDealerHand();
        } else {
            this.revealDealerCards();
        }

        this.state.handComplete = true;
        return this.getHandResult();
    },

    /**
     * Player splits (simplified - no re-splitting)
     */
    split() {
        // For training purposes, we'll just continue with the first hand
        // A full implementation would handle split hands
        const secondCard = this.state.playerHand.pop();
        this.state.playerHand.push(this.dealCard());

        // Store second hand for reference
        this.state.splitHands = [[secondCard, this.dealCard()]];

        // Recalculate optimal play
        this.state.lastOptimalPlay = this.getOptimalPlay();

        return { split: true };
    },

    /**
     * Play out dealer's hand
     */
    playDealerHand() {
        this.revealDealerCards();

        let dealerInfo = this.getHandInfo(this.state.dealerHand);

        // Dealer hits on soft 17 or below, stands on hard 17 or soft 18+
        while (dealerInfo.total < 17 ||
               (dealerInfo.total === 17 && dealerInfo.isSoft && !this.config.dealerStandsSoft17)) {
            this.state.dealerHand.push(this.dealCard());
            dealerInfo = this.getHandInfo(this.state.dealerHand);
        }

        this.state.gamePhase = 'complete';
    },

    /**
     * Reveal dealer's hole card
     */
    revealDealerCards() {
        this.state.dealerHand.forEach(card => {
            card.faceUp = true;
        });
    },

    /**
     * Get the result of the hand
     */
    getHandResult() {
        const playerInfo = this.getHandInfo(this.state.playerHand);
        const dealerInfo = this.getHandInfo(this.state.dealerHand);

        if (playerInfo.isBusted) {
            return { result: 'lose', message: 'Bust! You lose.' };
        }

        if (playerInfo.isBlackjack && !dealerInfo.isBlackjack) {
            return { result: 'blackjack', message: 'Blackjack! You win!' };
        }

        if (dealerInfo.isBlackjack && !playerInfo.isBlackjack) {
            return { result: 'lose', message: 'Dealer Blackjack. You lose.' };
        }

        if (playerInfo.isBlackjack && dealerInfo.isBlackjack) {
            return { result: 'push', message: 'Push - both Blackjack.' };
        }

        if (dealerInfo.isBusted) {
            return { result: 'win', message: 'Dealer busts! You win!' };
        }

        if (playerInfo.total > dealerInfo.total) {
            return { result: 'win', message: `You win! ${playerInfo.total} beats ${dealerInfo.total}.` };
        }

        if (playerInfo.total < dealerInfo.total) {
            return { result: 'lose', message: `You lose. ${dealerInfo.total} beats ${playerInfo.total}.` };
        }

        return { result: 'push', message: `Push. Both have ${playerInfo.total}.` };
    },

    /**
     * Set game mode
     */
    setMode(mode) {
        this.state.mode = mode;
    },

    /**
     * Get current game state for UI
     */
    getState() {
        return {
            playerHand: this.state.playerHand,
            dealerHand: this.state.dealerHand,
            playerInfo: this.getHandInfo(this.state.playerHand),
            dealerInfo: this.getHandInfo(this.state.dealerHand),
            dealerUpcard: this.getDealerUpcard(),
            gamePhase: this.state.gamePhase,
            mode: this.state.mode,
            awaitingDecision: this.state.awaitingDecision,
            optimalPlay: this.state.lastOptimalPlay,
            handComplete: this.state.handComplete,
            canDouble: this.state.playerHand.length === 2,
            canSplit: this.getHandInfo(this.state.playerHand).isPair && this.state.splitHands.length === 0,
            // Betting info
            currentBet: this.state.currentBet,
            doubled: this.state.doubled,
            lastPayout: this.state.lastPayout
        };
    }
};

// Initialize on load
Game.init();

// Make it available globally
window.Game = Game;
