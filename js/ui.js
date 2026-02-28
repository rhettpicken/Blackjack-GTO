/**
 * UI Controller for Blackjack GTO Trainer
 */

const UI = {
    // DOM Elements
    elements: {},

    // Current state
    currentScreen: 'menu',
    currentChartType: 'hard',

    /**
     * Initialize the UI
     */
    init() {
        this.cacheElements();
        this.bindEvents();
        this.showScreen('menu');
    },

    /**
     * Cache DOM elements
     */
    cacheElements() {
        // Screens
        this.elements.menuScreen = document.getElementById('menu-screen');
        this.elements.gameScreen = document.getElementById('game-screen');
        this.elements.statsScreen = document.getElementById('stats-screen');
        this.elements.chartScreen = document.getElementById('chart-screen');

        // Menu buttons
        this.elements.btnLearningMode = document.getElementById('btn-learning-mode');
        this.elements.btnTestMode = document.getElementById('btn-test-mode');
        this.elements.btnStats = document.getElementById('btn-stats');
        this.elements.btnStrategyChart = document.getElementById('btn-strategy-chart');

        // Game elements
        this.elements.btnBack = document.getElementById('btn-back');
        this.elements.btnToggleMode = document.getElementById('btn-toggle-mode');
        this.elements.modeLabel = document.getElementById('mode-label');
        this.elements.dealerHand = document.getElementById('dealer-hand');
        this.elements.playerHand = document.getElementById('player-hand');
        this.elements.dealerTotal = document.getElementById('dealer-total');
        this.elements.playerTotal = document.getElementById('player-total');
        this.elements.strategySection = document.getElementById('strategy-section');
        this.elements.strategyAction = document.getElementById('strategy-action');
        this.elements.strategyExplanation = document.getElementById('strategy-explanation');
        this.elements.feedbackSection = document.getElementById('feedback-section');
        this.elements.actionButtons = document.getElementById('action-buttons');
        this.elements.nextHandSection = document.getElementById('next-hand-section');
        this.elements.handResult = document.getElementById('hand-result');

        // Action buttons
        this.elements.btnHit = document.getElementById('btn-hit');
        this.elements.btnStand = document.getElementById('btn-stand');
        this.elements.btnDouble = document.getElementById('btn-double');
        this.elements.btnSplit = document.getElementById('btn-split');
        this.elements.btnNextHand = document.getElementById('btn-next-hand');

        // Session stats
        this.elements.statCorrect = document.getElementById('stat-correct');
        this.elements.statIncorrect = document.getElementById('stat-incorrect');
        this.elements.statAccuracy = document.getElementById('stat-accuracy');

        // Stats screen
        this.elements.btnBackStats = document.getElementById('btn-back-stats');
        this.elements.btnResetStats = document.getElementById('btn-reset-stats');
        this.elements.overallAccuracy = document.getElementById('overall-accuracy');
        this.elements.totalHands = document.getElementById('total-hands');
        this.elements.totalCorrect = document.getElementById('total-correct');
        this.elements.hardBar = document.getElementById('hard-bar');
        this.elements.softBar = document.getElementById('soft-bar');
        this.elements.pairsBar = document.getElementById('pairs-bar');
        this.elements.hardAccuracy = document.getElementById('hard-accuracy');
        this.elements.softAccuracy = document.getElementById('soft-accuracy');
        this.elements.pairsAccuracy = document.getElementById('pairs-accuracy');
        this.elements.missedList = document.getElementById('missed-list');

        // Chart screen
        this.elements.btnBackChart = document.getElementById('btn-back-chart');
        this.elements.chartTabs = document.querySelectorAll('.chart-tab');
        this.elements.chartDisplay = document.getElementById('strategy-chart-display');
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Menu buttons
        this.elements.btnLearningMode.addEventListener('click', () => this.startGame('learning'));
        this.elements.btnTestMode.addEventListener('click', () => this.startGame('test'));
        this.elements.btnStats.addEventListener('click', () => this.showScreen('stats'));
        this.elements.btnStrategyChart.addEventListener('click', () => this.showScreen('chart'));

        // Game navigation
        this.elements.btnBack.addEventListener('click', () => this.exitGame());
        this.elements.btnToggleMode.addEventListener('click', () => this.toggleMode());

        // Action buttons
        this.elements.btnHit.addEventListener('click', () => this.handleAction('hit'));
        this.elements.btnStand.addEventListener('click', () => this.handleAction('stand'));
        this.elements.btnDouble.addEventListener('click', () => this.handleAction('double'));
        this.elements.btnSplit.addEventListener('click', () => this.handleAction('split'));
        this.elements.btnNextHand.addEventListener('click', () => this.dealNewHand());

        // Stats screen
        this.elements.btnBackStats.addEventListener('click', () => this.showScreen('menu'));
        this.elements.btnResetStats.addEventListener('click', () => this.resetStats());

        // Chart screen
        this.elements.btnBackChart.addEventListener('click', () => this.showScreen('menu'));
        this.elements.chartTabs.forEach(tab => {
            tab.addEventListener('click', (e) => this.switchChart(e.target.dataset.chart));
        });
    },

    /**
     * Show a screen
     */
    showScreen(screenName) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Show requested screen
        const screen = document.getElementById(`${screenName}-screen`);
        if (screen) {
            screen.classList.add('active');
            this.currentScreen = screenName;
        }

        // Update screen-specific content
        if (screenName === 'stats') {
            this.updateStatsDisplay();
        } else if (screenName === 'chart') {
            this.renderChart(this.currentChartType);
        }
    },

    /**
     * Start the game
     */
    startGame(mode) {
        Game.setMode(mode);
        Stats.resetSession();
        this.showScreen('game');
        this.updateModeLabel();
        this.dealNewHand();
    },

    /**
     * Exit game and return to menu
     */
    exitGame() {
        this.showScreen('menu');
    },

    /**
     * Toggle between learning and test mode
     */
    toggleMode() {
        const newMode = Game.state.mode === 'learning' ? 'test' : 'learning';
        Game.setMode(newMode);
        this.updateModeLabel();
        this.updateUI();
    },

    /**
     * Update mode label display
     */
    updateModeLabel() {
        this.elements.modeLabel.textContent =
            Game.state.mode === 'learning' ? 'Learning Mode' : 'Test Mode';
    },

    /**
     * Deal a new hand
     */
    dealNewHand() {
        const result = Game.dealNewHand();

        this.updateUI();
        this.hideNextHandSection();

        if (result) {
            // Immediate blackjack/push
            this.showHandResult(result);
        }
    },

    /**
     * Handle player action
     */
    handleAction(action) {
        if (!Game.state.awaitingDecision) return;

        const gameState = Game.getState();

        // Check if action is allowed
        if (action === 'double' && !gameState.canDouble) return;
        if (action === 'split' && !gameState.canSplit) return;

        // Check if action is optimal
        const checkResult = Game.checkAction(action);

        // Record stats
        Stats.recordDecision(
            checkResult.correct,
            checkResult.handType,
            checkResult.situation,
            checkResult.playerAction,
            checkResult.optimalAction
        );

        // Show feedback in test mode
        if (Game.state.mode === 'test') {
            this.showFeedback(checkResult);
        }

        // Execute the action
        Game.state.awaitingDecision = false;
        let actionResult;

        switch (action) {
            case 'hit':
                actionResult = Game.hit();
                break;
            case 'stand':
                actionResult = Game.stand();
                break;
            case 'double':
                actionResult = Game.double();
                break;
            case 'split':
                actionResult = Game.split();
                break;
        }

        this.updateUI();
        this.updateSessionStats();

        // Handle action results
        if (actionResult) {
            if (actionResult.busted || actionResult.result) {
                this.showHandResult(actionResult.result || actionResult);
            } else if (actionResult.split) {
                // Continue playing after split
                Game.state.awaitingDecision = true;
                this.updateUI();
            }
        }

        // If hand continues, allow next decision
        if (!Game.state.handComplete && (action === 'hit' || action === 'split')) {
            Game.state.awaitingDecision = true;
            this.updateUI();
        }
    },

    /**
     * Update the entire UI
     */
    updateUI() {
        const state = Game.getState();

        // Render hands
        this.renderHand(this.elements.dealerHand, state.dealerHand);
        this.renderHand(this.elements.playerHand, state.playerHand);

        // Update totals
        this.elements.dealerTotal.textContent = this.formatTotal(state.dealerInfo);
        this.elements.playerTotal.textContent = this.formatTotal(state.playerInfo);

        // Update action buttons
        this.elements.btnDouble.disabled = !state.canDouble;
        this.elements.btnSplit.disabled = !state.canSplit;

        // Show/hide strategy section based on mode
        if (state.mode === 'learning' && state.awaitingDecision && state.optimalPlay) {
            this.showStrategy(state.optimalPlay);
        } else {
            this.hideStrategy();
        }

        // Show/hide action buttons based on game phase
        if (state.handComplete) {
            this.elements.actionButtons.classList.add('hidden');
        } else {
            this.elements.actionButtons.classList.remove('hidden');
        }
    },

    /**
     * Render a hand of cards
     */
    renderHand(container, cards) {
        container.innerHTML = '';
        cards.forEach(card => {
            const cardEl = this.createCardElement(card);
            container.appendChild(cardEl);
        });
    },

    /**
     * Create a card DOM element
     */
    createCardElement(card) {
        const div = document.createElement('div');
        div.className = 'card';

        if (card.faceUp === false) {
            div.classList.add('face-down');
        } else {
            div.classList.add('face-up');
            if (card.suit === '♥' || card.suit === '♦') {
                div.classList.add('red');
            }

            div.innerHTML = `
                <span class="card-value">${card.rank}${card.suit}</span>
                <span class="card-suit">${card.suit}</span>
                <span class="card-value-bottom">${card.rank}${card.suit}</span>
            `;
        }

        return div;
    },

    /**
     * Format hand total for display
     */
    formatTotal(handInfo) {
        if (handInfo.cards.some(c => c.faceUp === false)) {
            // Has hidden card
            const visibleCards = handInfo.cards.filter(c => c.faceUp !== false);
            let visibleTotal = visibleCards.reduce((sum, c) => sum + c.value, 0);
            return visibleTotal;
        }

        if (handInfo.isSoft && handInfo.total <= 21) {
            const altTotal = handInfo.total - 10;
            return `${altTotal}/${handInfo.total}`;
        }

        return handInfo.total;
    },

    /**
     * Show strategy hint
     */
    showStrategy(optimalPlay) {
        this.elements.strategySection.classList.remove('hidden');
        this.elements.strategyAction.textContent = optimalPlay.action;
        this.elements.strategyExplanation.textContent = optimalPlay.explanation;
    },

    /**
     * Hide strategy hint
     */
    hideStrategy() {
        this.elements.strategySection.classList.add('hidden');
    },

    /**
     * Show feedback after action (test mode)
     */
    showFeedback(result) {
        const feedbackCard = this.elements.feedbackSection.querySelector('.feedback-card');
        const feedbackIcon = feedbackCard.querySelector('.feedback-icon');
        const feedbackText = feedbackCard.querySelector('.feedback-text');

        feedbackCard.className = 'feedback-card ' + (result.correct ? 'correct' : 'incorrect');
        feedbackIcon.textContent = result.correct ? '✓' : '✗';

        if (result.correct) {
            feedbackText.textContent = 'Correct!';
        } else {
            feedbackText.textContent = `Should ${result.optimalAction}. ${result.explanation}`;
        }

        this.elements.feedbackSection.classList.remove('hidden');

        // Auto-hide after delay
        setTimeout(() => {
            this.elements.feedbackSection.classList.add('hidden');
        }, result.correct ? 1000 : 3000);
    },

    /**
     * Show hand result
     */
    showHandResult(result) {
        this.elements.handResult.textContent = result.message;
        this.elements.handResult.className = 'hand-result ' + result.result;
        this.elements.nextHandSection.classList.remove('hidden');
        this.elements.actionButtons.classList.add('hidden');
    },

    /**
     * Hide next hand section
     */
    hideNextHandSection() {
        this.elements.nextHandSection.classList.add('hidden');
        this.elements.feedbackSection.classList.add('hidden');
    },

    /**
     * Update session stats display
     */
    updateSessionStats() {
        const sessionStats = Stats.getSessionStats();
        this.elements.statCorrect.textContent = sessionStats.correct;
        this.elements.statIncorrect.textContent = sessionStats.incorrect;
        this.elements.statAccuracy.textContent = sessionStats.accuracy + '%';
    },

    /**
     * Update stats screen display
     */
    updateStatsDisplay() {
        const stats = Stats.getOverallStats();

        this.elements.overallAccuracy.textContent = stats.accuracy + '%';
        this.elements.totalHands.textContent = stats.totalHands;
        this.elements.totalCorrect.textContent = stats.correctDecisions;

        // Update accuracy bars
        this.elements.hardBar.style.width = stats.hardAccuracy + '%';
        this.elements.softBar.style.width = stats.softAccuracy + '%';
        this.elements.pairsBar.style.width = stats.pairsAccuracy + '%';

        this.elements.hardAccuracy.textContent = stats.hardAccuracy + '%';
        this.elements.softAccuracy.textContent = stats.softAccuracy + '%';
        this.elements.pairsAccuracy.textContent = stats.pairsAccuracy + '%';

        // Update missed situations
        if (stats.missedSituations.length > 0) {
            this.elements.missedList.innerHTML = stats.missedSituations
                .map(item => `
                    <div class="missed-item">
                        <span class="missed-situation">${item.situation} → ${item.correctAction}</span>
                        <span class="missed-count">×${item.count}</span>
                    </div>
                `).join('');
        } else {
            this.elements.missedList.innerHTML = '<p class="no-data">Play more hands to see trouble spots</p>';
        }
    },

    /**
     * Reset all statistics
     */
    resetStats() {
        if (confirm('Reset all statistics? This cannot be undone.')) {
            Stats.resetAll();
            this.updateStatsDisplay();
        }
    },

    /**
     * Switch strategy chart tab
     */
    switchChart(chartType) {
        this.currentChartType = chartType;

        // Update tabs
        this.elements.chartTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.chart === chartType);
        });

        this.renderChart(chartType);
    },

    /**
     * Render strategy chart
     */
    renderChart(chartType) {
        const chartData = BasicStrategy.getChartData(chartType);
        if (!chartData) return;

        let html = '<table class="chart-table">';

        // Header row
        html += '<tr>';
        chartData.headers.forEach(h => {
            html += `<th>${h}</th>`;
        });
        html += '</tr>';

        // Data rows
        chartData.rows.forEach(row => {
            html += '<tr>';
            html += `<td class="row-header">${row.label}</td>`;
            row.data.forEach(action => {
                const actionClass = this.getActionClass(action);
                const displayAction = action === 'Ds' ? 'D/S' : action;
                html += `<td class="${actionClass}">${displayAction}</td>`;
            });
            html += '</tr>';
        });

        html += '</table>';
        this.elements.chartDisplay.innerHTML = html;
    },

    /**
     * Get CSS class for action
     */
    getActionClass(action) {
        const classes = {
            'H': 'hit',
            'S': 'stand',
            'D': 'double',
            'Ds': 'double',
            'P': 'split'
        };
        return classes[action] || '';
    }
};

// Initialize UI when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    UI.init();
});

// Make it available globally
window.UI = UI;
