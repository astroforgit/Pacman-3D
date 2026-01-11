// Constants
// =========
const PACMAN_SPEED = 2;
let GHOST_SPEED = 1.5;
const PACMAN_RADIUS = 0.25;
const GHOST_RADIUS = PACMAN_RADIUS * 1.25;
const DOT_RADIUS = 0.05;
const PELLET_RADIUS = DOT_RADIUS * 2;

const UP = new THREE.Vector3(0, 0, 1);
const LEFT = new THREE.Vector3(-1, 0, 0);
const TOP = new THREE.Vector3(0, 1, 0);
const RIGHT = new THREE.Vector3(1, 0, 0);
const BOTTOM = new THREE.Vector3(0, -1, 0);

// Game-specific functions
// =======================

const createMap = (scene, levelDefinition) => {
    const map = {};
    map.bottom = -(levelDefinition.length - 1);
    map.top = 0;
    map.left = 0;
    map.right = 0;
    map.numDots = 0;
    map.pacmanSpawn = null;
    map.ghostSpawn = null;

    let x, y;
    for (let row = 0; row < levelDefinition.length; row++) {
        // Set the coordinates of the map so that they match the coordinate system for objects.
        y = -row;

        map[y] = {};

        // Get the length of the longest row in the level definition.
        const length = Math.floor(levelDefinition[row].length / 2);
        map.right = Math.max(map.right, length);

        // Skip every second element, which is just a space for readability.
        for (let column = 0; column < levelDefinition[row].length; column += 2) {
            x = Math.floor(column / 2);

            const cell = levelDefinition[row][column];
            let object = null;

            if (cell === '#') {
                object = createWall();
            } else if (cell === '.') {
                object = createDot();
                map.numDots += 1;
            } else if (cell === 'o') {
                object = createPowerPellet();
            } else if (cell === 'P') {
                map.pacmanSpawn = new THREE.Vector3(x, y, 0);
            } else if (cell === 'G') {
                map.ghostSpawn = new THREE.Vector3(x, y, 0);
            }

            if (object !== null) {
                object.position.set(x, y, 0);
                map[y][x] = object;
                scene.add(object);
            }
        }
    }

    map.centerX = (map.left + map.right) / 2;
    map.centerY = (map.bottom + map.top) / 2;

    return map;
};

const getAt = (map, position) => {
    const x = Math.round(position.x);
    const y = Math.round(position.y);
    return map[y] && map[y][x];
};

const isWall = (map, position) => {
    const cell = getAt(map, position);
    return cell && cell.isWall === true;
};

const removeAt = (map, scene, position) => {
    const x = Math.round(position.x);
    const y = Math.round(position.y);
    if (map[y] && map[y][x]) {
        // Don't actually remove, just make invisible.
        map[y][x].visible = false;
    }
};

const createWall = (() => {
    const wallGeometry = new THREE.BoxGeometry(1, 1, 1);
    const wallMaterial = new THREE.MeshLambertMaterial({ color: 'blue' });

    return () => {
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.isWall = true;
        return wall;
    };
})();

const createDot = (() => {
    const dotGeometry = new THREE.SphereGeometry(DOT_RADIUS);
    const dotMaterial = new THREE.MeshPhongMaterial({ color: 0xFFDAB9 }); // Peach color

    return () => {
        const dot = new THREE.Mesh(dotGeometry, dotMaterial);
        dot.isDot = true;
        return dot;
    };
})();

const createPowerPellet = (() => {
    const pelletGeometry = new THREE.SphereGeometry(PELLET_RADIUS, 12, 8);
    const pelletMaterial = new THREE.MeshPhongMaterial({ color: 0xFFDAB9 }); // Peach color

    return () => {
        const pellet = new THREE.Mesh(pelletGeometry, pelletMaterial);
        pellet.isPowerPellet = true;
        return pellet;
    };
})();

const createRenderer = () => {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor('black', 1.0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    return renderer;
};

const createScene = () => {
    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0x888888));
    const light = new THREE.SpotLight('white', 0.5);
    light.position.set(0, 0, 50);
    scene.add(light);
    return scene;
};

const createHudCamera = (map) => {
    return;
};

