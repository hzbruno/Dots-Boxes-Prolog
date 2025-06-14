'use strict';

const BOX_TEMPLATE = `
<div class="box show">
    <div class="top" id="line-@H" onclick="clickOnLine(id);"></div>
    <div class="left" id="line-@V" onclick="clickOnLine(id);"></div>
    <div class="inside-cell" id="cell-@C">&nbsp;</div>
</div>
`;

const LAST_LEFT_LINE_TEMPLATE = `
<div class="box show">
    <div class="hidden"></div>
    <div class="left" id="line-@V" onclick="clickOnLine(id);"></div>
    <div class="inside-cell">&nbsp;</div>
</div>
<div class="new-line"></div>
`;

const LAST_TOP_LINE_TEMPLATE = `
<div class="box show">
    <div class="top" id="line-@H" onclick="clickOnLine(id);"></div>
    <div class="hidden"></div>
</div>
`;

function getQueryResultVar(query_result, var_name) {
    for (let i = 0; i < query_result.vars.length; i++) {
        if (query_result.vars[i]["var"] == var_name) {
            return query_result.vars[i]["value"];
        }
    }
    return null;
}

// Send a request to the server and schedule a callback.
async function fetchFromServer(path, request, callback) {
    // callback should take a single arg, the response from the server.
    try {
        const response = await fetch(
            path,
            {method: 'POST',
             headers: {'Content-Type': 'application/json'},
             body: JSON.stringify(request),
             mode: 'cors',                  // Don't need?
             cache: 'no-cache',             // Don't need?
             credentials: 'same-origin',    // Don't need?
             redirect: 'follow',            // Don't need?
             referrerPolicy: 'no-referrer', // Don't need?
            });
        if (response.ok) { // response.status in range 200-299
            callback(await response.json());
        } else {
            console.error('Fetch response:', response, 'request:', request);
            alert('*** fetch ' + JSON.stringify(request) + ': HTTP status: ' + response.status);
        }
    } catch(err) {
        // TODO: the following doesn't capture enough information;
        //       there is interesting information in the console log
        //       such as error code 500 or ERR_CONNECTION_REFUSED
        console.error('Fetch error:', err, 'request:', request);
        alert('***fetch ' + JSON.stringify(request) + ': ' + err);
    }
}

// Called by <body onload="renderPage();">
async function renderPage() {
    // document.getElementById('query_form').addEventListener('submit', handleSubmit);
    document.getElementById('new_game_btn').addEventListener('click', handleNewGameBtn);
    document.getElementById('suggestion_btn').addEventListener('click', handleSuggestionBtn);

        let prolog_query = 'tablero(' + 4 + ',Tablero).';
        await fetchFromServer('/json', {query: prolog_query},
                                query_result => handleNewGameResult(query_result, 4));
}

async function handleNewGameBtn(event) {
  event.preventDefault();

  let size_val = parseInt(document.getElementById('size_txt').value) + 1;
  let prolog_query = 'tablero(' + size_val + ',Tablero).';
  await fetchFromServer('/json', {query: prolog_query},
                        query_result => handleNewGameResult(query_result, size_val));
}

function handleNewGameResult(query_result, size_val) {
    if (query_result.success && query_result.error == "") {
        document.tablero = getQueryResultVar(query_result, "Tablero");
        document.getElementById('status_div').style.display = "block";

        document.getElementById('p1_lbl').innerHTML = "0";
        document.getElementById('p2_lbl').innerHTML = "0";
        document.getElementById('turno_lbl').innerHTML = "1";

        let game_div = document.getElementById('game_div');
        game_div.style.display = "block";


        let elements = [];
        for (let i = 1; i < size_val; i++) {
            for (let j = 1; j < size_val; j++) {
                let current_id = i + "-" + j;
                elements.push(BOX_TEMPLATE.replace('@H',current_id + "-h").replace('@V',current_id + "-v").replace('@C',current_id));
            }
            let current_id = i + "-" + size_val;
            elements.push(LAST_LEFT_LINE_TEMPLATE.replace('@V',current_id + "-v"));
        }
        for (let j = 1; j < size_val; j++) {
            let current_id = size_val + "-" + j;
            elements.push(LAST_TOP_LINE_TEMPLATE.replace('@H',current_id + "-h"));
        }
        game_div.innerHTML = elements.join("");
        siguienteTurno();
    }
}

async function handleSuggestionBtn(event) {
  event.preventDefault();
  let tablero = document.tablero;
  let turno = document.getElementById('turno_lbl').innerHTML;
  const nivel = document.getElementById('nivel').value;
  let prolog_query = 'sugerencia_jugada(' + [tablero,turno,nivel].join(',') + ',F,C,D).';
  await fetchFromServer('/json', {query: prolog_query},
                        query_result => handleSuggestionResult(query_result));
}

function handleSuggestionResult(query_result) {
  if (query_result.success && query_result.error == "") {
      let fila = getQueryResultVar(query_result, "F");
      let columna = getQueryResultVar(query_result, "C");
      let dir = getQueryResultVar(query_result, "D");
      document.getElementById('sugerencia_lbl').innerHTML = fila + "-" + columna + "-" + dir;
  }
}

