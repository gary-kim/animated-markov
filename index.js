/**
 * @author Gary Kim <gary@garykim.dev>
 * @license Copyright (c) 2019 Gary Kim <gary@garykim.dev>, All Rights Reserved
 *
 */

import * as math from 'mathjs';
import Mousetrap from 'mousetrap';
import config from './config';
import deepEqual from 'fast-deep-equal/es6';
const gir = require('get-in-range');

let currentDim = {
  height: 100,
  width: 100
};

let counter = 0;

let ignorescroll = false;

let walls = [];
let cells = [[0]];

let canvas;
let ctx;
let messagediv;

let status = {
    "mode": config.mode.playing
};

window.onload = init;
window.onresize = sizeCanvas;

function init() {

    canvas = document.getElementById("canvas");
    ctx = canvas.getContext('2d');
    messagediv = document.getElementById("message");

    window.requestAnimationFrame(draw);

    Mousetrap.bind('i', () => {
        if(cells[0].length > 1) {
            setDimensions(cells[0].length - 1, cells.length);
        }
    });
    Mousetrap.bind('k', () => {
        setDimensions(cells[0].length + 1, cells.length);
    });
    Mousetrap.bind('l', () => {
        setDimensions(cells[0].length, cells.length + 1);
    });
    Mousetrap.bind('j', () => {
        if(cells.length > 1) {
            setDimensions(cells[0].length, cells.length - 1);
        }
    });
    Mousetrap.bind('m', () => {
        status.mode = (status.mode + 1) % 3;
        draw();
    });
    Mousetrap.bind('p', () => {
        progress();
    });


    // Click Handler
    canvas.addEventListener('DOMMouseScroll', e => {
        handleScroll(e.clientX, e.clientY, e.detail);
        // TODO: Complete adding and removing from cells
    });
    canvas.addEventListener('click', e => {
        let x = e.clientX;
        let y = e.clientY;
        let t = handleClick(x, y);
        draw();
    });

    sizeCanvas();

}

/**
 * Set the dimensions of the cells
 *
 * @param {number} height the height of the array
 * @param {number} width the width of the array
 */
function setDimensions(height, width) {
    let toSet = [];
    for(let c = 0; c < width; c++) {
        let column = [];
        for(let r = 0; r < height; r++) {
            column.push(0);
        }
        toSet.push(column);
    }
    cells = toSet;
    draw();
}

function draw() {
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // messages
    let message = [
        `Current: ${status.mode}`,
        `Dimensions: (${cells.length}, ${cells[0].length})`,
        ``,
        ...generateTransitionMatrix().map(a => a.map(b => b.toFixed(1)))
    ];
    messagediv.innerText = message.join("\n");

    const dim = cellDimensions();

    ctx.save();
    ctx.style = 'rgb(0, 0, 0)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${0.2 * dim.height}px sans-serif`;
    // Draw cells
    for(let c = 0; c < cells.length; c++) {
        for(let r = 0; r < cells[c].length; r++) {
            ctx.strokeRect(dim.width * c, dim.height * r, dim.width, dim.height);
            ctx.fillText(cells[c][r].toFixed(1), dim.width * (c + 0.5), dim.height * (r + 0.5));
        }
    }

    ctx.style = 'rgb(0, 0, 0)';
    // Draw in non closed walls
    for(let i = 0; i < walls.length; i++) {
        let wall = walls[i];
        let wallCenter = {
            x: (math.mean(wall.from.c , wall.to.c) + 0.5) * dim.width,
            y: (math.mean(wall.from.r, wall.to.r) + 0.5) * dim.height
        };
        let toWall = {
            x: (wall.to.c + 0.5) * dim.width,
            y: (wall.to.r + 0.5) * dim.height
        };
        let fromWall = {
            x: (wall.from.c + 0.5) * dim.width,
            y: (wall.from.r + 0.5) * dim.width
        };
        console.log(wallCenter);
        // vertical describes whether the two cells are vertical or horizontal
        let vertical = wall.from.c === wall.to.c;
        if (vertical) {
            ctx.clearRect(wallCenter.x - (dim.width / 4), wallCenter.y - 20, dim.width / 2, 40);
            if (wall.type === config.walls.oneway) {
                oneThirdLine({x: wallCenter.x - (dim.width / 4), y: wallCenter.y}, {x: toWall.x, y: toWall.y});
                oneThirdLine({x: wallCenter.x + (dim.width / 4), y: wallCenter.y}, {x: toWall.x, y: toWall.y});
            }
        } else {
            ctx.clearRect(wallCenter.x - 20, wallCenter.y - (dim.height / 4), 40, (dim.height / 2));
            if (wall.type === config.walls.oneway) {
                oneThirdLine({x: wallCenter.x, y: wallCenter.y + (dim.height / 4)}, {x: toWall.x, y: toWall.y});
                oneThirdLine({x: wallCenter.x, y: wallCenter.y - (dim.height / 4)}, {x: toWall.x, y: toWall.y});
            }
        }
    }
    ctx.restore();
}

