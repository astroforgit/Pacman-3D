// Constants
// =========
const PACMAN_SPEED = 3.5;
let GHOST_SPEED = 1.5;
const PACMAN_RADIUS = 0.25;
const GHOST_RADIUS = PACMAN_RADIUS * 1.25;
const DOT_RADIUS = 0.05;
const PELLET_RADIUS = DOT_RADIUS * 2;

// 3D Directions
const UP_Z = new THREE.Vector3(0, 0, 1);
const DOWN_Z = new THREE.Vector3(0, 0, -1);
const FORWARD = new THREE.Vector3(-1, 0, 0); // Initial forward
const LEFT = new THREE.Vector3(0, -1, 0);

// Game-specific functions
// =======================

const createWall = (() => {
    // 3D Walls are squares (planes) or thin boxes.
    // Let's use thin boxes for "thickness"
    const wallGeometry = new THREE.BoxGeometry(2, 2, 0.1); 
    const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x4444ff, transparent: true, opacity: 0.8 });

    return (x, y, z, orientation) => {
        // Orientation: 'x', 'y', 'z'
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        
        if (orientation === 'x') {
            wall.rotation.y = Math.PI / 2;
        } else if (orientation === 'y') {
            wall.rotation.x = Math.PI / 2;
        } else if (orientation === 'z') {
            // Already flat on Z
        }
        
        wall.position.set(x, y, z);
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
    const light = new THREE.PointLight('white', 0.8, 100);
    scene.add(light);
    return { scene, light }; // Return light to move with player
};

class Pacman {
    constructor(scene, position) {
        // Simple sphere representation for FPV collision origin
        const geometry = new THREE.SphereGeometry(PACMAN_RADIUS, 16, 16);
        const material = new THREE.MeshPhongMaterial({ color: 'yellow' });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.visible = false; // Hide pacman in FPV? Or show it?
        
        this.mesh.isPacman = true;
        this.mesh.distanceMoved = 0;

        this.mesh.position.copy(position);
        
        // Orientation
        this.pitch = 0;
        this.yaw = 0;
        
        scene.add(this.mesh);
    }
}

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

// 3D Maze Generation
// ==================

const build3DLevel = (sceneGroup, maze, w) => {
    // scale: 1 unit = 1/2 cell? No, let's make 1 cell = 2 units.
    // cell center at (2x, 2y, 2z)
    const scale = 2;
    
    // Clear old
    while (sceneGroup.children.length > 0) {
        sceneGroup.remove(sceneGroup.children[0]);
    }

    const map3D = new Map(); // Store walls for collision "x,y,z" -> type

    for (let z = 0; z < maze.depth; z++) {
        for (let y = 0; y < maze.height; y++) {
            for (let x = 0; x < maze.width; x++) {
                const cell = maze.grid[w][z][y][x];
                
                // Centers
                const cx = x * scale;
                const cy = y * scale;
                const cz = z * scale;

                // Add Dot
                const dot = createDot();
                dot.position.set(cx, cy, cz);
                sceneGroup.add(dot);

                // Walls (Positive directions)
                // X+
                if (cell.walls.x_pos) {
                    const wall = createWall(cx + scale/2, cy, cz, 'x');
                    sceneGroup.add(wall);
                }
                // X- (Boundary only)
                if (x === 0 && cell.walls.x_neg) {
                    const wall = createWall(cx - scale/2, cy, cz, 'x');
                    sceneGroup.add(wall);
                }

                // Y+
                if (cell.walls.y_pos) {
                    const wall = createWall(cx, cy + scale/2, cz, 'y');
                    sceneGroup.add(wall);
                }
                // Y-
                if (y === 0 && cell.walls.y_neg) {
                    const wall = createWall(cx, cy - scale/2, cz, 'y');
                    sceneGroup.add(wall);
                }

                // Z+
                if (cell.walls.z_pos) {
                    const wall = createWall(cx, cy, cz + scale/2, 'z');
                    sceneGroup.add(wall);
                }
                // Z- (Boundary)
                if (z === 0 && cell.walls.z_neg) {
                    const wall = createWall(cx, cy, cz - scale/2, 'z');
                    sceneGroup.add(wall);
                }
                
                // Portals (W)
                if (!cell.walls.w_pos) {
                    const portal = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 8, 16), new THREE.MeshBasicMaterial({ color: 'blue' }));
                    portal.position.set(cx, cy, cz);
                    portal.name = "portal_future";
                    sceneGroup.add(portal);
                }
                if (!cell.walls.w_neg) {
                    const portal = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 8, 16), new THREE.MeshBasicMaterial({ color: 'yellow' }));
                    portal.position.set(cx, cy, cz);
                    portal.name = "portal_past";
                    sceneGroup.add(portal);
                }
            }
        }
    }
    return map3D;
};

// Check Collision
const checkCollision = (position, maze, w) => {
    // Convert pos to cell coords
    // Cell size 2, origin 0
    // Index = round(pos / 2)
    const scale = 2;
    const ix = Math.round(position.x / scale);
    const iy = Math.round(position.y / scale);
    const iz = Math.round(position.z / scale);

    // Bounds check
    if (ix < 0 || ix >= maze.width || iy < 0 || iy >= maze.height || iz < 0 || iz >= maze.depth) {
        return true; // Out of bounds
    }

    const cell = maze.grid[w][iz][iy][ix];
    const localX = position.x - ix * scale;
    const localY = position.y - iy * scale;
    const localZ = position.z - iz * scale;

    const threshold = scale/2 - PACMAN_RADIUS;

    if (localX > threshold && cell.walls.x_pos) return true;
    if (localX < -threshold && cell.walls.x_neg) return true;
    if (localY > threshold && cell.walls.y_pos) return true;
    if (localY < -threshold && cell.walls.y_neg) return true;
    if (localZ > threshold && cell.walls.z_pos) return true;
    if (localZ < -threshold && cell.walls.z_neg) return true;

    return false;
};


