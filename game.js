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

const LEVEL = [
    '# # # # # # # # # # # # # # # # # # # # # # # # # # # #',
    '# . . . . . . . . . . . . # # . . . . . . . . . . . . #',
    '# . # # # # . # # # # # . # # . # # # # # . # # # # . #',
    '# o # # # # . # # # # # . # # . # # # # # . # # # # o #',
    '# . # # # # . # # # # # . # # . # # # # # . # # # # . #',
    '# . . . . . . . . . . . . . . . . . . . . . . . . . . #',
    '# . # # # # . # # . # # # # # # # # . # # . # # # # . #',
    '# . # # # # . # # . # # # # # # # # . # # . # # # # . #',
    '# . . . . . . # # . . . . # # . . . . # # . . . . . . #',
    '# # # # # # . # # # # #   # #   # # # # # . # # # # # #',
    '          # . # # # # #   # #   # # # # # . #          ',
    '          # . # #         G           # # . #          ',
    '          # . # #   # # # # # # # #   # # . #          ',
    '# # # # # # . # #   #             #   # # . # # # # # #',
    '            .       #             #       .            ',
    '# # # # # # . # #   #             #   # # . # # # # # #',
    '          # . # #   # # # # # # # #   # # . #          ',
    '          # . # #                     # # . #          ',
    '          # . # #   # # # # # # # #   # # . #          ',
    '# # # # # # . # #   # # # # # # # #   # # . # # # # # #',
    '# . . . . . . . . . . . . # # . . . . . . . . . . . . #',
    '# . # # # # . # # # # # . # # . # # # # # . # # # # . #',
    '# . # # # # . # # # # # . # # . # # # # # . # # # # . #',
    '# o . . # # . . . . . . . P   . . . . . . . # # . . o #',
    '# # # . # # . # # . # # # # # # # # . # # . # # . # # #',
    '# # # . # # . # # . # # # # # # # # . # # . # # . # # #',
    '# . . . . . . # # . . . . # # . . . . # # . . . . . . #',
    '# . # # # # # # # # # # . # # . # # # # # # # # # # . #',
    '# . # # # # # # # # # # . # # . # # # # # # # # # # . #',
    '# . . . . . . . . . . . . . . . . . . . . . . . . . . #',
    '# # # # # # # # # # # # # # # # # # # # # # # # # # # #'
];

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

const createArrow = (() => {
    const arrowShape = new THREE.Shape();

    // Define the arrow shape
    // Start from the tip of the arrowhead
    arrowShape.moveTo(0, 0.25);  // Move to the top point of the arrowhead
    arrowShape.lineTo(-0.2, 0);  // Left side of the arrowhead
    arrowShape.lineTo(-0.1, 0);  // Left base of the arrow shaft
    arrowShape.lineTo(-0.1, -0.25);  // Bottom of the arrow shaft
    arrowShape.lineTo(0.1, -0.25);  // Bottom right of the arrow shaft
    arrowShape.lineTo(0.1, 0);  // Right base of the arrowhead
    arrowShape.lineTo(0.2, 0);  // Right side of the arrowhead
    arrowShape.lineTo(0, 0.25);  // Back to the top point of the arrowhead

    // Extrude the shape to make it 3D
    const extrudeSettings = {
        depth: 25,  // Length of the arrow (extrude in the Z-axis)
        bevelEnabled: false,
        bevelThickness: 0.01,
        bevelSize: 0.01,
        bevelOffset: 0,
        bevelSegments: 3
    };

    const arrowGeometry = new THREE.ExtrudeGeometry(arrowShape,extrudeSettings);

    
    const arrowMaterial = new THREE.MeshPhongMaterial( { side: THREE.DoubleSide  } ); // Orange-Red color for the arrow

    return () => {
        const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
        arrow.scale.set( 0.5, 0.5, 0.0003 );
        arrow.isArrow = true;
        return arrow;
    };
})();