/**
 * Draws a line that goes one third of the distance from "from" to "to"
 * @param {{x: number, y: number}} from
 * @param {{x: number, y: number}} to
 */
function oneThirdLine(from, to) {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(math.mean(from.x, from.x, to.x), math.mean(from.y, from.y, to.y));
    ctx.stroke();
}

/**
 * Make a step with the markov chain
 */
function progress() {
    const markov = generateTransitionMatrix();
    let state = generateState();
    let newState = math.multiply(state, markov);
    stateToCells(newState);
    draw();
}

/**
 * Identify what cell was clicked from the coordinate position
 *
 * @param {number} x x coordinate on canvas
 * @param {number} y y coordinate on canvas
 *
 * @return {{r: number, c: number}} cell that the coordinates refer to
 */
function identifyCell(x, y) {
    const dim = cellDimensions();
    console.log(`cell Dim: ${JSON.stringify(dim)}`)
    console.log({
        r: math.floor(y / dim.width),
        c: math.floor(x / dim.height)
    })
    return {
        r: math.floor(y / dim.height),
        c: math.floor(x / dim.width)
    };
}

/**
 * Calculates the dimensions of a single cell in the canvas
 *
 * @returns {{width: number, height: number}}
 */
function cellDimensions() {
    return {
        width: canvas.width / cells.length,
        height: canvas.height / cells[0].length
    }
}

/**
 * Generate a n x 1 matrix of the current state
 * @returns {Array}
 */
function generateState() {
    let matrix = [];
    for (let c = 0; c < cells.length; c++) {
        for (let r = 0; r < cells[0].length; r++) {
            matrix.push(cells[c][r]);
        }
    }
    return matrix;
}

/**
 * Converts a given n x 1 matrix of the current state into the 2D array used for drawing
 * @param {Array} state the given state matrix
 */
function stateToCells(state) {

    for(let i = 0; i < state.length; i++) {
        cells[Math.floor(i / cells.length)][Math.floor(i % cells.length)] = state[i];
    }
}

/**
 * Generate the Markov transition matrix with the current settings
 */
function generateTransitionMatrix() {
    let tr = [];
    for (let c = 0; c < cells.length; c++) {
        let column = [];
        for (let r = 0; r < cells[0].length; r++) {
            column.push(generateColumn(c, r));
        }
        tr.push(...column);
    }
    return tr;
    function generateColumn(c, r) {
        let column = [];
        let currentCell = {
            r: r,
            c: c
        };
        let related = walls.filter(e => deepEqual(e.from, currentCell) || (deepEqual(e.to, currentCell) && e.type === config.walls.open));
        console.log(`At [${c},${r}], ${JSON.stringify(related)} are related`)
        for (let ic = 0; ic < cells.length; ic++) {
            for (let ir = 0; ir < cells[0].length; ir++) {
                let thisCell = {
                    r: ir,
                    c: ic
                };
                let tocon = false;
                for (let i = 0; i < related.length; i++) {
                    let e = related[i];
                    if (deepEqual(e.to, thisCell) || (deepEqual(e.from, thisCell) && e.type === config.walls.open)) {
                        tocon = true;
                        column.push(1.0 / related.length);
                        break;
                    }
                }
                if (tocon) {
                    continue;
                }
                column.push(0);
            }
        }

        // Case for no walls that are related and a special case when all walls that are related are oneways that go to this cell
        let allAboard = true;
        for (let i = 0; i < related.length; i++) {
            let e = related[i];
            if (e.type === config.walls.open || (e.type === config.walls.oneway && deepEqual(e.from, currentCell))) {
                allAboard = false;
                continue;
            }
        }
        if (related.length === 0 || allAboard) {
            column[c * 3 + r] = 1;
            return column;
        }

        column[c * 3 + r] = 0;
        return column;
    }
}