// Main function
// =============
const main = () => {
    const keys = createKeyState();
    const renderer = createRenderer();
    const { scene, light } = createScene();

    // Mouse Control Logic
    // -------------------
    renderer.domElement.addEventListener('click', () => {
        renderer.domElement.requestPointerLock();
    });

    const mouseSensitivity = 0.002;
    document.addEventListener('mousemove', (event) => {
        if (document.pointerLockElement === renderer.domElement) {
            camera.rotation.y -= event.movementX * mouseSensitivity;
            camera.rotation.x -= event.movementY * mouseSensitivity;
            camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
        }
    });
    
    // Initialize 4D Maze
    const mazeWidth = 6, mazeHeight = 6, mazeDepth = 6, mazeWDepth = 4;
    const maze = new Maze4D(mazeWidth, mazeHeight, mazeDepth, mazeWDepth);
    maze.generate();

    let currentW = 0;
    let levelGroup = new THREE.Group();
    scene.add(levelGroup);

    let pacman = new Pacman(scene, new THREE.Vector3(0,0,0));
    
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // Initial Load
    build3DLevel(levelGroup, maze, currentW);

    let numDotsEaten = 0;

    const showText = (message, size, now) => {
        // ... (Simplified text or console log for FPV for now to avoid clutter)
        console.log(message);
    };

    // Movement State
    const velocity = new THREE.Vector3();
    camera.rotation.order = 'YXZ'; // Yaw (Y) first, then Pitch (X)

    const updatePacman = (delta, now) => {
        // Rotation Keys
        const lookSpeed = 2.0;
        
        // A/D for Yaw (Left/Right rotation)
        if (keys['A']) camera.rotation.y += lookSpeed * delta;
        if (keys['D']) camera.rotation.y -= lookSpeed * delta;
        
        // Q/E for Pitch (Up/Down rotation)
        if (keys['Q']) camera.rotation.x += lookSpeed * delta;
        if (keys['E']) camera.rotation.x -= lookSpeed * delta;

        // Keep Arrow Keys
        if (keys['ARROWLEFT']) camera.rotation.y += lookSpeed * delta;
        if (keys['ARROWRIGHT']) camera.rotation.y -= lookSpeed * delta;
        if (keys['ARROWUP']) camera.rotation.x += lookSpeed * delta;
        if (keys['ARROWDOWN']) camera.rotation.x -= lookSpeed * delta;
        
        camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
        
        // Sync Pacman mesh to camera (optional, mainly for collision origin)
        pacman.mesh.rotation.copy(camera.rotation);

        // Movement Direction relative to Camera
        const moveDir = new THREE.Vector3();
        if (keys['W']) moveDir.z -= 1;
        if (keys['S']) moveDir.z += 1;

        // Apply rotation to movement vector to align with view
        moveDir.applyEuler(camera.rotation);
        moveDir.normalize();

        const intendedPos = pacman.mesh.position.clone().addScaledVector(moveDir, PACMAN_SPEED * delta);
        
        // Check Collision
        if (!checkCollision(intendedPos, maze, currentW)) {
            pacman.mesh.position.copy(intendedPos);
        }

        // Camera Follows Head
        camera.position.copy(pacman.mesh.position);
        light.position.copy(pacman.mesh.position);

        // Dot Eating & Portals
        const scale = 2;
        const ix = Math.round(pacman.mesh.position.x / scale);
        const iy = Math.round(pacman.mesh.position.y / scale);
        const iz = Math.round(pacman.mesh.position.z / scale);

        // Check objects in scene near player
        // Optimization: Just check grid center
        const cellCenter = new THREE.Vector3(ix*scale, iy*scale, iz*scale);
        if (pacman.mesh.position.distanceTo(cellCenter) < 0.5) {
            // Check Dots
            // ... (We need to find the specific dot object. Iterating scene is slow. 
            // Better to assume if we are in cell, we eat the dot if it exists)
            // For prototype, let's just find closest object in levelGroup
            for (let i = levelGroup.children.length - 1; i >= 0; i--) {
                const obj = levelGroup.children[i];
                if (obj.isDot && obj.position.distanceTo(pacman.mesh.position) < 0.5) {
                    levelGroup.remove(obj);
                    numDotsEaten++;
                }
                if (obj.name === "portal_future" && obj.position.distanceTo(pacman.mesh.position) < 0.5) {
                    if (currentW < mazeWDepth - 1) {
                         currentW++; 
                         build3DLevel(levelGroup, maze, currentW);
                         pacman.mesh.position.set(0,0,0); // Reset or keep relative? Reset is safer to avoid wall clip
                    }
                }
                if (obj.name === "portal_past" && obj.position.distanceTo(pacman.mesh.position) < 0.5) {
                    if (currentW > 0) {
                         currentW--; 
                         build3DLevel(levelGroup, maze, currentW);
                         pacman.mesh.position.set(0,0,0);
                    }
                }
            }
        }
    };

    animationLoop((delta, now) => {
        updatePacman(delta, now);
        renderer.render(scene, camera);
    });
};

main();