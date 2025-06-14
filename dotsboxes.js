'use strict';

// ------------------------------------------------------
// 2. Templates HTML para dibujar el tablero
// ------------------------------------------------------
const BOX_TEMPLATE = `
<div class="box show">
  <div class="top" id="line-@H" onclick="clickOnLine('line-@H')"></div>
  <div class="left" id="line-@V" onclick="clickOnLine('line-@V')"></div>
  <div class="inside-cell" id="cell-@C">&nbsp;</div>
</div>
`;

const LAST_LEFT_LINE_TEMPLATE = `
<div class="box show">
  <div class="hidden"></div>
  <div class="left" id="line-@V" onclick="clickOnLine('line-@V')"></div>
  <div class="inside-cell">&nbsp;</div>
</div>
<div class="new-line"></div>
`;

const LAST_TOP_LINE_TEMPLATE = `
<div class="box show">
  <div class="top" id="line-@H" onclick="clickOnLine('line-@H')"></div>
  <div class="hidden"></div>
</div>
`;

'use strict';

const session = pl.create();


async function loadProlog() {
  try {
    // Si main.js y prologCode.pl están en la misma carpeta,
    // y tu HTML los carga desde esa carpeta,
    // esta ruta buscará justamente prologCode.pl ahí:
    const resp = await fetch('dotsboxes.pl');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const code = await resp.text();

    session.consult(code, {
      success: () => {
        console.log('Prolog cargado desde prologCode.pl');

          const size = +document.getElementById('size_txt').value + 1;

          // Consultamos tablero(Size, Tablero).
          queryProlog(
            `tablero(${size}, Tablero).`,
            result => handleNewGameResult(result, size),
            () => alert("No se pudo generar el tablero")
          );



        renderPage();
        // Iniciar el juego      
      },
      error: err => console.log("Excepción al cargar:", err.args[0])
    });
  } catch (e) {
    console.error('No se pudo leer prologCode.pl:', e);
  }
}

document.addEventListener('DOMContentLoaded', loadProlog);

// ------------------------------------------------------
// 4. Función genérica de consulta
// ------------------------------------------------------
function queryProlog(goal, onSuccess, onFail) {
  session.query(goal, {
    success: () => session.answer({
      success: answer => {
        if (answer === false) {
          // No hay soluciones (fail)
          if (onFail) onFail();
        } else {
          // Construimos un objeto { X: "valor", ... }
          const res = {};
          for (let v in answer.links) res[v] = answer.links[v].toString();
          onSuccess(res);
        }
      },
      fail: () => {
        // Goal fail
        if (onFail) onFail();
      },
      error: err => {
        // Si es un throw/1 o un error de "+/1" (literal numérico unario), lo tratamos como fail en lugar de error
        if (err.indicator === "throw/1" || err.indicator === "+/1") {
          if (onFail) onFail();
        } else {
          console.error("Error en answer():", err);
          if (onFail) onFail();
        }
      }
    }),
    error: err => {
      console.error("Error en query():", err);
      if (onFail) onFail();
    }
  });
}



// ------------------------------------------------------
// 5. Helpers de UI
// ------------------------------------------------------
function renderPage() {
  document.getElementById('new_game_btn').addEventListener('click', handleNewGameBtn);
  document.getElementById('suggestion_btn').addEventListener('click', handleSuggestionBtn);
}

function getQueryResultVar(obj, varName) {
  return obj[varName];
}

// ------------------------------------------------------
// 6. Handlers del juego
// ------------------------------------------------------
function handleNewGameBtn(event) {
  event.preventDefault();
  const size = parseInt(document.getElementById('size_txt').value)+1;
  // Consultamos tablero(Size, Tablero).
  queryProlog(
    `tablero(${size}, Tablero).`,
    result => handleNewGameResult(result, size),
    () => alert("No se pudo generar el tablero")
  );
}

function handleNewGameResult(result, size) {
  const tableroStr = result.Tablero;
  if (!tableroStr) return alert("Tablero indefinido");

  document.tablero = tableroStr;
  
  document.getElementById('p1_lbl').textContent = "0";
  document.getElementById('p2_lbl').textContent = "0";
  document.getElementById('turno_lbl').textContent = "1";

  const container = document.getElementById('game_div');
  container.style.display = "block";
  const elems = [];

  // Para cada fila (i = 1 .. size-1)
  for (let i = 1; i < size; i++) {
    // Dentro de la fila, todas las cajas regulares
    for (let j = 1; j < size; j++) {
      const idBase = `${i}-${j}`;
      elems.push(
        BOX_TEMPLATE
          .replace(/@H/g, idBase + "-h")
          .replace(/@V/g, idBase + "-v")
          .replace(/@C/g, idBase)
      );
    }
    // Al final de la fila, la caja de la última línea vertical + el new-line
    const lastBase = `${i}-${size}`;
    elems.push(
      LAST_LEFT_LINE_TEMPLATE.replace(/@V/g, lastBase + "-v")
    );
    
  }

  // Después de todas las filas de cajas, la última fila de líneas horizontales
  for (let j = 1; j < size; j++) {
    const idBase = `${size}-${j}`;
    elems.push(
      LAST_TOP_LINE_TEMPLATE.replace(/@H/g, idBase + "-h")
    );
  }

  container.innerHTML = elems.join("");
  // No iniciar siguienteTurno en nueva partida; espera acción del usuario
  siguienteTurno();
}

