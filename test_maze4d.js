const Maze4D = require('./maze4d.js');

console.log("Initializing 4D Maze Generator...");

// Create a small 3x3x3x3 maze for testing
const width = 3;
const height = 3;
const depth = 3;
const wDepth = 3;

const maze = new Maze4D(width, height, depth, wDepth);

console.log(`Generating maze of size ${width}x${height}x${depth}x${wDepth}...`);
maze.generate();

// Validation: Check if all cells are visited
let visitedCount = 0;
let totalCells = width * height * depth * wDepth;

for (let w = 0; w < wDepth; w++) {
    for (let z = 0; z < depth; z++) {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (maze.grid[w][z][y][x].visited) {
                    visitedCount++;
                }
            }
        }
    }
}

console.log(`Visited ${visitedCount} out of ${totalCells} cells.`);

if (visitedCount === totalCells) {
    console.log("SUCCESS: Maze is fully connected (all cells visited).");
} else {
    console.error("FAILURE: Some cells were not visited.");
}

// Inspect a specific cell to see walls
const cell = maze.grid[0][0][0][0];
console.log("Cell (0,0,0,0) walls:", cell.walls);