class Pacman {
    constructor(scene, position) {
        this.frames = [];
        const numFrames = 40;
        for (let i = 0; i < numFrames; i++) {
            const offset = (i / (numFrames - 1)) * Math.PI;
            const geometry = new THREE.SphereGeometry(PACMAN_RADIUS, 16, 16, offset, Math.PI * 2 - offset * 2);
            geometry.rotateX(Math.PI / 2);
            this.frames.push(geometry);
        } 

        const pacmanMaterial = new THREE.MeshPhongMaterial({ color: 'yellow', side: THREE.DoubleSide });
        this.mesh = new THREE.Mesh(this.frames[0], pacmanMaterial);
        this.currentFrame = 0;

        this.mesh.isPacman = true;
        this.mesh.isWrapper = true;
        this.mesh.atePellet = false;
        this.mesh.distanceMoved = 0;

        this.mesh.position.copy(position);
        this.direction = new THREE.Vector3(-1, 0, 0);

        scene.add(this.mesh);
    }
}

const createGhost = (() => {
    const ghostGeometry = new THREE.SphereGeometry(GHOST_RADIUS, 16, 16);
    return (scene, position) => {
        const ghostMaterial = new THREE.MeshPhongMaterial({ color: 'red' });
        const ghost = new THREE.Mesh(ghostGeometry, ghostMaterial);
        ghost.isGhost = true;
        ghost.isWrapper = true;
        ghost.isAfraid = false;
        ghost.becameAfraidTime = 0;

        ghost.position.copy(position);
        ghost.direction = new THREE.Vector3(-1, 0, 0);

        scene.add(ghost);
        return ghost;
    };
})();

const wrapObject = (object, map) => {
    if (object.position.x < map.left) object.position.x = map.right;
    else if (object.position.x > map.right) object.position.x = map.left;

    if (object.position.y > map.top) object.position.y = map.bottom;
    else if (object.position.y < map.bottom) object.position.y = map.top;
};

const distanceBetween = (() => {  
    const difference = new THREE.Vector3();
    return (object1, object2) => {
        difference.copy(object1.position).sub(object2.position);
        return difference.length();
    };
})();

const createKeyState = () => {
    const keyState = {};
    document.body.addEventListener('keydown', (event) => {
        keyState[event.keyCode] = true;
        keyState[event.key.toUpperCase()] = true;
    });
    document.body.addEventListener('keyup', (event) => {
        keyState[event.keyCode] = false;
        keyState[event.key.toUpperCase()] = false;
    });
    document.body.addEventListener('blur', () => {
        for (const key in keyState) {
            if (keyState.hasOwnProperty(key)) keyState[key] = false;
        }
    });
    return keyState;
};

const animationLoop = (callback, requestFrameFunction = requestAnimationFrame) => {
    let previousFrameTime = window.performance.now();
    let animationSeconds = 0;

    const render = () => {
        const now = window.performance.now();
        let animationDelta = (now - previousFrameTime) / 1000;
        previousFrameTime = now;
        animationDelta = Math.min(animationDelta, 1 / 30);
        animationSeconds += animationDelta;
        callback(animationDelta, animationSeconds);
        requestFrameFunction(render);
    };
    requestFrameFunction(render);
};

// 4D Maze Integration Helpers
// ===========================

const convertMazeToLevel = (maze, w, z) => {
    const level = [];
    const width = maze.width;
    const height = maze.height;
    
    // Top border
    let topRow = '';
    for (let x = 0; x < width * 2 + 1; x++) topRow += '# '; 
    level.push(topRow.trim());

    for (let y = 0; y < height; y++) {
        let rowStr = '# '; // Left border
        for (let x = 0; x < width; x++) {
            const cell = maze.grid[w][z][y][x];
            
            // Cell contents
            if (x===0 && y===0 && z===0 && w===0) rowStr += 'P '; // Spawn at 0,0,0,0
            else if (x===width-1 && y===height-1) rowStr += 'G ';
            else rowStr += '. '; 
            
            // Wall right
            if (cell.walls.x_pos) rowStr += '# ';
            else rowStr += '. '; 
        }
        level.push(rowStr.trim());

        let wallRow = '# '; // Left border
        for (let x = 0; x < width; x++) {
            const cell = maze.grid[w][z][y][x];
            // Wall below
            if (cell.walls.y_pos) wallRow += '# ';
            else wallRow += '. ';
            
            wallRow += '# '; // Corner
        }
        level.push(wallRow.trim());
    }
    return level;
};

const createIndicator = (color) => {
    const geo = new THREE.PlaneGeometry(0.6, 0.6);
    const mat = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.isIndicator = true;
    return mesh;
};

