'use strict';

const BOX_TEMPLATE = `
<div class="box show">
    <div class="top playable-line" id="line-@H"></div>
    <div class="left playable-line" id="line-@V"></div>
    <div class="inside-cell" id="cell-@C">&nbsp;</div>
</div>
`;

const LAST_LEFT_LINE_TEMPLATE = `
<div class="box show">
    <div class="hidden"></div>
    <div class="left playable-line" id="line-@V"></div>
    <div class="inside-cell">&nbsp;</div>
</div>
<div class="new-line"></div>
`;

const LAST_TOP_LINE_TEMPLATE = `
<div class="box show">
    <div class="top playable-line" id="line-@H"></div>
    <div class="hidden"></div>
</div>
`;

let uiBound = false;
let gameOver = false;

function readIntInput(id, fallback, min, max) {
    const raw = parseInt(document.getElementById(id).value, 10);
    if (Number.isNaN(raw)) {
        return fallback;
    }
    return Math.min(max, Math.max(min, raw));
}

function getQueryResultVar(queryResult, varName) {
    for (let i = 0; i < queryResult.vars.length; i++) {
        if (queryResult.vars[i].var === varName) {
            return queryResult.vars[i].value;
        }
    }
    return null;
}

function parseCapturedCells(rawCells) {
    try {
        const parsed = JSON.parse(rawCells);
        return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
        return [];
    }
}

function markLine(lineId, turno) {
    const line = document.getElementById(lineId);
    if (!line) {
        return;
    }
    line.classList.add('marked-line');
    line.classList.add(String(turno) === '1' ? 'blue-line' : 'red-line');
}

function paintCapturedCells(cells, turno) {
    cells.forEach(([row, col]) => {
        const cell = document.getElementById(`cell-${row}-${col}`);
        if (!cell) {
            return;
        }
        cell.textContent = turno;
        cell.classList.remove('blue', 'red');
        cell.classList.add(String(turno) === '1' ? 'blue' : 'red');
    });
}

function updateScore(turno, delta) {
    const scoreLabel = document.getElementById(`p${turno}_lbl`);
    const previous = parseInt(scoreLabel.textContent, 10) || 0;
    scoreLabel.textContent = String(previous + delta);
}

function setBoardInteractive(enabled) {
    const board = document.getElementById('game_div');
    board.classList.toggle('disabled', !enabled);
}

function setupLevelPicker() {
    const picker = document.getElementById('nivel');
    const output = document.getElementById('nivel_value');
    if (!picker || !output) {
        return;
    }

    const syncValue = () => {
        output.textContent = picker.value;
    };

    picker.addEventListener('input', syncValue);
    syncValue();
}

async function fetchFromServer(path, request) {
    try {
        const response = await fetch(path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
            cache: 'no-cache'
        });

        if (!response.ok) {
            console.error('Fetch response:', response, 'request:', request);
            alert(`Error HTTP ${response.status} en consulta al servidor`);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Fetch error:', error, 'request:', request);
        alert(`Error conectando con el servidor: ${error}`);
        return null;
    }
}

function buildBoardMarkup(size) {
    const elements = [];
    for (let i = 1; i < size; i++) {
        for (let j = 1; j < size; j++) {
            const id = `${i}-${j}`;
            elements.push(
                BOX_TEMPLATE
                    .replace(/@H/g, `${id}-h`)
                    .replace(/@V/g, `${id}-v`)
                    .replace(/@C/g, id)
            );
        }
        elements.push(LAST_LEFT_LINE_TEMPLATE.replace(/@V/g, `${i}-${size}-v`));
    }

    for (let j = 1; j < size; j++) {
        elements.push(LAST_TOP_LINE_TEMPLATE.replace(/@H/g, `${size}-${j}-h`));
    }

    return elements.join('');
}

function bindUiEvents() {
    if (uiBound) {
        return;
    }

    document.getElementById('new_game_btn').addEventListener('click', handleNewGameBtn);
    document.getElementById('suggestion_btn').addEventListener('click', handleSuggestionBtn);
    document.getElementById('game_div').addEventListener('click', handleBoardClick);
    setupLevelPicker();
    uiBound = true;
}

function renderPage() {
    bindUiEvents();
}

function handleBoardClick(event) {
    const line = event.target.closest('.playable-line');
    if (!line || line.classList.contains('marked-line')) {
        return;
    }
    clickOnLine(line.id);
}

async function startNewGame() {
    const size = readIntInput('size_txt', 3, 2, 8) + 1;
    const queryResult = await fetchFromServer('/json', {
        query: `tablero(${size},Tablero).`
    });

    if (!queryResult) {
        return;
    }

    handleNewGameResult(queryResult, size);
}

async function handleNewGameBtn(event) {
    event.preventDefault();
    await startNewGame();
}