const createDot = (() => {
    const heartShape = new THREE.Shape();

    // Define the heart shape (using a curve)
    heartShape.moveTo(0, 0.5);
    heartShape.bezierCurveTo(0.5, 0.5, 0.75, 0, 0, -0.5);
    heartShape.bezierCurveTo(-0.75, 0, -0.5, 0.5, 0, 0.5);

    // Create the geometry from the shape (you can extrude it to give depth)
    const extrudeSettings = {
        depth: 0.2,  // Adjust depth to your liking
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.02,
        bevelOffset: 0,
        bevelSegments: 5
    };

    const heartGeometry = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);
    const heartMaterial = new THREE.MeshPhongMaterial({ color: 0xFF69B4 }); // Pink color

    return () => {
        const heart = new THREE.Mesh(heartGeometry, heartMaterial);
        heart.scale.set( 0.5, 0.5, 0.003 );
        heart.isHeart = true;
        return heart;
    };
})();


const createDot1 = (() => {
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

    // Add lighting
    scene.add(new THREE.AmbientLight(0x888888));
    const light = new THREE.SpotLight('white', 0.5);
    light.position.set(0, 0, 50);
    scene.add(light);

    return scene;
};

const createHudCamera = (map) => {
    return;
    const halfWidth = (map.right - map.left) / 2;
    const halfHeight = (map.top - map.bottom) / 2;

    const hudCamera = new THREE.OrthographicCamera(-halfWidth, halfWidth, halfHeight, -halfHeight, 1, 100);
    hudCamera.position.copy(new THREE.Vector3(map.centerX, map.centerY, 10));
    hudCamera.lookAt(new THREE.Vector3(map.centerX, map.centerY, 0));

    return hudCamera;
};

const renderHud = (renderer, hudCamera, scene) => {
    return;
    // Increase size of pacman and dots in HUD to make them easier to see.
    scene.children.forEach((object) => {
        if (object.isWall !== true) object.scale.set(2.5, 2.5, 2.5);
    });

    // Only render in the bottom left 200x200 square of the screen.
    renderer.enableScissorTest(true);
    renderer.setScissor(10, 10, 200, 200);
    renderer.setViewport(10, 10, 200, 200);
    renderer.render(scene, hudCamera); 
    renderer.enableScissorTest(false);

    // Reset scales after rendering HUD. 
    scene.children.forEach((object) => object.scale.set(1, 1, 1));
};

class Pacman {
    constructor(scene, position) {
        // Create spheres with decreasingly small horizontal sweeps, in order
        // to create Pacman "death" animation.
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

        // Initialize Pacman facing to the left.
        this.mesh.position.copy(position);
        this.direction = new THREE.Vector3(-1, 0, 0);

        scene.add(this.mesh);
    }
}

const createGhost = (() => {
    const ghostGeometry = new THREE.SphereGeometry(GHOST_RADIUS, 16, 16);
    return (scene, position) => {
        // Give each ghost its own material so we can change the colors of individual ghosts.
        const ghostMaterial = new THREE.MeshPhongMaterial({ color: 'red' });
        const ghost = new THREE.Mesh(ghostGeometry, ghostMaterial);
        ghost.isGhost = true;
        ghost.isWrapper = true;
        ghost.isAfraid = false;
        ghost.becameAfraidTime = 0;

        // Ghosts start moving left.
        ghost.position.copy(position);
        ghost.direction = new THREE.Vector3(-1, 0, 0);

        scene.add(ghost);
        return ghost;
    };
})();

// Make object wrap to other side of map if it goes out of bounds.
const wrapObject = (object, map) => {
    if (object.position.x < map.left) object.position.x = map.right;
    else if (object.position.x > map.right) object.position.x = map.left;

    if (object.position.y > map.top) object.position.y = map.bottom;
    else if (object.position.y < map.bottom) object.position.y = map.top;
};

// Generic functions
// =================

const distanceBetween = (() => {  
    const difference = new THREE.Vector3();
    return (object1, object2) => {
        // Calculate difference between objects' positions.
        difference.copy(object1.position).sub(object2.position);
        return difference.length();
    };
})();

// Returns an object that contains the current state of keys being pressed.
const createKeyState = () => {
    // Keep track of current keys being pressed.
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
        // Make it so that all keys are unpressed when the browser loses focus.
        for (const key in keyState) {
            if (keyState.hasOwnProperty(key)) keyState[key] = false;
        }
    });

    return keyState;
};