// Main function
// =============
const main = () => {
    const keys = createKeyState();
    const renderer = createRenderer();
    const scene = createScene();
    
    // Initialize 4D Maze
    const mazeWidth = 8, mazeHeight = 8, mazeDepth = 4, mazeWDepth = 4;
    const maze = new Maze4D(mazeWidth, mazeHeight, mazeDepth, mazeWDepth);
    maze.generate();

    let currentW = 0;
    let currentZ = 0;
    let map = null;
    let levelGroup = new THREE.Group();
    scene.add(levelGroup);

    let pacman = null;
    const remove = [];
    let numDotsEaten = 0;

    // Load Level Function
    const loadLevel = (w, z) => {
        // Clear previous level objects
        while (levelGroup.children.length > 0) {
            levelGroup.remove(levelGroup.children[0]);
        }
        
        // Generate Level String
        const levelDef = convertMazeToLevel(maze, w, z);
        
        // Create Map Objects
        map = createMap(levelGroup, levelDef);
        
        // Add Indicators
        for (let y = 0; y < mazeHeight; y++) {
            for (let x = 0; x < mazeWidth; x++) {
                const cell = maze.grid[w][z][y][x];
                
                // Calculate World Position
                // x_world = 2*x + 1, y_world = -(2*y + 1)
                const wx = x * 2 + 1;
                const wy = -(y * 2 + 1);
                
                // Z Indicators
                if (!cell.walls.z_pos) { // Can go UP
                    const ind = createIndicator(0x00FF00); // Green
                    ind.position.set(wx, wy, -0.4);
                    levelGroup.add(ind);
                }
                if (!cell.walls.z_neg) { // Can go DOWN
                    const ind = createIndicator(0xFF0000); // Red
                    ind.position.set(wx, wy, -0.4);
                    levelGroup.add(ind);
                }

                // W Indicators (Offset slightly or diff shape?)
                if (!cell.walls.w_pos) { // Future
                    const ind = createIndicator(0x0000FF); // Blue
                    ind.position.set(wx, wy, -0.35);
                    ind.scale.set(0.5, 0.5, 1);
                    levelGroup.add(ind);
                }
                if (!cell.walls.w_neg) { // Past
                    const ind = createIndicator(0xFFFF00); // Yellow
                    ind.position.set(wx, wy, -0.35);
                    ind.scale.set(0.5, 0.5, 1);
                    levelGroup.add(ind);
                }
            }
        }
        
        // Handle Pacman Spawn if not initialized
        if (!pacman && map.pacmanSpawn) {
            pacman = new Pacman(scene, map.pacmanSpawn);
        }
    };

    // Initial Load
    loadLevel(currentW, currentZ);

    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.up.copy(UP);
    camera.targetPosition = new THREE.Vector3();
    camera.targetLookAt = new THREE.Vector3();
    camera.lookAtPosition = new THREE.Vector3();

    let ghostSpawnTime = -8;
    let numGhosts = 0;
    let won = false;
    let lost = false;
    let lostTime, wonTime;
    let lives = 3;

    // Create life images
    const livesContainer = document.getElementById('lives');
    livesContainer.innerHTML = '';
    for (let i = 0; i < lives; i++) {
        const life = document.createElement('img');
        life.src = 'pacman.png';
        life.className = 'life';
        livesContainer.appendChild(life);
    }

    const showText = (message, size, now) => {
        const textMaterial = new THREE.MeshPhongMaterial({ color: 'red' });
        const textGeometry = new THREE.TextGeometry(message, { size: size, height: 0.05, font: 'Helvetiker' });
        const text = new THREE.Mesh(textGeometry, textMaterial);
        text.position.copy(pacman.mesh.position).add(UP);
        text.up.copy(pacman.direction);
        text.lookAt(text.position.clone().add(UP));
        text.isTemporary = true;
        text.removeAfter = now + 3;
        scene.add(text);
        return text;
    };

    const updatePacman = (delta, now) => {
        if (!won && !lost) {
            movePacman(delta);
        }

        // Logic for dimension switching
        // Check if center of cell
        const wx = Math.round(pacman.mesh.position.x);
        const wy = Math.round(pacman.mesh.position.y);
        
        // Convert world to maze coords
        // wx = 2*x + 1 => x = (wx - 1) / 2
        // wy = -(2*y + 1) => y = (-wy - 1) / 2
        
        const mx = (wx - 1) / 2;
        const my = (-wy - 1) / 2;

        if (Number.isInteger(mx) && Number.isInteger(my) && 
            mx >= 0 && mx < mazeWidth && my >= 0 && my < mazeHeight) {
            
            const cell = maze.grid[currentW][currentZ][my][mx];
            const dist = pacman.mesh.position.distanceTo(new THREE.Vector3(wx, wy, 0));
            
            if (dist < 0.2) { // Close to center
                let changed = false;
                if (keys['E'] && !cell.walls.z_pos) {
                    if (currentZ < mazeDepth - 1) { currentZ++; changed = true; }
                } else if (keys['Q'] && !cell.walls.z_neg) {
                    if (currentZ > 0) { currentZ--; changed = true; }
                } else if (keys['F'] && !cell.walls.w_pos) {
                    if (currentW < mazeWDepth - 1) { currentW++; changed = true; }
                } else if (keys['R'] && !cell.walls.w_neg) {
                    if (currentW > 0) { currentW--; changed = true; }
                }

                if (changed) {
                    loadLevel(currentW, currentZ);
                    // Snap to center to avoid getting stuck in wall in new dimension
                    pacman.mesh.position.set(wx, wy, 0); 
                    // Clear keys to prevent rapid switching
                    keys['E'] = false; keys['Q'] = false; keys['F'] = false; keys['R'] = false;
                    
                    showText(`W:${currentW} Z:${currentZ}`, 0.5, now);
                }
            }
        }
    };

    const movePacman = (delta) => {
        pacman.mesh.up.copy(pacman.direction).applyAxisAngle(UP, -Math.PI / 2);
        pacman.mesh.lookAt(pacman.mesh.position.clone().add(UP));

        if (keys['W']) {
            pacman.mesh.translateOnAxis(LEFT, PACMAN_SPEED * delta);
            pacman.mesh.distanceMoved += PACMAN_SPEED * delta;
        }
        if (keys['A']) {
            pacman.direction.applyAxisAngle(UP, Math.PI / 2 * delta);
        }
        if (keys['D']) {
            pacman.direction.applyAxisAngle(UP, -Math.PI / 2 * delta);
        }
        if (keys['S']) {
            pacman.mesh.translateOnAxis(LEFT, -PACMAN_SPEED * delta);
            pacman.mesh.distanceMoved += PACMAN_SPEED * delta;
        }

        const leftSide = pacman.mesh.position.clone().addScaledVector(LEFT, PACMAN_RADIUS).round();
        const topSide = pacman.mesh.position.clone().addScaledVector(TOP, PACMAN_RADIUS).round();
        const rightSide = pacman.mesh.position.clone().addScaledVector(RIGHT, PACMAN_RADIUS).round();
        const bottomSide = pacman.mesh.position.clone().addScaledVector(BOTTOM, PACMAN_RADIUS).round();

        if (isWall(map, leftSide)) pacman.mesh.position.x = leftSide.x + 0.5 + PACMAN_RADIUS;
        if (isWall(map, rightSide)) pacman.mesh.position.x = rightSide.x - 0.5 - PACMAN_RADIUS;
        if (isWall(map, topSide)) pacman.mesh.position.y = topSide.y - 0.5 - PACMAN_RADIUS;
        if (isWall(map, bottomSide)) pacman.mesh.position.y = bottomSide.y + 0.5 + PACMAN_RADIUS;

        const cell = getAt(map, pacman.mesh.position);
        if (cell && cell.isDot === true && cell.visible === true) {
            removeAt(map, levelGroup, pacman.mesh.position);
            numDotsEaten += 1;
        }
    };

    const updateCamera = (delta, now) => {
        camera.targetPosition.copy(pacman.mesh.position).addScaledVector(UP, 1.5).addScaledVector(pacman.direction, -1);
        camera.targetLookAt.copy(pacman.mesh.position).add(pacman.direction);
        camera.position.lerp(camera.targetPosition, delta * 10);
        camera.lookAtPosition.lerp(camera.targetLookAt, delta * 10);
        camera.lookAt(camera.lookAtPosition);
    };

    // Main Loop
    animationLoop((delta, now) => {
        updatePacman(delta, now);
        updateCamera(delta, now);

        scene.children.forEach((object) => {
            if (object.isTemporary === true && now > object.removeAfter) remove.push(object);
        });
        remove.forEach((obj) => scene.remove(obj));
        remove.length = 0;

        renderer.setViewport(0, 0, renderer.domElement.width, renderer.domElement.height);
        renderer.render(scene, camera);
    });
};

main();
