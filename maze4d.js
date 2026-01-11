class Maze4D {
    constructor(width, height, depth, wDepth) {
        this.width = width;
        this.height = height;
        this.depth = depth;
        this.wDepth = wDepth;
        this.grid = [];
        this.initGrid();
    }

    initGrid() {
        this.grid = new Array(this.wDepth);
        for (let w = 0; w < this.wDepth; w++) {
            this.grid[w] = new Array(this.depth);
            for (let z = 0; z < this.depth; z++) {
                this.grid[w][z] = new Array(this.height);
                for (let y = 0; y < this.height; y++) {
                    this.grid[w][z][y] = new Array(this.width);
                    for (let x = 0; x < this.width; x++) {
                        this.grid[w][z][y][x] = {
                            x, y, z, w,
                            visited: false,
                            walls: {
                                x_pos: true, x_neg: true,
                                y_pos: true, y_neg: true,
                                z_pos: true, z_neg: true,
                                w_pos: true, w_neg: true
                            }
                        };
                    }
                }
            }
        }
    }

    generate() {
        // Start at random position or (0,0,0,0)
        let current = this.grid[0][0][0][0];
        current.visited = true;
        
        const stack = [current];

        while (stack.length > 0) {
            current = stack[stack.length - 1]; // Peek
            const neighbors = this.getUnvisitedNeighbors(current);

            if (neighbors.length > 0) {
                // Choose random neighbor
                const next = neighbors[Math.floor(Math.random() * neighbors.length)];
                
                // Remove walls between current and next
                this.removeWalls(current, next);
                
                // Mark as visited and push to stack
                next.visited = true;
                stack.push(next);
            } else {
                stack.pop();
            }
        }
        
        console.log("4D Maze Generation Complete.");
    }

    getUnvisitedNeighbors(cell) {
        const { x, y, z, w } = cell;
        const neighbors = [];
        
        // Potential neighbors offsets
        // x, y, z, w
        const dirs = [
            [1, 0, 0, 0], [-1, 0, 0, 0],
            [0, 1, 0, 0], [0, -1, 0, 0],
            [0, 0, 1, 0], [0, 0, -1, 0],
            [0, 0, 0, 1], [0, 0, 0, -1]
        ];

        for (const [dx, dy, dz, dw] of dirs) {
            const nx = x + dx;
            const ny = y + dy;
            const nz = z + dz;
            const nw = w + dw;

            if (this.isValid(nx, ny, nz, nw)) {
                const neighbor = this.grid[nw][nz][ny][nx];
                if (!neighbor.visited) {
                    neighbors.push(neighbor);
                }
            }
        }
        return neighbors;
    }

    isValid(x, y, z, w) {
        return x >= 0 && x < this.width &&
               y >= 0 && y < this.height &&
               z >= 0 && z < this.depth &&
               w >= 0 && w < this.wDepth;
    }

    removeWalls(c1, c2) {
        const dx = c2.x - c1.x;
        const dy = c2.y - c1.y;
        const dz = c2.z - c1.z;
        const dw = c2.w - c1.w;

        if (dx === 1) { c1.walls.x_pos = false; c2.walls.x_neg = false; }
        else if (dx === -1) { c1.walls.x_neg = false; c2.walls.x_pos = false; }
        else if (dy === 1) { c1.walls.y_pos = false; c2.walls.y_neg = false; }
        else if (dy === -1) { c1.walls.y_neg = false; c2.walls.y_pos = false; }
        else if (dz === 1) { c1.walls.z_pos = false; c2.walls.z_neg = false; }
        else if (dz === -1) { c1.walls.z_neg = false; c2.walls.z_pos = false; }
        else if (dw === 1) { c1.walls.w_pos = false; c2.walls.w_neg = false; }
        else if (dw === -1) { c1.walls.w_neg = false; c2.walls.w_pos = false; }
    }
}

// Export for Node.js testing
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = Maze4D;
}
