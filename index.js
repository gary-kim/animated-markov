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

let counter = 0;

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


    // Click Handler
    canvas.addEventListener('DOMMouseScroll', e => {
        let change = e.detail;
        let position = identifyCell(e.clientX, e.clientY);
        // TODO: Complete adding and removing from cells
    });
    canvas.addEventListener('click', e => {
        let x = e.clientX;
        let y = e.clientY;
        handleClick(x, y);
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
        `Dimensions: (${cells.length}, ${cells[0].length})`
    ];
    messagediv.innerText = message.join("\n");

    const dim = cellDimensions();

    ctx.save();
    ctx.style = 'rgb(0, 0, 0)';
    // Draw cells
    for(let c = 0; c < cells.length; c++) {
        for(let r = 0; r < cells[c].length; r++) {
            ctx.strokeRect(dim.width * c, dim.height * r, dim.width, dim.height);
        }
    }
    ctx.restore();

    // TODO: Draw oneway and open walls
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
    return {
        r: parseInt(x / dim.width),
        c: parseInt(y / dim.height)
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
 * Resize the canvas
 */
function sizeCanvas() {
    canvas.height = window.innerHeight * 0.8;
    canvas.width = window.innerWidth * 0.8;
}

/**
 * Handles a click at a given coordinate in the canvas
 * @param {Number} x x coordinate
 * @param {Number} y y coordinate
 */
function handleClick(x, y) {
    const cell = identifyCell(x, y);
    let related = walls.filter(e => deepEqual(e.from, cell) || deepEqual(e.to, cell));
    const dim = cellDimensions();

    let rx = x % dim.width;
    let ry = y % dim.height;

    // identify closest wall
    let relation = JSON.parse(JSON.stringify(cell));
    let distance = dim.width + dim.height;
    if (rx < distance) {
        distance = rx;
        relation = cell;
        relation.x = cell.x - 1;
    }
    if (ry < distance) {
        distance = ry;
        relation = cell;
        relation.y = cell.y - 1;
    }
    if (dim.width - rx < distance) {
        distance = dim.width - rx;
        relation = cell;
        relation.x = cell.x + 1;
    }
    if (dim.height - ry < distance) {
        distance = dim.height - ry;
        relation = cell;
        relation.y = cell.y + 1;
    }

    if(gir(relation.y, 0, cell[0].length - 1) !== relation.y || gir(relation.x, 0, cell.length - 1) !== relation.x) {
        return;
    }

    related = (related.filter(e => (e.from.x === relation.x && e.from.y === relation.y) || (e.to.x === relation.x && e.from.y === relation.y)) || [false])[0];


    // Handle all possibilites
    // The wall is currently solid
    // Make the wall oneway facing towards
    if (related === false) {
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
    if (related.type === config.walls.oneway && deepEqual(related.from, cell)) {
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
