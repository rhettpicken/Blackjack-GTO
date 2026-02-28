/**
 * Statistics tracking for Blackjack GTO Trainer
 * Stores data in localStorage for persistence
 */

const Stats = {
    STORAGE_KEY: 'blackjack_gto_stats',

    BANKROLL_KEY: 'blackjack_gto_bankroll',
    DEFAULT_BANKROLL: 1000,

    // Default stats structure
    defaultStats: {
        totalHands: 0,
        correctDecisions: 0,
        incorrectDecisions: 0,
        byHandType: {
            hard: { correct: 0, total: 0 },
            soft: { correct: 0, total: 0 },
            pairs: { correct: 0, total: 0 }
        },
        missedSituations: {}, // { "16 vs 10": count }
        sessions: [],
        lastPlayed: null,
        // Money stats
        totalWagered: 0,
        totalWon: 0,
        totalLost: 0,
        biggestWin: 0,
        biggestLoss: 0
    },

    // Current session stats
    session: {
        correct: 0,
        incorrect: 0,
        hands: [],
        profit: 0
    },

    /**
     * Load stats from localStorage
     */
    load() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const stats = JSON.parse(saved);
                // Ensure money stats exist (for upgrades from older versions)
                if (stats.totalWagered === undefined) {
                    stats.totalWagered = 0;
                    stats.totalWon = 0;
                    stats.totalLost = 0;
                    stats.biggestWin = 0;
                    stats.biggestLoss = 0;
                }
                return stats;
            }
        } catch (e) {
            console.error('Failed to load stats:', e);
        }
        return { ...this.defaultStats };
    },

    /**
     * Load bankroll from localStorage
     */
    loadBankroll() {
        try {
            const saved = localStorage.getItem(this.BANKROLL_KEY);
            if (saved) {
                return parseFloat(saved);
            }
        } catch (e) {
            console.error('Failed to load bankroll:', e);
        }
        return this.DEFAULT_BANKROLL;
    },

    /**
     * Save bankroll to localStorage
     */
    saveBankroll(amount) {
        try {
            localStorage.setItem(this.BANKROLL_KEY, amount.toString());
        } catch (e) {
            console.error('Failed to save bankroll:', e);
        }
    },

    /**
     * Update bankroll after a hand
     * @param {number} amount - Positive for win, negative for loss, 0 for push
     * @returns {number} - New bankroll
     */
    updateBankroll(amount) {
        let bankroll = this.loadBankroll();
        bankroll += amount;
        this.saveBankroll(bankroll);

        // Update session profit
        this.session.profit += amount;

        // Update all-time stats
        const stats = this.load();
        if (amount > 0) {
            stats.totalWon += amount;
            if (amount > stats.biggestWin) {
                stats.biggestWin = amount;
            }
        } else if (amount < 0) {
            stats.totalLost += Math.abs(amount);
            if (Math.abs(amount) > stats.biggestLoss) {
                stats.biggestLoss = Math.abs(amount);
            }
        }
        this.save(stats);

        return bankroll;
    },

    /**
     * Record a wager
     */
    recordWager(amount) {
        const stats = this.load();
        stats.totalWagered += amount;
        this.save(stats);
    },

    /**
     * Reset bankroll to default
     */
    resetBankroll() {
        this.saveBankroll(this.DEFAULT_BANKROLL);
        return this.DEFAULT_BANKROLL;
    },

    /**
     * Save stats to localStorage
     */
    save(stats) {
        try {
            stats.lastPlayed = new Date().toISOString();
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stats));
        } catch (e) {
            console.error('Failed to save stats:', e);
        }
    },

    /**
     * Record a decision result
     * @param {boolean} correct - Whether the decision was correct
     * @param {string} handType - 'hard', 'soft', or 'pairs'
     * @param {string} situation - Description like "16 vs 10"
     * @param {string} playerAction - What the player chose
     * @param {string} correctAction - What they should have chosen
     */
    recordDecision(correct, handType, situation, playerAction, correctAction) {
        const stats = this.load();

        stats.totalHands++;

        if (correct) {
            stats.correctDecisions++;
            stats.byHandType[handType].correct++;
        } else {
            stats.incorrectDecisions++;
            // Track missed situations
            if (!stats.missedSituations[situation]) {
                stats.missedSituations[situation] = {
                    count: 0,
                    correctAction: correctAction
                };
            }
            stats.missedSituations[situation].count++;
        }

        stats.byHandType[handType].total++;

        // Update session
        this.session.hands.push({
            situation,
            handType,
            correct,
            playerAction,
            correctAction
        });

        if (correct) {
            this.session.correct++;
        } else {
            this.session.incorrect++;
        }

        this.save(stats);
        return stats;
    },

    /**
     * Get current session stats
     */
    getSessionStats() {
        const total = this.session.correct + this.session.incorrect;
        const accuracy = total > 0 ? Math.round((this.session.correct / total) * 100) : 0;

        return {
            correct: this.session.correct,
            incorrect: this.session.incorrect,
            total,
            accuracy,
            profit: this.session.profit
        };
    },

    /**
     * Reset current session
     */
    resetSession() {
        // Save session to history before resetting
        const stats = this.load();
        if (this.session.hands.length > 0) {
            stats.sessions.push({
                date: new Date().toISOString(),
                correct: this.session.correct,
                incorrect: this.session.incorrect,
                hands: this.session.hands.length,
                profit: this.session.profit
            });
            // Keep only last 30 sessions
            if (stats.sessions.length > 30) {
                stats.sessions = stats.sessions.slice(-30);
            }
            this.save(stats);
        }

        this.session = {
            correct: 0,
            incorrect: 0,
            hands: [],
            profit: 0
        };
    },

    /**
     * Get overall statistics
     */
    getOverallStats() {
        const stats = this.load();
        const total = stats.correctDecisions + stats.incorrectDecisions;
        const accuracy = total > 0 ? Math.round((stats.correctDecisions / total) * 100) : 0;

        // Calculate accuracy by hand type
        const hardAccuracy = stats.byHandType.hard.total > 0
            ? Math.round((stats.byHandType.hard.correct / stats.byHandType.hard.total) * 100)
            : 0;
        const softAccuracy = stats.byHandType.soft.total > 0
            ? Math.round((stats.byHandType.soft.correct / stats.byHandType.soft.total) * 100)
            : 0;
        const pairsAccuracy = stats.byHandType.pairs.total > 0
            ? Math.round((stats.byHandType.pairs.correct / stats.byHandType.pairs.total) * 100)
            : 0;

        // Get top missed situations
        const missedList = Object.entries(stats.missedSituations)
            .map(([situation, data]) => ({
                situation,
                count: data.count,
                correctAction: data.correctAction
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // Calculate all-time profit
        const allTimeProfit = stats.totalWon - stats.totalLost;

        return {
            totalHands: stats.totalHands,
            correctDecisions: stats.correctDecisions,
            incorrectDecisions: stats.incorrectDecisions,
            accuracy,
            hardAccuracy,
            softAccuracy,
            pairsAccuracy,
            hardTotal: stats.byHandType.hard.total,
            softTotal: stats.byHandType.soft.total,
            pairsTotal: stats.byHandType.pairs.total,
            missedSituations: missedList,
            lastPlayed: stats.lastPlayed,
            recentSessions: stats.sessions.slice(-10),
            // Money stats
            bankroll: this.loadBankroll(),
            allTimeProfit,
            totalWagered: stats.totalWagered,
            totalWon: stats.totalWon,
            totalLost: stats.totalLost,
            biggestWin: stats.biggestWin,
            biggestLoss: stats.biggestLoss
        };
    },

    /**
     * Reset all statistics
     */
    resetAll() {
        this.session = {
            correct: 0,
            incorrect: 0,
            hands: [],
            profit: 0
        };
        this.save({ ...this.defaultStats });
        this.resetBankroll();
    },

    /**
     * Get improvement trend (last 5 sessions vs previous 5)
     */
    getImprovementTrend() {
        const stats = this.load();
        const sessions = stats.sessions;

        if (sessions.length < 5) {
            return { trend: 'neutral', message: 'Play more sessions to see trends' };
        }

        const recent5 = sessions.slice(-5);
        const previous5 = sessions.slice(-10, -5);

        const recentAccuracy = recent5.reduce((sum, s) => {
            const total = s.correct + s.incorrect;
            return sum + (total > 0 ? s.correct / total : 0);
        }, 0) / recent5.length;

        if (previous5.length < 5) {
            return { trend: 'neutral', message: 'Keep practicing!' };
        }

        const previousAccuracy = previous5.reduce((sum, s) => {
            const total = s.correct + s.incorrect;
            return sum + (total > 0 ? s.correct / total : 0);
        }, 0) / previous5.length;

        const diff = recentAccuracy - previousAccuracy;

        if (diff > 0.05) {
            return { trend: 'up', message: `Improving! +${Math.round(diff * 100)}% from previous sessions` };
        } else if (diff < -0.05) {
            return { trend: 'down', message: `Focus needed. ${Math.round(Math.abs(diff) * 100)}% drop from previous sessions` };
        } else {
            return { trend: 'stable', message: 'Consistent performance!' };
        }
    }
};

// Make it available globally
window.Stats = Stats;