// ----------------------------------------------------------------
// Manejo de sugerencia de jugada
// ----------------------------------------------------------------
function handleSuggestionBtn(event) {
  event.preventDefault();
  const turno = document.getElementById('turno_lbl').textContent;
  const lbl    = document.getElementById('sugerencia_lbl');
  const nivel = document.getElementById('nivel').value;
  lbl.textContent = "";

  const goal = `sugerencia_jugada(${document.tablero},${turno},${nivel},F,C,D).`;


  session.query(goal, {
    success: () => session.answer({
      success: ans => {
        if (ans === false) {
          lbl.textContent = "—";
          console.warn("No hay jugadas posibles");
        } else {
          const F = ans.links.F.toString();
          const C = ans.links.C.toString();
          const D = ans.links.D.toString();
          lbl.textContent = `${F}-${C}-${D}`;
        }
      },
      fail: () => lbl.textContent = "—",
      error: err => {
        lbl.textContent = "—";
        const errorTerm = err.args[0];        // Term error/2
        const [errorType, errorCtx] = errorTerm.args;
        console.error('Tipo de error:', errorType.toString());
        console.error('Contexto:', errorCtx.toString());
      }
    }),
    error: err => console.error("Error parseando simple_sugerencia:", err)
  });
}




// ------------------------------------------------------
// Manejo de jugada: clic en línea y siguiente turno
// ------------------------------------------------------
function clickOnLine(id) {
  // Limpiar sugerencia previa
  document.getElementById('sugerencia_lbl').textContent = "";
  const turno = document.getElementById('turno_lbl').textContent;
  const [_, f, c, d] = id.split('-');
  if(document.getElementById(`j${turno}_m`).checked)return;
  const goal = `jugada_humano(${document.tablero},${turno},${f},${c},${d},Tab2,Turno2,Cs).`;
  queryProlog(goal, vars => {
    // Marcar línea
      const linea = document.getElementById(id);
      if(turno == 1){linea.classList.add('marked-line','blue-line');}
      else{linea.classList.add('marked-line','red-line');}
    // Actualizar tablero y turno
    document.tablero = vars.Tab2;
    document.getElementById('turno_lbl').textContent = vars.Turno2;
    // Pintar celdas capturadas y actualizar puntuación
    const capturadas = JSON.parse(vars.Cs);
    capturadas.forEach(([rf, rc]) => {
      const cell = document.getElementById(`cell-${rf}-${rc}`);
      if (cell){
          cell.textContent = turno;
          if(turno == 1)cell.classList.add("blue");
          else cell.classList.add("red");
      } 
    });
    const scoreLbl = document.getElementById(`p${turno}_lbl`);
    scoreLbl.textContent = parseInt(scoreLbl.textContent, 10) + capturadas.length;
    // Si no captura, cambio de turno la maneja Prolog; de lo contrario, se mantiene
    siguienteTurno();
  });
}

function siguienteTurno() {
  // Limpia cualquier sugerencia previa
  document.getElementById('sugerencia_lbl').textContent = "";

  const goal = `fin_del_juego(${document.tablero},P1,P2,Ganador).`;

  queryProlog(
    goal,
    // onSuccess: el juego ha terminado
    ans => {
      let winner = "empate";
      if(ans.P1 > ans.P2) {winner = "Jugador 1"}
      else if(ans.P2 > ans.P1) {winner = "Jugador 2"}
      alert(
        `🎉 ¡Juego terminado! 🎉\n` +
        `Jugador 1: ${ans.P1} puntos\n` +
        `Jugador 2: ${ans.P2} puntos\n` +
        `Ganador: ${winner}\n` +
        `¡Gracias por jugar!`
      );
    },
    // onFail: aún no hay ganador → turno de máquina si está seleccionado
    () => {
      const turno = document.getElementById('turno_lbl').textContent;
      const jugadorMaquina = document.getElementById(`j${turno}_m`).checked;
      if (jugadorMaquina) {
        intentarJugadaMaquina();
      }
    }
  );
}



function intentarJugadaMaquina() {
  const turno =document.getElementById('turno_lbl').textContent;
  const nivel = document.getElementById(`nivel`).value;
  const goal = `jugada_maquina(${document.tablero},${turno},${nivel},F,C,D,Tab2,Turno2,Cs).`;
  queryProlog(
    goal,
    vars => {
      // idéntico a handleComputerMoveResult
      const lineId = `line-${vars.F}-${vars.C}-${vars.D}`;
      const linea = document.getElementById(lineId);
      if(turno == 1){linea.classList.add('marked-line','blue-line');}
      else{linea.classList.add('marked-line','red-line');}

      document.tablero = vars.Tab2;
      document.getElementById('turno_lbl').textContent = vars.Turno2;
      JSON.parse(vars.Cs).forEach(([rf,rc]) => {
        document.getElementById(`cell-${rf}-${rc}`).textContent = turno;
      });
      const lbl = document.getElementById(`p${turno}_lbl`);
      lbl.textContent = parseInt(lbl.textContent, 10) + JSON.parse(vars.Cs).length;
      // tras la IA, volvemos a comprobar fin de juego / siguiente turno
      siguienteTurno();
    },
    () => console.warn("No se pudo obtener jugada de máquina")
  );
}

