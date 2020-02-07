import { Universe, configure_env } from "wasm-game-of-life";
import { memory } from "wasm-game-of-life/wasm_game_of_life_bg"

const CELL_SIZE = 5;
const GRID_COLOR = "#CCC";
const DEAD_COLOR = "#FFF";
const ALIVE_COLOR = "#000";

const universe = Universe.new();
const width = universe.width();
const height = universe.height();
let animationFrame = null;
let gameSpeed = null;
let gameSpeedIndex = 0;

const canvas = document.getElementById("game-of-life-canvas");
canvas.height = (CELL_SIZE + 1) * height + 1;
canvas.width = (CELL_SIZE + 1) * width + 1;
canvas.onclick = (e) => {
    pause();

    const boundingRect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / boundingRect.width;
    const scaleY = canvas.height / boundingRect.height;

    const canvasLeft = (e.clientX - boundingRect.left) * scaleX;
    const canvasTop = (e.clientY - boundingRect.top) * scaleY;

    const row = Math.min(Math.floor(canvasTop / (CELL_SIZE + 1)), height - 1);
    const col = Math.min(Math.floor(canvasLeft / (CELL_SIZE + 1)), width - 1);

    universe.toggle_cell(row, col);
    if (e.shiftKey) {
        universe.toggle_cell(row + 1, col);
        universe.toggle_cell(row - 1, col);
    } else if (e.altKey) {
        universe.toggle_cell(row - 1, col);
        universe.toggle_cell(row - 2, col);
        universe.toggle_cell(row, col + 1);
        universe.toggle_cell(row - 1, col + 2);
    }

    render();
};

const randomize = () => {
    universe.randomize();
};
const randomizer = document.getElementById('game-of-life-randomize');
randomizer.onclick = function() { randomize() };

const clear = () => {
    universe.reset_cells();
    render();
};
const clearer = document.getElementById('game-of-life-clear');
clearer.onclick = () => { clear(); };

const isPaused = () => {
    return animationFrame === null;
};
const play = () => {
    playPause.textContent = "Pause";
    renderLoop();
};
const pause = () => {
    playPause.textContent = "Play";
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
};
const playPause = document.getElementById('game-of-life-play-pause');
playPause.onclick = () => {
    if (isPaused()) {
        play();
    } else {
        pause();
    }
};

const speedDisplay = document.getElementById('game-of-life-current-speed');
const setSpeed = (val) => {
    speedDisplay.textContent = Math.floor((1 / val) * 100) + "%";

    gameSpeed = val;
};
const speedRange = document.getElementById('game-of-life-speed');
speedRange.onchange = () => {
    setSpeed(Math.pow(-1 * speedRange.value, 2));
};

const ctx = canvas.getContext('2d');
ctx.strokeStyle = GRID_COLOR;

const render = () => {
    drawGrid();
    drawCells();
};
const renderLoop = () => {
    fps.render();

    if (gameSpeedIndex == null) {
        gameSpeedIndex = 1;
    } else if (gameSpeedIndex >= gameSpeed) {
        gameSpeedIndex = 1;

        universe.tick();
        render();
    } else {
        gameSpeedIndex++;
    }

    animationFrame = requestAnimationFrame(renderLoop);
};

const getIndex = (row, column) => {
    return row * width + column;
};

const drawGrid = () => {
    ctx.beginPath();

    // Vertical lines.
    for (let i = 0; i <= width; i++) {
        ctx.moveTo(i * (CELL_SIZE + 1) + 1, 0);
        ctx.lineTo(i * (CELL_SIZE + 1) + 1, (CELL_SIZE + 1) * height + 1);
    }

    // Horizontal lines.
    for (let j = 0; j <= height; j++) {
        ctx.moveTo(0,                           j * (CELL_SIZE + 1) + 1);
        ctx.lineTo((CELL_SIZE + 1) * width + 1, j * (CELL_SIZE + 1) + 1);
    }

    ctx.stroke();
};

const drawCells = () => {
    const cellsPtr = universe.cells();
    const cells = new Uint8Array(memory.buffer, cellsPtr, width * height / 8);

    ctx.beginPath();

    let live_cells = [];
    let dead_cells = [];
    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            const idx = getIndex(row, col);

            if (bitIsSet(idx, cells)) {
                live_cells.push([col, row]);
            } else {
                dead_cells.push([col, row]);
            }
        }
    }

    let fill = (col, row) => {
        ctx.fillRect(
            col * (CELL_SIZE + 1) + 1,
            row * (CELL_SIZE + 1) + 1,
            CELL_SIZE,
            CELL_SIZE
        )
    };
    ctx.fillStyle = ALIVE_COLOR;
    live_cells.forEach((dims) => fill(dims[0], dims[1]));
    ctx.fillStyle = DEAD_COLOR;
    dead_cells.forEach((dims) => fill(dims[0], dims[1]));

    ctx.stroke();
};

const bitIsSet = (n, arr) => {
    const byte = Math.floor(n / 8);
    const mask = 1 << (n % 8);

    return (arr[byte] & mask) === mask;
};

const fps = new class {
    constructor() {
        this.fps = document.getElementById("game-of-life-fps");
        this.frames = [];
        this.lastFrameTimeStamp = performance.now();
    }

    render() {
        const now = performance.now();
        const delta = now - this.lastFrameTimeStamp;
        this.lastFrameTimeStamp = now;
        const fps = 1 / delta * 1000;

        this.frames.push(fps);
        if (this.frames.length > 100) {
            this.frames.shift();
        }

        let min = Infinity;
        let max = -Infinity;
        let sum = 0;
        for (let i = 0; i < this.frames.length; i++) {
            sum += this.frames[i];
            min = Math.min(this.frames[i], min);
            max = Math.max(this.frames[i], max);
        }
        let mean = sum / this.frames.length;

        this.fps.textContent = `
Frames per Second:
         latest = ${Math.round(fps)}
avg of last 100 = ${Math.round(mean)}
min of last 100 = ${Math.round(min)}
max of last 100 = ${Math.round(max)}
`.trim();
    }
}

configure_env();

drawGrid();
drawCells();
play();
