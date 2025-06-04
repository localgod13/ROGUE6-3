class NetworkManager {
  constructor() {
    this.peer = null;
    this.connections = new Map();
    this.playerData = null;
    this.onPlayerJoined = null;
    this.onPlayerLeft = null;
    this.onConnectionStatusChanged = null;
    this.onPositionUpdate = null;
  }

  generateRoomCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  updateConnectionStatus(status) {
    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
      statusElement.textContent = status;
      statusElement.className = status === 'Connected' ? 'status-connected' : 'status-disconnected';
    }
    if (this.onConnectionStatusChanged) {
      this.onConnectionStatusChanged(status);
    }
  }

  hostGame() {
    return new Promise((resolve, reject) => {
      try {
        const roomCode = this.generateRoomCode();
        this.peer = new Peer(roomCode, {
          host: '0.peerjs.com',
          port: 443,
          path: '/',
          secure: true,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
              { urls: 'stun:stun3.l.google.com:19302' },
              { urls: 'stun:stun4.l.google.com:19302' }
            ]
          }
        });

        this.peer.on('open', (id) => {
          console.log('Host peer opened with ID:', id);
          this.updateConnectionStatus('Connected');
          resolve(roomCode);
        });

        this.peer.on('error', (err) => {
          console.error('Peer error:', err);
          this.updateConnectionStatus('Error: ' + (err.type || err.message));
          reject(err);
        });

        this.setupHostListeners();
      } catch (error) {
        console.error('Error creating peer:', error);
        this.updateConnectionStatus('Error: Failed to create peer');
        reject(error);
      }
    });
  }

  joinGame(roomCode, playerData) {
    return new Promise((resolve, reject) => {
      try {
        this.peer = new Peer({
          host: '0.peerjs.com',
          port: 443,
          path: '/',
          secure: true,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
              { urls: 'stun:stun3.l.google.com:19302' },
              { urls: 'stun:stun4.l.google.com:19302' }
            ]
          }
        });

        this.peer.on('open', (id) => {
          console.log('Joining peer opened with ID:', id);
          this.updateConnectionStatus('Connecting...');
          
          const conn = this.peer.connect(roomCode);
          this.connections.set(roomCode, conn);

          conn.on('open', () => {
            console.log('Connected to host');
            this.updateConnectionStatus('Connected');
            conn.send({ type: 'join', playerData });
            resolve(conn);
          });

          conn.on('error', (err) => {
            console.error('Connection error:', err);
            this.updateConnectionStatus('Error: Connection failed');
            reject(err);
          });

          conn.on('close', () => {
            console.log('Connection to host closed');
            this.updateConnectionStatus('Disconnected');
            this.connections.delete(roomCode);
            if (this.onPlayerLeft) {
              this.onPlayerLeft(roomCode);
            }
          });

          conn.on('data', (data) => {
            console.log('Received data from host:', data);
            if (data.type === 'playerData' && this.onPlayerJoined) {
              this.onPlayerJoined(data.playerId, data.playerData);
            } else if (data.type === 'position' && this.onPositionUpdate) {
              this.onPositionUpdate(roomCode, data.position);
            }
          });
        });

        this.peer.on('error', (err) => {
          console.error('Peer error:', err);
          this.updateConnectionStatus('Error: ' + (err.type || err.message));
          reject(err);
        });
      } catch (error) {
        console.error('Error creating peer:', error);
        this.updateConnectionStatus('Error: Failed to create peer');
        reject(error);
      }
    });
  }

  setupHostListeners() {
    this.peer.on('connection', (conn) => {
      console.log('New connection from:', conn.peer);
      this.connections.set(conn.peer, conn);

      conn.on('open', () => {
        console.log('Connection opened with:', conn.peer);
        // Send host's player data to the new connection
        if (this.playerData) {
          conn.send({
            type: 'playerData',
            playerId: this.peer.id,
            playerData: this.playerData
          });
        }
      });

      conn.on('data', (data) => {
        console.log('Received data from', conn.peer, ':', data);
        if (data.type === 'join' && data.playerData) {
          if (this.onPlayerJoined) {
            this.onPlayerJoined(conn.peer, data.playerData);
          }
        } else if (data.type === 'position' && this.onPositionUpdate) {
          this.onPositionUpdate(conn.peer, data.position);
        }
      });

      conn.on('close', () => {
        console.log('Connection closed with:', conn.peer);
        this.connections.delete(conn.peer);
        if (this.onPlayerLeft) {
          this.onPlayerLeft(conn.peer);
        }
      });
    });
  }

  sendToAll(data) {
    this.connections.forEach((conn) => {
      if (conn.open) {
        conn.send(data);
      }
    });
  }

  disconnect() {
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.connections.clear();
    this.updateConnectionStatus('Disconnected');
  }
}

window.NetworkManager = NetworkManager; 