function handleNewGameResult(queryResult, size) {
    if (!queryResult.success || queryResult.error !== '') {
        return;
    }

    const tablero = getQueryResultVar(queryResult, 'Tablero');
    if (!tablero) {
        return;
    }

    gameOver = false;
    document.tablero = tablero;
    document.getElementById('p1_lbl').textContent = '0';
    document.getElementById('p2_lbl').textContent = '0';
    document.getElementById('turno_lbl').textContent = '1';
    document.getElementById('sugerencia_lbl').textContent = '';

    const board = document.getElementById('game_div');
    board.style.display = 'block';
    board.innerHTML = buildBoardMarkup(size);
    setBoardInteractive(true);
    siguienteTurno();
}

async function handleSuggestionBtn(event) {
    event.preventDefault();
    if (!document.tablero || gameOver) {
        return;
    }

    const turno = document.getElementById('turno_lbl').textContent;
    const level = readIntInput('nivel', 2, 1, 6);
    const queryResult = await fetchFromServer('/json', {
        query: `sugerencia_jugada(${document.tablero},${turno},${level},F,C,D).`
    });

    const label = document.getElementById('sugerencia_lbl');
    if (!queryResult || !queryResult.success || queryResult.error !== '') {
        label.textContent = '-';
        return;
    }

    const fila = getQueryResultVar(queryResult, 'F');
    const columna = getQueryResultVar(queryResult, 'C');
    const dir = getQueryResultVar(queryResult, 'D');
    label.textContent = `${fila}-${columna}-${dir}`;
}

async function clickOnLine(id) {
    if (!document.tablero || gameOver) {
        return;
    }

    const turno = document.getElementById('turno_lbl').textContent;
    if (!document.getElementById(`j${turno}_h`).checked) {
        return;
    }

    const parts = id.split('-');
    if (parts.length !== 4) {
        return;
    }

    document.getElementById('sugerencia_lbl').textContent = '';
    const [, fila, columna, direccion] = parts;
    setBoardInteractive(false);

    const queryResult = await fetchFromServer('/json', {
        query: `jugada_humano(${document.tablero},${turno},${fila},${columna},${direccion},Tablero2,Turno2,Celdas).`
    });

    if (!queryResult || !queryResult.success || queryResult.error !== '') {
        setBoardInteractive(true);
        return;
    }

    markLine(id, turno);
    document.tablero = getQueryResultVar(queryResult, 'Tablero2');
    document.getElementById('turno_lbl').textContent = getQueryResultVar(queryResult, 'Turno2');

    const celdas = parseCapturedCells(getQueryResultVar(queryResult, 'Celdas'));
    paintCapturedCells(celdas, turno);
    updateScore(turno, celdas.length);
    siguienteTurno();
}

async function siguienteTurno() {
    if (!document.tablero) {
        return;
    }

    document.getElementById('sugerencia_lbl').textContent = '';
    const queryResult = await fetchFromServer('/json', {
        query: `fin_del_juego(${document.tablero},P1,P2,Ganador).`
    });

    if (!queryResult) {
        setBoardInteractive(true);
        return;
    }

    if (queryResult.success && queryResult.error === '') {
        gameOver = true;
        setBoardInteractive(false);
        const p1 = parseInt(getQueryResultVar(queryResult, 'P1'), 10) || 0;
        const p2 = parseInt(getQueryResultVar(queryResult, 'P2'), 10) || 0;

        let ganador = 'Empate';
        if (p1 > p2) {
            ganador = 'Jugador 1';
        } else if (p2 > p1) {
            ganador = 'Jugador 2';
        }

        alert(`Juego terminado\nJugador 1: ${p1}\nJugador 2: ${p2}\nGanador: ${ganador}`);
        return;
    }

    const turno = document.getElementById('turno_lbl').textContent;
    const isMachine = document.getElementById(`j${turno}_m`).checked;
    if (isMachine) {
        setBoardInteractive(false);
        setTimeout(intentarJugadaMaquina, 0);
    } else {
        setBoardInteractive(true);
    }
}

async function intentarJugadaMaquina() {
    if (!document.tablero || gameOver) {
        return;
    }

    const turno = document.getElementById('turno_lbl').textContent;
    const level = readIntInput('nivel', 2, 1, 6);
    const queryResult = await fetchFromServer('/json', {
        query: `jugada_maquina(${document.tablero},${turno},${level},F,C,D,Tablero2,Turno2,Celdas).`
    });

    if (!queryResult || !queryResult.success || queryResult.error !== '') {
        setBoardInteractive(true);
        return;
    }

    const lineId = `line-${getQueryResultVar(queryResult, 'F')}-${getQueryResultVar(queryResult, 'C')}-${getQueryResultVar(queryResult, 'D')}`;
    markLine(lineId, turno);

    document.tablero = getQueryResultVar(queryResult, 'Tablero2');
    document.getElementById('turno_lbl').textContent = getQueryResultVar(queryResult, 'Turno2');
    const celdas = parseCapturedCells(getQueryResultVar(queryResult, 'Celdas'));
    paintCapturedCells(celdas, turno);
    updateScore(turno, celdas.length);
    siguienteTurno();
}

document.addEventListener('DOMContentLoaded', () => {
    bindUiEvents();
    startNewGame();
});
