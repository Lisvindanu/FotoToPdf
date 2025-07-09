class PokerGame {
    constructor() {
        this.deck = [];
        this.playerCards = [];
        this.botCards = [];
        this.communityCards = [];
        this.playerChips = 1000;
        this.botChips = 1000;
        this.pot = 0;
        this.currentBet = 0;
        this.playerBet = 0;
        this.botBet = 0;
        this.gamePhase = 'preflop'; // preflop, flop, turn, river, showdown
        this.gameOver = false;
        
        this.initializeElements();
        this.initializeEventListeners();
        this.newGame();
    }

    initializeElements() {
        this.playerChipsEl = document.getElementById('player-chips');
        this.botChipsEl = document.getElementById('bot-chips');
        this.potEl = document.getElementById('pot-amount');
        this.playerCardsContainer = document.getElementById('player-cards-container');
        this.botCardsContainer = document.getElementById('bot-cards-container');
        this.communityCardsContainer = document.getElementById('community-cards-container');
        this.gameMessageEl = document.getElementById('game-message');
        this.betSlider = document.getElementById('bet-slider');
        this.betAmountEl = document.getElementById('bet-amount');
        this.foldBtn = document.getElementById('fold-btn');
        this.callBtn = document.getElementById('call-btn');
        this.raiseBtn = document.getElementById('raise-btn');
        this.newGameBtn = document.getElementById('new-game-btn');
    }

    initializeEventListeners() {
        this.betSlider.addEventListener('input', () => {
            this.betAmountEl.textContent = this.betSlider.value;
        });

        this.foldBtn.addEventListener('click', () => this.playerFold());
        this.callBtn.addEventListener('click', () => this.playerCall());
        this.raiseBtn.addEventListener('click', () => this.playerRaise());
        this.newGameBtn.addEventListener('click', () => this.newGame());
    }

    createDeck() {
        const suits = ['♠', '♥', '♦', '♣'];
        const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        this.deck = [];
        
        for (const suit of suits) {
            for (const rank of ranks) {
                this.deck.push({ suit, rank, value: this.getCardValue(rank) });
            }
        }
        
        // Shuffle deck
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    getCardValue(rank) {
        if (rank === 'A') return 14;
        if (rank === 'K') return 13;
        if (rank === 'Q') return 12;
        if (rank === 'J') return 11;
        return parseInt(rank);
    }

    dealCard() {
        return this.deck.pop();
    }

    newGame() {
        this.createDeck();
        this.playerCards = [this.dealCard(), this.dealCard()];
        this.botCards = [this.dealCard(), this.dealCard()];
        this.communityCards = [];
        this.pot = 0;
        this.currentBet = 10; // Small blind
        this.playerBet = 5; // Small blind
        this.botBet = 10; // Big blind
        this.gamePhase = 'preflop';
        this.gameOver = false;
        
        this.playerChips -= 5;
        this.botChips -= 10;
        this.pot = 15;
        
        this.updateDisplay();
        this.renderCards();
        this.showMessage("Game dimulai! Anda small blind (5), Bot big blind (10)");
        this.enableActions();
    }

    updateDisplay() {
        this.playerChipsEl.textContent = this.playerChips;
        this.botChipsEl.textContent = this.botChips;
        this.potEl.textContent = this.pot;
        this.betSlider.max = Math.min(this.playerChips, 200);
    }

    renderCards() {
        // Render player cards
        this.playerCardsContainer.innerHTML = '';
        this.playerCards.forEach(card => {
            const cardEl = this.createCardElement(card);
            this.playerCardsContainer.appendChild(cardEl);
        });

        // Render bot cards (hidden during game)
        this.botCardsContainer.innerHTML = '';
        if (this.gameOver) {
            this.botCards.forEach(card => {
                const cardEl = this.createCardElement(card);
                this.botCardsContainer.appendChild(cardEl);
            });
        } else {
            for (let i = 0; i < 2; i++) {
                const cardBack = document.createElement('div');
                cardBack.className = 'card-back';
                cardBack.innerHTML = '<i class="fa-solid fa-question"></i>';
                this.botCardsContainer.appendChild(cardBack);
            }
        }

        // Render community cards
        this.communityCardsContainer.innerHTML = '';
        for (let i = 0; i < 5; i++) {
            if (i < this.communityCards.length) {
                const cardEl = this.createCardElement(this.communityCards[i]);
                this.communityCardsContainer.appendChild(cardEl);
            } else {
                const cardSlot = document.createElement('div');
                cardSlot.className = 'card-slot';
                this.communityCardsContainer.appendChild(cardSlot);
            }
        }
    }

    createCardElement(card) {
        const cardEl = document.createElement('div');
        cardEl.className = 'playing-card';
        const isRed = card.suit === '♥' || card.suit === '♦';
        cardEl.classList.add(isRed ? 'red' : 'black');
        cardEl.innerHTML = `
            <div class="card-rank">${card.rank}</div>
            <div class="card-suit">${card.suit}</div>
        `;
        return cardEl;
    }

    playerFold() {
        this.showMessage("Anda fold. Bot menang!");
        this.botChips += this.pot;
        this.pot = 0;
        this.gameOver = true;
        this.disableActions();
        this.renderCards();
        this.updateDisplay();
    }

    playerCall() {
        const callAmount = this.currentBet - this.playerBet;
        if (callAmount > this.playerChips) {
            this.showMessage("Chip tidak cukup!");
            return;
        }
        
        this.playerChips -= callAmount;
        this.playerBet += callAmount;
        this.pot += callAmount;
        
        this.showMessage(`Anda call ${callAmount}`);
        this.botAction();
    }

    playerRaise() {
        const raiseAmount = parseInt(this.betSlider.value);
        const totalBet = this.currentBet + raiseAmount;
        const needed = totalBet - this.playerBet;
        
        if (needed > this.playerChips) {
            this.showMessage("Chip tidak cukup untuk raise!");
            return;
        }
        
        this.playerChips -= needed;
        this.playerBet += needed;
        this.pot += needed;
        this.currentBet = totalBet;
        
        this.showMessage(`Anda raise ${raiseAmount} (total bet: ${totalBet})`);
        this.botAction();
    }

    botAction() {
        setTimeout(() => {
            const botHand = this.evaluateHand([...this.botCards, ...this.communityCards]);
            const decision = this.getBotDecision(botHand);
            
            if (decision === 'fold') {
                this.showMessage("Bot fold. Anda menang!");
                this.playerChips += this.pot;
                this.pot = 0;
                this.gameOver = true;
                this.disableActions();
            } else if (decision === 'call') {
                const callAmount = this.currentBet - this.botBet;
                this.botChips -= callAmount;
                this.botBet += callAmount;
                this.pot += callAmount;
                this.showMessage(`Bot call ${callAmount}`);
                this.nextPhase();
            } else if (decision === 'raise') {
                const raiseAmount = Math.min(50, this.botChips);
                const totalBet = this.currentBet + raiseAmount;
                const needed = totalBet - this.botBet;
                
                this.botChips -= needed;
                this.botBet += needed;
                this.pot += needed;
                this.currentBet = totalBet;
                this.showMessage(`Bot raise ${raiseAmount}`);
            }
            
            this.updateDisplay();
        }, 1000);
    }

    getBotDecision(handStrength) {
        const random = Math.random();
        
        if (handStrength < 0.3) {
            return random < 0.7 ? 'fold' : 'call';
        } else if (handStrength < 0.6) {
            return random < 0.1 ? 'fold' : (random < 0.8 ? 'call' : 'raise');
        } else {
            return random < 0.8 ? 'raise' : 'call';
        }
    }

    nextPhase() {
        if (this.gamePhase === 'preflop') {
            this.gamePhase = 'flop';
            this.communityCards.push(this.dealCard(), this.dealCard(), this.dealCard());
            this.showMessage("Flop!");
        } else if (this.gamePhase === 'flop') {
            this.gamePhase = 'turn';
            this.communityCards.push(this.dealCard());
            this.showMessage("Turn!");
        } else if (this.gamePhase === 'turn') {
            this.gamePhase = 'river';
            this.communityCards.push(this.dealCard());
            this.showMessage("River!");
        } else if (this.gamePhase === 'river') {
            this.showdown();
            return;
        }
        
        this.currentBet = 0;
        this.playerBet = 0;
        this.botBet = 0;
        this.renderCards();
        this.enableActions();
    }

    showdown() {
        this.gameOver = true;
        this.gamePhase = 'showdown';
        
        const playerHand = this.evaluateHand([...this.playerCards, ...this.communityCards]);
        const botHand = this.evaluateHand([...this.botCards, ...this.communityCards]);
        
        let winner;
        if (playerHand > botHand) {
            winner = 'player';
            this.playerChips += this.pot;
            this.showMessage(`Anda menang! Hand strength: ${playerHand.toFixed(2)} vs ${botHand.toFixed(2)}`);
        } else if (botHand > playerHand) {
            winner = 'bot';
            this.botChips += this.pot;
            this.showMessage(`Bot menang! Hand strength: ${botHand.toFixed(2)} vs ${playerHand.toFixed(2)}`);
        } else {
            this.playerChips += this.pot / 2;
            this.botChips += this.pot / 2;
            this.showMessage(`Seri! Hand strength sama: ${playerHand.toFixed(2)}`);
        }
        
        this.pot = 0;
        this.renderCards();
        this.disableActions();
        this.updateDisplay();
    }

    evaluateHand(cards) {
        // Simplified hand evaluation - just based on high cards and pairs
        cards.sort((a, b) => b.value - a.value);
        
        let score = 0;
        const ranks = cards.map(c => c.value);
        const suits = cards.map(c => c.suit);
        
        // Check for pairs, three of a kind, etc.
        const rankCounts = {};
        ranks.forEach(rank => {
            rankCounts[rank] = (rankCounts[rank] || 0) + 1;
        });
        
        const counts = Object.values(rankCounts).sort((a, b) => b - a);
        
        if (counts[0] === 4) score += 7; // Four of a kind
        else if (counts[0] === 3 && counts[1] === 2) score += 6; // Full house
        else if (counts[0] === 3) score += 3; // Three of a kind
        else if (counts[0] === 2 && counts[1] === 2) score += 2; // Two pair
        else if (counts[0] === 2) score += 1; // One pair
        
        // Add high card value
        score += ranks[0] / 100;
        
        return score;
    }

    enableActions() {
        this.foldBtn.disabled = false;
        this.callBtn.disabled = false;
        this.raiseBtn.disabled = false;
    }

    disableActions() {
        this.foldBtn.disabled = true;
        this.callBtn.disabled = true;
        this.raiseBtn.disabled = true;
    }

    showMessage(message) {
        this.gameMessageEl.textContent = message;
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for the poker view to be active before initializing
    const observer = new MutationObserver(() => {
        const pokerView = document.getElementById('poker-game-view');
        if (pokerView && pokerView.classList.contains('active')) {
            if (!window.pokerGame) {
                window.pokerGame = new PokerGame();
            }
        }
    });
    
    observer.observe(document.body, { 
        childList: true, 
        subtree: true, 
        attributes: true, 
        attributeFilter: ['class'] 
    });
});