/**
 * Resize the canvas
 */
function sizeCanvas() {
    canvas.height = window.innerHeight * 0.8;
    canvas.width = window.innerWidth * 0.8;
    draw();
}

/**
 * Handles a scroll at a given coordinate in the canvas
 * @param {Number} x x coordinate
 * @param {Number} y y coordinate
 * @param {Number} scroll
 */
function handleScroll(x, y, scroll) {
    const cell = identifyCell(x, y);
    if (ignorescroll) {
        return;
    }
    ignorescroll = true;
    let change = scroll >= 0 ? -1 : 1;
    if (status.mode === config.mode.setup) {
        cells[cell.c][cell.r] += change;
    }
    if (cells[cell.c][cell.r] < 0) {
        cells[cell.c][cell.r] = 0;
    }
    setTimeout(() => {ignorescroll = false}, 50);
    draw();
}

/**
 * Handles a click at a given coordinate in the canvas
 * @param {Number} x x coordinate
 * @param {Number} y y coordinate
 */
function handleClick(x, y) {
    const cell = identifyCell(x, y);
    console.log(`Clicking ${JSON.stringify(cell)}`)
    console.log(`Currently: ${JSON.stringify(walls)}`)
    let related = walls.filter(e => deepEqual(e.from, cell) || deepEqual(e.to, cell));
    const dim = cellDimensions();

    let rx = x % dim.width;
    let ry = y % dim.height;

    // identify closest wall
    let relation = JSON.parse(JSON.stringify(cell));

    let distance = dim.width + dim.height;
    if (rx < distance) {
        distance = rx;
        relation = JSON.parse(JSON.stringify(cell));
        relation.c= cell.c - 1;
    }
    if (ry < distance) {
        distance = ry;
        relation = JSON.parse(JSON.stringify(cell));
        relation.r = cell.r - 1;
    }
    if (dim.width - rx < distance) {
        distance = dim.width - rx;
        relation = JSON.parse(JSON.stringify(cell));
        relation.c = cell.c + 1;
    }
    if (dim.height - ry < distance) {
        distance = dim.height - ry;
        relation = JSON.parse(JSON.stringify(cell));
        relation.r = cell.r + 1;
    }

    if(gir(relation.r, 0, cells[0].length - 1) !== relation.r || gir(relation.c, 0, cells.length - 1) !== relation.c) {
        return;
    }

    related = (related.filter(e => (e.from.c === relation.c && e.from.r === relation.r) || (e.to.c === relation.c && e.to.r === relation.r)) || [false])[0];


    // Handle all possibilities
    // The wall is currently solid
    // Make the wall oneway facing towards
    if (!related) {
        walls.push({
            from: relation,
            to: cell,
            type: config.walls.oneway,
            id: counter++
        });
        return;
    }
    // The wall is currently facing away
    // Make the wall face the other way
    if (related.type === config.walls.oneway && related.from.r === cell.r && related.from.c === cell.c) {
        for (let i = 0; i < walls.length; i++) {
            if (walls[i].id === related.id) {
                let temp = walls[i].from;
                walls[i].from = walls[i].to;
                walls[i].to = temp;
                return;
            }
        }
        return;
    }
    // The wall is currently facing towards
    // Make the wall a twoway
    if (related.type === config.walls.oneway) {
        for (let i = 0; i < walls.length; i++) {
            if (walls[i].id === related.id) {
                walls[i].type = config.walls.open;
                return;
            }
        }
        return;
    }
    // The wall is currently twoway
    // Make the wall closed
    for(let i = 0; i < walls.length; i++) {
        if (walls[i].id === related.id) {
            walls.splice(i, 1);
            return;
        }
    }
    return;
}
