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

const session = pl.create();
let uiBound = false;
let gameOver = false;

function readIntInput(id, fallback, min, max) {
  const raw = parseInt(document.getElementById(id).value, 10);
  if (Number.isNaN(raw)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, raw));
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
  const prev = parseInt(scoreLabel.textContent, 10) || 0;
  scoreLabel.textContent = String(prev + delta);
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

function queryProlog(goal, onSuccess, onFail) {
  session.query(goal, {
    success: () => session.answer({
      success: answer => {
        if (answer === false) {
          if (onFail) {
            onFail();
          }
          return;
        }

        const result = {};
        Object.keys(answer.links).forEach(varName => {
          result[varName] = answer.links[varName].toString();
        });
        onSuccess(result);
      },
      fail: () => {
        if (onFail) {
          onFail();
        }
      },
      error: err => {
        if (err.indicator === 'throw/1' || err.indicator === '+/1') {
          if (onFail) {
            onFail();
          }
        } else {
          console.error('Error en answer():', err);
          if (onFail) {
            onFail();
          }
        }
      }
    }),
    error: err => {
      console.error('Error en query():', err);
      if (onFail) {
        onFail();
      }
    }
  });
}

function buildBoardMarkup(size) {
  const elements = [];

  for (let i = 1; i < size; i++) {
    for (let j = 1; j < size; j++) {
      const idBase = `${i}-${j}`;
      elements.push(
        BOX_TEMPLATE
          .replace(/@H/g, `${idBase}-h`)
          .replace(/@V/g, `${idBase}-v`)
          .replace(/@C/g, idBase)
      );
    }

    const lastBase = `${i}-${size}`;
    elements.push(LAST_LEFT_LINE_TEMPLATE.replace(/@V/g, `${lastBase}-v`));
  }

  for (let j = 1; j < size; j++) {
    const idBase = `${size}-${j}`;
    elements.push(LAST_TOP_LINE_TEMPLATE.replace(/@H/g, `${idBase}-h`));
  }

  return elements.join('');
}

async function loadProlog() {
  try {
    const response = await fetch('dotsboxes.pl');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const code = await response.text();
    session.consult(code, {
      success: () => {
        startNewGame();
      },
      error: err => {
        console.error('Excepcion al cargar Prolog:', err.args ? err.args[0] : err);
      }
    });
  } catch (error) {
    console.error('No se pudo leer dotsboxes.pl:', error);
  }
}

function startNewGame() {
  const size = readIntInput('size_txt', 3, 2, 8) + 1;
  queryProlog(
    `tablero(${size}, Tablero).`,
    result => handleNewGameResult(result, size),
    () => alert('No se pudo generar el tablero')
  );
}

function handleNewGameBtn(event) {
  event.preventDefault();
  startNewGame();
}

function handleNewGameResult(result, size) {
  const tableroStr = result.Tablero;
  if (!tableroStr) {
    alert('Tablero indefinido');
    return;
  }

  gameOver = false;
  document.tablero = tableroStr;
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

function handleSuggestionBtn(event) {
  event.preventDefault();
  if (!document.tablero || gameOver) {
    return;
  }

  const turno = document.getElementById('turno_lbl').textContent;
  const level = readIntInput('nivel', 2, 1, 6);
  const suggestionLabel = document.getElementById('sugerencia_lbl');
  suggestionLabel.textContent = '';

  const goal = `sugerencia_jugada(${document.tablero},${turno},${level},F,C,D).`;
  queryProlog(
    goal,
    ans => {
      suggestionLabel.textContent = `${ans.F}-${ans.C}-${ans.D}`;
    },
    () => {
      suggestionLabel.textContent = '-';
    }
  );
}

function clickOnLine(id) {
  if (!document.tablero || gameOver) {
    return;
  }

  document.getElementById('sugerencia_lbl').textContent = '';
  const turno = document.getElementById('turno_lbl').textContent;
  if (document.getElementById(`j${turno}_m`).checked) {
    return;
  }

  const parts = id.split('-');
  if (parts.length !== 4) {
    return;
  }

  const [, row, col, dir] = parts;
  const goal = `jugada_humano(${document.tablero},${turno},${row},${col},${dir},Tab2,Turno2,Cs).`;

  setBoardInteractive(false);
  queryProlog(
    goal,
    vars => {
      markLine(id, turno);
      document.tablero = vars.Tab2;
      document.getElementById('turno_lbl').textContent = vars.Turno2;
      const capturedCells = parseCapturedCells(vars.Cs);
      paintCapturedCells(capturedCells, turno);
      updateScore(turno, capturedCells.length);
      siguienteTurno();
    },
    () => {
      setBoardInteractive(true);
    }
  );
}

function siguienteTurno() {
  document.getElementById('sugerencia_lbl').textContent = '';
  queryProlog(
    `fin_del_juego(${document.tablero},P1,P2,Ganador).`,
    ans => {
      gameOver = true;
      setBoardInteractive(false);
      const p1 = parseInt(ans.P1, 10) || 0;
      const p2 = parseInt(ans.P2, 10) || 0;

      let winner = 'Empate';
      if (p1 > p2) {
        winner = 'Jugador 1';
      } else if (p2 > p1) {
        winner = 'Jugador 2';
      }

      alert(
        `Juego terminado\n` +
        `Jugador 1: ${p1} puntos\n` +
        `Jugador 2: ${p2} puntos\n` +
        `Ganador: ${winner}`
      );
    },
    () => {
      const turno = document.getElementById('turno_lbl').textContent;
      const machineTurn = document.getElementById(`j${turno}_m`).checked;
      if (machineTurn) {
        setBoardInteractive(false);
        setTimeout(intentarJugadaMaquina, 0);
      } else {
        setBoardInteractive(true);
      }
    }
  );
}

function intentarJugadaMaquina() {
  if (gameOver) {
    return;
  }

  const turno = document.getElementById('turno_lbl').textContent;
  const level = readIntInput('nivel', 2, 1, 6);
  const goal = `jugada_maquina(${document.tablero},${turno},${level},F,C,D,Tab2,Turno2,Cs).`;

  queryProlog(
    goal,
    vars => {
      const lineId = `line-${vars.F}-${vars.C}-${vars.D}`;
      markLine(lineId, turno);

      document.tablero = vars.Tab2;
      document.getElementById('turno_lbl').textContent = vars.Turno2;
      const capturedCells = parseCapturedCells(vars.Cs);
      paintCapturedCells(capturedCells, turno);
      updateScore(turno, capturedCells.length);
      siguienteTurno();
    },
    () => {
      console.warn('No se pudo obtener jugada de maquina');
      setBoardInteractive(true);
    }
  );
}

document.addEventListener('DOMContentLoaded', () => {
  bindUiEvents();
  loadProlog();
});

