class App {
  constructor() {
    this.game = new Game();
    this.network = new NetworkManager();
    // Make network instance globally accessible
    window.network = this.network;
    this.setupEventListeners();
    this.setupNetworkCallbacks();
  }

  setupEventListeners() {
    const hostBtn = document.getElementById('host-btn');
    const joinBtn = document.getElementById('join-btn');
    const playerNameInput = document.getElementById('player-name');
    const joinCodeInput = document.getElementById('join-code');
    const colorOptions = document.querySelectorAll('.color-option');

    console.log('Setting up event listeners...');
    console.log('Host button:', hostBtn);
    console.log('Join button:', joinBtn);

    let selectedColor = '#ff0000';
    colorOptions.forEach(option => {
      option.addEventListener('click', () => {
        colorOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        selectedColor = option.dataset.color;
      });
    });

    hostBtn.addEventListener('click', () => {
      console.log('Host button clicked');
      console.log('Player name:', playerNameInput.value);
      console.log('Selected color:', selectedColor);
      this.hostGame(playerNameInput.value, selectedColor);
    });

    joinBtn.addEventListener('click', () => {
      console.log('Join button clicked');
      console.log('Room code:', joinCodeInput.value);
      console.log('Player name:', playerNameInput.value);
      console.log('Selected color:', selectedColor);
      this.joinGame(joinCodeInput.value, playerNameInput.value, selectedColor);
    });
  }

  setupNetworkCallbacks() {
    this.network.onPlayerJoined = (playerId, playerData) => {
      console.log('Player joined:', playerId, playerData);
      this.game.addPlayer(playerId, playerData);
    };

    this.network.onPlayerLeft = (playerId) => {
      console.log('Player left:', playerId);
      this.game.removePlayer(playerId);
    };

    this.network.onConnectionStatusChanged = (status) => {
      console.log('Connection status changed:', status);
    };

    this.network.onPositionUpdate = (playerId, position) => {
      console.log('Position update from player:', playerId, position);
      this.game.updatePlayerPosition(playerId, position);
    };
  }

  async hostGame(playerName, color) {
    console.log('hostGame called with:', { playerName, color });
    if (!playerName) {
      alert('Please enter your name');
      return;
    }

    try {
      console.log('Attempting to host game...');
      const roomCode = await this.network.hostGame();
      console.log('Game hosted successfully with room code:', roomCode);
      this.network.playerData = { name: playerName, color };
      
      document.getElementById('ui-container').classList.add('hidden');
      document.getElementById('game-ui').classList.remove('hidden');
      document.getElementById('room-code').textContent = `Room Code: ${roomCode}`;
      
      this.game.addPlayer(this.network.peer.id, { name: playerName, color });
      this.game.setLocalPlayerId(this.network.peer.id);
      this.game.start();
    } catch (error) {
      console.error('Failed to host game:', error);
      alert('Failed to host game. Please try again.');
    }
  }

  async joinGame(roomCode, playerName, color) {
    if (!roomCode || !playerName) {
      alert('Please enter both room code and your name');
      return;
    }

    try {
      await this.network.joinGame(roomCode, { name: playerName, color });
      
      document.getElementById('ui-container').classList.add('hidden');
      document.getElementById('game-ui').classList.remove('hidden');
      document.getElementById('room-code').textContent = `Room Code: ${roomCode}`;
      
      this.game.addPlayer(this.network.peer.id, { name: playerName, color });
      this.game.setLocalPlayerId(this.network.peer.id);
      this.game.start();
    } catch (error) {
      console.error('Failed to join game:', error);
      alert('Failed to join game. Please check the room code and try again.');
    }
  }
}

// Initialize the app when the page loads
window.addEventListener('DOMContentLoaded', () => {
  new App();
}); 