async function clickOnLine(id) {
    // Remove current suggestion if there is one
    document.getElementById('sugerencia_lbl').innerHTML = "";
    // Check if the current player is human
    let turno = document.getElementById('turno_lbl').innerHTML;
    if (!document.getElementById('j' + turno + '_h').checked) {
        return;
    }
    let id_parts = id.split("-");
    let fila = id_parts[1];
    let columna = id_parts[2];
    let direccion = id_parts[3];
    let prolog_query = 'jugada_humano(' + [document.tablero,turno,fila,columna,direccion].join(',') + ',Tablero2,Turno2,Celdas).';
    await fetchFromServer('/json', {query: prolog_query},
                          query_result => handleClickOnLineResult(query_result, id, turno));
}

function handleClickOnLineResult(query_result, id, turno) {
    if (query_result.success && query_result.error == "") {
    let linea = document.getElementById(id);
    if(turno == 1){linea.classList.add('marked-line','blue-line');}
    else{linea.classList.add('marked-line','red-line');}

        document.tablero = getQueryResultVar(query_result, "Tablero2");
        document.getElementById('turno_lbl').innerHTML = getQueryResultVar(query_result, "Turno2");
        let celdas = JSON.parse(getQueryResultVar(query_result, "Celdas"));
        for (let i = 0; i < celdas.length; i++) {
            let fila = celdas[i][0];
            let columna = celdas[i][1];
            let cell = document.getElementById('cell-' + fila + '-' + columna);
            cell.innerHTML = turno;
            if(turno == 1)cell.classList.add("blue");
            else cell.classList.add("red");
        }
        let puntos_lbl_id = 'p' + turno + '_lbl';
        document.getElementById(puntos_lbl_id).innerHTML = parseInt(document.getElementById(puntos_lbl_id).innerHTML) + celdas.length;
        siguienteTurno();
    }
}

async function siguienteTurno() {
    let tablero = document.tablero;
    let prolog_query = 'fin_del_juego(' + tablero + ',P1,P2,Ganador).';
    await fetchFromServer('/json', {query: prolog_query},
                        query_result => handleGameOverResult(query_result));
}

async function handleGameOverResult(query_result) {
  if (query_result.success && query_result.error == "") {
      // The game is over
      let p1 = getQueryResultVar(query_result, "P1");
      let p2 = getQueryResultVar(query_result, "P2");
      let ganador = getQueryResultVar(query_result, "Ganador");
      alert("Fin del juego!\nPuntos jugador 1: " + p1 + "\nPuntos jugador 2: " + p2 + "\n" + ganador);
      return;
  } else {
    // The game is not over, check if the current player is the computer
    let turno = document.getElementById('turno_lbl').innerHTML;
    let jugador_m_id = 'j' + turno + '_m';
    if (document.getElementById(jugador_m_id).checked) {
        // Perform the next computer move
        // jugada_maquina(+M,+Turno,+P1,+P2,+Nivel,-M2,-F,-C,-D,-Turno2,-P1b,-P2b,-Celdas)
        document.getElementById('sugerencia_lbl').innerHTML = "";
        let tablero = document.tablero;
        let turno = document.getElementById('turno_lbl').innerHTML;
        const nivel = document.getElementById('nivel').value;
        let prolog_query = 'jugada_maquina(' + [tablero,turno,nivel].join(',') + ',F,C,D,Tablero2,Turno2,Celdas).';
        await fetchFromServer('/json', {query: prolog_query},
                              query_result => handleComputerMoveResult(query_result, turno));
    }
  }
}

function handleComputerMoveResult(query_result, turno) {
    if (query_result.success && query_result.error == "") {
        let line_id = "line-" + getQueryResultVar(query_result, "F") + '-' + getQueryResultVar(query_result, "C") + '-' + getQueryResultVar(query_result, "D")
    
    let linea = document.getElementById(line_id);
    if(turno == 1){linea.classList.add('marked-line','blue-line');}
    else{linea.classList.add('marked-line','red-line');}

        document.tablero = getQueryResultVar(query_result, "Tablero2");
        document.getElementById('turno_lbl').innerHTML = getQueryResultVar(query_result, "Turno2");
        let celdas = JSON.parse(getQueryResultVar(query_result, "Celdas"));
        for (let i = 0; i < celdas.length; i++) {
            let fila = celdas[i][0];
            let columna = celdas[i][1];
            let cell = document.getElementById('cell-' + fila + '-' + columna);
            cell.innerHTML = turno;
            if(turno == 1)cell.classList.add("blue");
            else cell.classList.add("red");
            
        }
        let puntos_lbl_id = 'p' + turno + '_lbl';
        document.getElementById(puntos_lbl_id).innerHTML = parseInt(document.getElementById(puntos_lbl_id).innerHTML) + celdas.length;
        siguienteTurno();
    }
}

// Sanitize a string, allowing tags to not cause problems
function sanitizeText(raw_str) {
    // There shouldn't be a need for .replace(/ /g, '&nbsp;') if CSS
    // has white-space:pre ... but by experiment, it's needed.
    // TODO: remove the '<br/>' insertion and put it into extract_color.pl.
    return raw_str ? (raw_str
                      .replace(/&/g, '&amp;')
                      .replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;')
                      .replace(/"/g, '&quot;')
                      .replace(/'/g, '&apos;')
                      .replace(/\n/g, '<br/>')  // TODO: remove - not needed?
                      .replace(/\s/g, '&nbsp;'))  // TODO: add test for tabs in source
        : raw_str;
}
