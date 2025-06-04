class Game {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('game-container').appendChild(this.renderer.domElement);

    this.players = new Map();
    this.playerLabels = new Map();
    this.keys = {};
    this.localPlayerId = null;

    this.setupScene();
    this.setupLights();
    this.setupEventListeners();
  }

  setupScene() {
    // Create ground plane
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x333333,
      side: THREE.DoubleSide
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);

    // Position camera
    this.camera.position.set(0, 20, 0);
    this.camera.lookAt(0, 0, 0);
  }

  setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(10, 20, 10);
    this.scene.add(directionalLight);
  }

  setupEventListeners() {
    window.addEventListener('keydown', (e) => {
      if (e.key) {
        this.keys[e.key.toLowerCase()] = true;
      }
    });
    window.addEventListener('keyup', (e) => {
      if (e.key) {
        this.keys[e.key.toLowerCase()] = false;
      }
    });
    window.addEventListener('resize', () => this.onWindowResize());
  }

  createPlayerLabel(name) {
    const labelDiv = document.createElement('div');
    labelDiv.className = 'player-label';
    labelDiv.textContent = name;
    labelDiv.style.position = 'absolute';
    labelDiv.style.color = 'white';
    labelDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    labelDiv.style.padding = '2px 6px';
    labelDiv.style.borderRadius = '4px';
    labelDiv.style.fontSize = '12px';
    labelDiv.style.fontFamily = 'Arial, sans-serif';
    labelDiv.style.pointerEvents = 'none';
    labelDiv.style.userSelect = 'none';
    document.body.appendChild(labelDiv);
    return labelDiv;
  }

  updatePlayerLabels() {
    this.playerLabels.forEach((label, playerId) => {
      const player = this.players.get(playerId);
      if (player) {
        const vector = player.position.clone();
        vector.project(this.camera);
        
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
        
        label.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
        label.style.display = vector.z < 1 ? 'block' : 'none';
      }
    });
  }

  addPlayer(id, playerData) {
    console.log('Adding player:', id, playerData);
    const geometry = new THREE.CircleGeometry(0.5, 32);
    const material = new THREE.MeshBasicMaterial({ 
      color: playerData.color,
      side: THREE.DoubleSide
    });
    const player = new THREE.Mesh(geometry, material);
    player.rotation.x = -Math.PI / 2;
    player.position.y = 0.01;
    player.userData.name = playerData.name;
    this.scene.add(player);
    this.players.set(id, player);

    // Create and store the player label
    const label = this.createPlayerLabel(playerData.name);
    this.playerLabels.set(id, label);

    this.updatePlayerCount();
  }

  removePlayer(id) {
    const player = this.players.get(id);
    if (player) {
      this.scene.remove(player);
      this.players.delete(id);
      
      // Remove the player label
      const label = this.playerLabels.get(id);
      if (label) {
        document.body.removeChild(label);
        this.playerLabels.delete(id);
      }
      
      this.updatePlayerCount();
    }
  }

  updatePlayerCount() {
    const count = this.players.size;
    document.getElementById('player-count').textContent = `Players: ${count}/3`;
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  updatePlayerMovement() {
    const player = this.players.get(this.localPlayerId);
    if (!player) {
      console.log('No local player found with ID:', this.localPlayerId);
      return;
    }

    const speed = 0.1;
    const moveX = (this.keys['d'] ? 1 : 0) - (this.keys['a'] ? 1 : 0);
    const moveZ = (this.keys['s'] ? 1 : 0) - (this.keys['w'] ? 1 : 0);

    if (moveX !== 0 || moveZ !== 0) {
      player.position.x += moveX * speed;
      player.position.z += moveZ * speed;

      // Broadcast position to other players
      if (window.network) {
        window.network.sendToAll({
          type: 'position',
          position: {
            x: player.position.x,
            y: player.position.y,
            z: player.position.z
          }
        });
      }
    }
  }

  updatePlayerPosition(playerId, position) {
    const player = this.players.get(playerId);
    if (player) {
      player.position.set(position.x, position.y, position.z);
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.updatePlayerMovement();
    this.updatePlayerLabels();
    this.renderer.render(this.scene, this.camera);
  }

  start() {
    console.log('Starting game with local player ID:', this.localPlayerId);
    this.animate();
  }

  setLocalPlayerId(id) {
    console.log('Setting local player ID:', id);
    this.localPlayerId = id;
  }
}

// Make it globally available
window.Game = Game; 