const animationLoop = (callback, requestFrameFunction = requestAnimationFrame) => {
    let previousFrameTime = window.performance.now();

    // How many seconds the animation has progressed in total.
    let animationSeconds = 0;

    const render = () => {
        const now = window.performance.now();
        let animationDelta = (now - previousFrameTime) / 1000;
        previousFrameTime = now;

        // Limit delta to avoid large jumps.
        animationDelta = Math.min(animationDelta, 1 / 30);

        // Keep track of how many seconds of animation has passed.
        animationSeconds += animationDelta;

        callback(animationDelta, animationSeconds);

        requestFrameFunction(render);
    };

    requestFrameFunction(render);
};

// Main function
// =============
const main = () => {
    // Game state variables
    const keys = createKeyState();

    const renderer = createRenderer();
    const scene = createScene();

    const map = createMap(scene, LEVEL);
    let numDotsEaten = 0;

    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.up.copy(UP);
    camera.targetPosition = new THREE.Vector3();
    camera.targetLookAt = new THREE.Vector3();
    camera.lookAtPosition = new THREE.Vector3();

    const hudCamera = createHudCamera(map);

    const pacman = new Pacman(scene, map.pacmanSpawn);

    let ghostSpawnTime = -8;
    let numGhosts = 0;

    let won = false;
    let lost = false;
    let lostTime, wonTime;

 

    const remove = [];

    // Create life images
    let lives = 3;
    const livesContainer = document.getElementById('lives');
    for (let i = 0; i < lives; i++) {
        const life = document.createElement('img');
        life.src = 'pacman.png';
        life.className = 'life';
        livesContainer.appendChild(life);
    }

    // Main game logic
    const update = (delta, now) => {
        updatePacman(delta, now);
        updateCamera(delta, now);

        scene.children.forEach((object) => {
            if (object.isGhost === true) updateGhost(object, delta, now);
            if (object.isWrapper === true) wrapObject(object, map);
            if (object.isTemporary === true && now > object.removeAfter) remove.push(object);
        });

        // Remove objects after iteration
        remove.forEach((obj) => scene.remove(obj));
        remove.length = 0;

        // Spawn a ghost every 8 seconds, up to 4 ghosts.
        if (numGhosts < 4 && now - ghostSpawnTime > 8) {
            createGhost(scene, map.ghostSpawn);
            numGhosts += 1;
            ghostSpawnTime = now;
        }
    };

    const showText = (message, size, now) => {
        const textMaterial = new THREE.MeshPhongMaterial({ color: 'red' });

        // Show 3D text banner.
        const textGeometry = new THREE.TextGeometry(message, {
            size: size,
            height: 0.05,
            font: 'Helvetiker',
        });

        const text = new THREE.Mesh(textGeometry, textMaterial);

        // Position text just above Pacman.
        text.position.copy(pacman.mesh.position).add(UP);

        // Rotate text so that it faces same direction as Pacman.
        text.up.copy(pacman.direction);
        text.lookAt(text.position.clone().add(UP));

        // Remove after 3 seconds.
        text.isTemporary = true;
        text.removeAfter = now + 3;

        scene.add(text);

        return text;
    };

    const updatePacman = (delta, now) => {
        

        // Move if we haven't died or won.
        if (!won && !lost) {
            movePacman(delta);
        }

        // Check for win.
        if (!won && numDotsEaten === map.numDots) {
            won = true;
            wonTime = now;

            showText('You won =D', 1, now);
          
        }

        // Go to next level 4 seconds after winning.
        if (won && now - wonTime > 3) {
            // Reset Pacman position and direction.
            pacman.mesh.position.copy(map.pacmanSpawn);
            pacman.direction.copy(LEFT);
            pacman.mesh.distanceMoved = 0;

            // Reset dots, power pellets, and ghosts.
            scene.children.forEach((object) => {
                if (object.isDot === true || object.isPowerPellet === true) object.visible = true;
                if (object.isGhost === true) remove.push(object);
            });

            // Increase speed.
            PACMAN_SPEED += 1;
            GHOST_SPEED += 1;

            won = false;
            numDotsEaten = 0;
            numGhosts = 0;
        }

        // Reset Pacman 4 seconds after dying.
        if (lives > 0 && lost && now - lostTime > 4) {
            lost = false;
            pacman.mesh.position.copy(map.pacmanSpawn);
            pacman.direction.copy(LEFT);
            pacman.mesh.distanceMoved = 0;
        }

        // Animate model
        if (lost) {
            // If Pacman got eaten, show dying animation.
            const angle = ((now - lostTime) * Math.PI) / 2;
            const frame = Math.min(pacman.frames.length - 1, Math.floor((angle / Math.PI) * pacman.frames.length));

            pacman.mesh.geometry = pacman.frames[frame];
        } else {
            // Show eating animation based on how much Pacman has moved.
            const maxAngle = Math.PI / 4;
            let angle = (pacman.mesh.distanceMoved * 2) % (maxAngle * 2);
            if (angle > maxAngle) angle = maxAngle * 2 - angle;
            const frame = Math.floor((angle / Math.PI) * pacman.frames.length);

            pacman.mesh.geometry = pacman.frames[frame];
        }
    };

    const movePacman = (delta) => {
        // Update rotation based on direction so that mouth is always facing forward.
        // The "mouth" part is on the side of the sphere, make it "look" up but set the up direction so that it points forward.
        pacman.mesh.up.copy(pacman.direction).applyAxisAngle(UP, -Math.PI / 2);
        pacman.mesh.lookAt(pacman.mesh.position.clone().add(UP));

        // Move based on current keys being pressed.
        if (keys['W']) {
            // W - move forward
            pacman.mesh.translateOnAxis(LEFT, PACMAN_SPEED * delta);
            pacman.mesh.distanceMoved += PACMAN_SPEED * delta;
        }
        if (keys['A']) {
            // A - rotate left
            pacman.direction.applyAxisAngle(UP, Math.PI / 2 * delta);
        }
        if (keys['D']) {
            // D - rotate right
            pacman.direction.applyAxisAngle(UP, -Math.PI / 2 * delta);
        }
        if (keys['S']) {
            // S - move backward
            pacman.mesh.translateOnAxis(LEFT, -PACMAN_SPEED * delta);
            pacman.mesh.distanceMoved += PACMAN_SPEED * delta;
        }

        // Check for collision with walls.
        const leftSide = pacman.mesh.position.clone().addScaledVector(LEFT, PACMAN_RADIUS).round();
        const topSide = pacman.mesh.position.clone().addScaledVector(TOP, PACMAN_RADIUS).round();
        const rightSide = pacman.mesh.position.clone().addScaledVector(RIGHT, PACMAN_RADIUS).round();
        const bottomSide = pacman.mesh.position.clone().addScaledVector(BOTTOM, PACMAN_RADIUS).round();

        if (isWall(map, leftSide)) {
            pacman.mesh.position.x = leftSide.x + 0.5 + PACMAN_RADIUS;
        }
        if (isWall(map, rightSide)) {
            pacman.mesh.position.x = rightSide.x - 0.5 - PACMAN_RADIUS;
        }
        if (isWall(map, topSide)) {
            pacman.mesh.position.y = topSide.y - 0.5 - PACMAN_RADIUS;
        }
        if (isWall(map, bottomSide)) {
            pacman.mesh.position.y = bottomSide.y + 0.5 + PACMAN_RADIUS;
        }

        const cell = getAt(map, pacman.mesh.position);

        // Make Pacman eat dots.
        if (cell && cell.isDot === true && cell.visible === true) {
            removeAt(map, scene, pacman.mesh.position);
            numDotsEaten += 1;
        }

        // Make Pacman eat power pellets.
        pacman.mesh.atePellet = false;
        if (cell && cell.isPowerPellet === true && cell.visible === true) {
            removeAt(map, scene, pacman.mesh.position);
            pacman.mesh.atePellet = true;
            
        }
    };

    const updateCamera = (delta, now) => {
        if (won) {
            // After winning, pan camera out to show whole level.
            camera.targetPosition.set(map.centerX, map.centerY, 30);
            camera.targetLookAt.set(map.centerX, map.centerY, 0);
        } else if (lost) {
            // After losing, move camera to look down at Pacman's body from above.
            camera.targetPosition.copy(pacman.mesh.position).addScaledVector(UP, 4);
            camera.targetLookAt.copy(pacman.mesh.position).addScaledVector(pacman.direction, 0.01);
        } else {
            // Place camera above and behind Pacman, looking towards direction of Pacman.
            camera.targetPosition.copy(pacman.mesh.position).addScaledVector(UP, 1.5).addScaledVector(pacman.direction, -1);
            camera.targetLookAt.copy(pacman.mesh.position).add(pacman.direction);
        }

        // Move camera slowly during win/lose animations.
        const cameraSpeed = lost || won ? 1 : 10;
        camera.position.lerp(camera.targetPosition, delta * cameraSpeed);
        camera.lookAtPosition.lerp(camera.targetLookAt, delta * cameraSpeed);
        camera.lookAt(camera.lookAtPosition);
    };

    const updateGhost = (ghost, delta, now) => {
        // Make all ghosts afraid if Pacman just ate a pellet.
        if (pacman.mesh.atePellet === true) {
            ghost.isAfraid = true;
            ghost.becameAfraidTime = now;
            ghost.material.color.setStyle('white'); 
        }

        // Make ghosts not afraid anymore after 10 seconds.
        if (ghost.isAfraid && now - ghost.becameAfraidTime > 10) {
            ghost.isAfraid = false;
            ghost.material.color.setStyle('red');
        }

        moveGhost(ghost, delta);

        // Check for collision between Pacman and ghost.
        if (!lost && !won && distanceBetween(pacman.mesh, ghost) < PACMAN_RADIUS + GHOST_RADIUS) {
            if (ghost.isAfraid === true) {
                remove.push(ghost);
                numGhosts -= 1;
                
            } else {
                lives -= 1;
                document.getElementsByClassName('life')[lives].style.display = 'none';

                if (lives > 0) showText('You died =(', 0.1, now);
                else showText('Game over =(', 0.1, now);

                lost = true;
                lostTime = now;
                
            }
        }
    };

    const moveGhost = (() => {
        const previousPosition = new THREE.Vector3();
        const currentPosition = new THREE.Vector3();
        const leftTurn = new THREE.Vector3();
        const rightTurn = new THREE.Vector3();

        return (ghost, delta) => {
            previousPosition.copy(ghost.position).addScaledVector(ghost.direction, 0.5).round();
            ghost.translateOnAxis(ghost.direction, delta * GHOST_SPEED);
            currentPosition.copy(ghost.position).addScaledVector(ghost.direction, 0.5).round();

            // If the ghost is transitioning from one cell to the next, see if they can turn.
            if (!currentPosition.equals(previousPosition)) {
                leftTurn.copy(ghost.direction).applyAxisAngle(UP, Math.PI / 2);
                rightTurn.copy(ghost.direction).applyAxisAngle(UP, -Math.PI / 2);

                const forwardWall = isWall(map, currentPosition);
                const leftWall = isWall(map, currentPosition.clone().add(leftTurn));
                const rightWall = isWall(map, currentPosition.clone().add(rightTurn));

                if (!leftWall || !rightWall) {
                    // If the ghost can turn, randomly choose one of the possible turns.
                    const possibleTurns = [];
                    if (!forwardWall) possibleTurns.push(ghost.direction.clone());
                    if (!leftWall) possibleTurns.push(leftTurn.clone());
                    if (!rightWall) possibleTurns.push(rightTurn.clone());

                    if (possibleTurns.length === 0) throw new Error('A ghost got stuck!');

                    const newDirection = possibleTurns[Math.floor(Math.random() * possibleTurns.length)];
                    ghost.direction.copy(newDirection); 

                    // Snap ghost to center of current cell and start moving in new direction.
                    ghost.position.round().addScaledVector(ghost.direction, delta);
                }
            }
        };
    })();

    // Main game loop
    animationLoop((delta, now) => {
        update(delta, now);

        // Render main view
        renderer.setViewport(0, 0, renderer.domElement.width, renderer.domElement.height);
        renderer.render(scene, camera);

        // Render HUD
        //renderHud(renderer, hudCamera, scene);
    });
};
 
main();