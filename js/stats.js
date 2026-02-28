/**
 * Statistics tracking for Blackjack GTO Trainer
 * Stores data in localStorage for persistence
 */

const Stats = {
    STORAGE_KEY: 'blackjack_gto_stats',

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
        lastPlayed: null
    },

    // Current session stats
    session: {
        correct: 0,
        incorrect: 0,
        hands: []
    },

    /**
     * Load stats from localStorage
     */
    load() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load stats:', e);
        }
        return { ...this.defaultStats };
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
            accuracy
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
                hands: this.session.hands.length
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
            hands: []
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
            recentSessions: stats.sessions.slice(-10)
        };
    },

    /**
     * Reset all statistics
     */
    resetAll() {
        this.session = {
            correct: 0,
            incorrect: 0,
            hands: []
        };
        this.save({ ...this.defaultStats });
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
