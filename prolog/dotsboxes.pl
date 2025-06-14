:- module(dotsboxes,
[
tablero/2, % tablero(+N,?Tablero)
% Devuelve un tablero de tamaño N vacío, o sea una matriz que representa un
% tablero vacío de juego como la descrita en la letra del laboratorio.

fin_del_juego/4, % fin_del_juego(+Tablero,?P1,?P2,?Ganador)
% Dado un tablero, el predicado es verdadero si el tablero representa un juego
% finalizado, y devuelve % la cantidad de puntos del jugador 1 en P1, la
% cantidad de puntos del jugador 2 en P2, y un string % que indica si alguno
% ganó, en el formato: “Gana el jugador 1”, “Gana el jugador 2”, o “Empate”.
% En caso de que no sea el fin del juego, el predicado falla.
 
jugada_humano/8, % jugada_humano(+Tablero,+Turno,+F,+C,+D,?Tablero2,?Turno2,?Celdas)
% Se le envía un tablero, de quién es el turno (1 o 2) y la línea elegida por el
% jugador humano con las variables F-C-D, y devuelve: el tablero modificado con
% la línea maCada (y celdas maCadas en caso de que sea necesario), de quién es
% el siguiente turno (Turno2), y una lista de celdas que se capturaron con esta
% acción en formato [Fila,Columna]. Por ejemplo: [[1,2],[1,3]]

jugada_maquina/9, % jugada_maquina(+Tablero,+Turno,+Nivel,?F,?C,?D,?Tablero2,?Turno2,?Celdas)
% Se le envía un tablero, de quién es el turno (1 o 2) y el Nivel de minimax,
% debe elegir una jugada a realizar por el jugador controlado por la computadora.
% El predicado devuelve: el tablero modificado luego de la jugada, de quién es
% el siguiente turno (Turno2), y una lista de celdas que se cerraron con esta
% acción en formato [Fila,Columna], de la misma forma que en el predicado anterior.

sugerencia_jugada/6 % sugerencia_jugada(+Tablero,+Turno,+Nivel,?F,?C,?D)
% Utiliza la estrategia de minimax para calcular una buena jugada para sugerirle
% a un jugador humano.
]).
%%------------------------------------------------------------------------
%% tablero
%%------------------------------------------------------------------------

% tablero(+N,?Tablero)
tablero(N, Tablero) :-
    integer(N), N > 0,
    length(Filas, N),                      % crea lista de N elementos no instanciados
    maplist(haceFila(N), Filas),          % para cada elemento, unifica con fila/… inicializada
    Tablero =.. [matriz|Filas].            % construye matriz(F1,…,FN)

% haceFila(+N,?Fila)
haceFila(N, Fila) :-
    length(Celdas, N),                     % lista de N celdas
    maplist(=(c(false,false,0)), Celdas),  % todas las celdas = c(false,false,0)
    Fila =.. [fila|Celdas].                % construye fila(C1,…,CN) 

%%------------------------------------------------------------------------
%% fin del juego
%%------------------------------------------------------------------------

% fin_del_juego(+Tablero,?P1,?P2,?Ganador)
fin_del_juego(Tab, P1, P2, Ganador) :-
    contar_puntos(Tab, P1, P2, C),
    C = 0, % Si hay al menos un cero entonces el juego no termino
    ( P1 > P2 -> Ganador = "Gana el jugador 1"
    ; P2 > P1 -> Ganador = "Gana el jugador 2"
    ;             Ganador = "Empate"
    ).

%%------------------------------------------------------------------------
%% Jugada humana y máquina
%%------------------------------------------------------------------------

% jugada_humano(+Tablero,+Turno,+F,+C,+D,?Tablero2,?Turno2,?Celdas)
jugada_humano(Tab, Turno, F, C, D, Tab2, Turno2, Celdas) :-
    functor(Tab, matriz, N),                     % obtengo N, tamaño matriz
    movValido(Tab, F, C, D, N),                            % verifico si la jugada es válida
    marcoLinea(Tab, Turno, F, C, D, TabTemp, Celdas),        % marco la linea
    ( Celdas == [] -> switch(Turno, Turno2) ; Turno2 = Turno ),     % si no hay captura cambio el turno, sino lo mantengo
    Tab2 = TabTemp.     % actualizo al nuevo tablero

% jugada_maquina(+Tablero,+Turno,+Nivel,?F,?C,?D,?Tablero2,?Turno2,?Celdas)
jugada_maquina(Tab, Turno, Nivel, F, C, D, Tab2, Turno2, Caps) :-
    sugerencia_jugada(Tab, Turno, Nivel, F, C, D),          % obtengo la mejor jugada posible
    jugada_humano(Tab, Turno, F, C, D, Tab2, Turno2, Caps). % realizo la jugada como si fuera un humano

%%------------------------------------------------------------------------
%% Sugerencia y minimax
%%------------------------------------------------------------------------

% sugerencia_jugada(+Tablero,+Turno,+Nivel,?F,?C,?D)
sugerencia_jugada(Tab, Turno, Nivel, F, C, D) :-
    jugadas_posibles(Tab, Jugadas),
    mejor_jugada(Jugadas, Tab, Turno, Nivel, -1000000, none, F, C, D, Turno).

% mejor_jugada(+Jugadas, +Tablero, +Turno, +Nivel, +MejorValor, +MejorJugada, -F, -C, -D, +Orig)
mejor_jugada([], _, _, _, _, [F0,C0,D0], F0, C0, D0, _).    % no hay jugadas posibles
mejor_jugada([[F1,C1,D1]|R], Tab, Turno, Nivel, MV, MJ, F, C, D, Orig) :-
    marcoLinea(Tab, Turno, F1, C1, D1, Tab2, Caps),          % maCo la linea obteniendo un nuevo tablero
    ( Caps == [] -> switch(Turno, T2) ; T2 = Turno ),       % si no hay captura cambio el turno, sino lo mantengo
    N1 is Nivel-1,                                          % disminuyo el nivel    
    minimax(Tab2, T2, N1, -1000000, 1000000, V, Orig),      % llamo a minimax para obtener el valor de la jugada
    ( V > MV                                                % si el valor es mayor al máximo tengo que actualizar mejorValor y mejorJugada
      -> mejor_jugada(R, Tab, Turno, Nivel, V, [F1,C1,D1], F, C, D, Orig)
      ;  mejor_jugada(R, Tab, Turno, Nivel, MV, MJ,F, C, D, Orig)   % sino las mantengo
    ).

% minimax(+Tab, +Turno, +Nivel, +Alpha, +Beta, -Valor, +Orig)
%utilizamos minmax con poda alpha-beta
minimax(Tab, _, 0, _, _, Valor, Orig) :- !, heuristica(Tab, Orig, Valor). % caso base, depth = 0
minimax(Tab, _, _, _, _, Valor, Orig) :-
    fin_del_juego(Tab, _, _, _), !, heuristica(Tab, Orig, Valor). % caso base, node is a terminal node
minimax(Tab, Turno, Nivel, A, B, Valor, Orig) :-
    jugadas_posibles(Tab, Js),      % obtengo las jugadas posibles
    switch(Turno, Otro),            % obtengo el turno del otro jugador
    N1 is Nivel-1,                  % disminuyo el nivel
    ( Turno = Orig                  % turno del que llama -> maximizo, sino minimizo
      -> max_valor(Js, Tab, Turno, Otro, N1, A, B, -1000000, Valor, Orig)
      ;  min_valor(Js, Tab, Turno, Otro, N1, A, B,  1000000, Valor, Orig)
    ).

% max_valor(+Jugadas, +Tab, +Turno, +Otro, +Nivel, +Alpha, +Beta, +M0, -MF, +Orig)
% Caso base: sin jugadas, el mejor es el acumulado
max_valor([], _, _, _, _, _, _, MV, MV, _).
max_valor([[F,C,D]|R], Tab, T, O, N, A, B, M0, MF, Orig) :-
    marcoLinea(Tab, T, F, C, D, Tab2, Caps),    % aplica jugada y obtiene capturas
    ( Caps == [] -> switch(T, T2) ; T2 = T ),  % ajusta turno si no hubo captura
    minimax(Tab2, T2, N, A, B, V, Orig),    % evaluación con minimax
    M1 is max(M0,V),    % actualiza máximo y alpha
    A1 is max(A,M1),
    ( B =< A1 -> MF = M1    % poda beta si alpha ≥ beta
    ; max_valor(R, Tab, T, O, N, A1, B, M1, MF, Orig)  % Sino, sigue buscando en el resto      
    ).

% min_valor(+Jugadas, +Tab, +Turno, +Otro, +Nivel, +Alpha, +Beta, +M0, -MF, +Orig)
% Caso base: sin jugadas, el peor es el acumulado
min_valor([], _, _, _, _, _, _, M0, M0, _).
min_valor([[F,C,D]|R], Tab, T, O, N, A, B, M0, MF, Orig) :-
    marcoLinea(Tab, T, F, C, D, Tab2, Caps),
    ( Caps == [] -> switch(T, T2) ; T2 = T ),
    minimax(Tab2, T2, N, A, B, V, Orig),
    M1 is min(M0,V),
    B1 is min(B,M1),
    ( B1 =< A -> MF = M1
    ; min_valor(R, Tab, T, O, N, A, B1, M1, MF, Orig)
    ).

%%------------------------------------------------------------------------
%% Heurística y conteo de puntos
%%------------------------------------------------------------------------

% heuristica(+Tab, +Turno, -V)
heuristica(Tab, Turno, V) :-
    contar_puntos(Tab, P1, P2, _),  % cuenta puntos de ambos jugadores y descarta vacias
    ( Turno =:= 1 -> V is P1 - P2 ; V is P2 - P1 ).  % si es turno 1,  P1-P2 sino P2-P1

% contar_puntos(+Tab, -P1, -P2, -C0)
% Extrae el subtablero de juego y cuenta celdas para cada jugador
contar_puntos(Tab, P1, P2, C0) :-
    subtablero(Tab, Sub),
    functor(Sub, matriz, N),  % obtengo el tamaño del tablero
    findall(c(H,V,J),
            (
              between(1, N, I),         % para cada fila
              arg(I, Sub, Fila),        % extrae la fila I
              between(1, N, Jc),        % para cada columna
              arg(Jc, Fila, c(H,V,J))   % extrae c(H,V,J)
            ),
            Celdas),
    % Cuenta recursivamente según J: 1->jug1, 2->jug2, 0->vacía
    contar_puntos_directo(Celdas, 0, 0, 0, P1, P2, C0).

% contar_puntos_directo(+ListaCeldas, +Acc1, +Acc2, +Acc0, -P1, -P2, -C0)
contar_puntos_directo([], P1, P2, C0, P1, P2, C0). % caso base cuando no hay celdas, retorna acumulados
contar_puntos_directo([c(_,_,J)|T], A1, A2, A0, P1, P2, C0) :- % caso recursivo: examina cabeza de lista y actualiza contadores
    ( J =:= 1 -> A1n is A1+1, A2n = A2,  A0n = A0
    ; J =:= 2 -> A1n = A1,  A2n is A2+1, A0n = A0
    ;            A1n = A1,  A2n = A2,   A0n is A0+1
    ),
    contar_puntos_directo(T, A1n, A2n, A0n, P1, P2, C0).


%%------------------------------------------------------------------------
%%  Funciones auxiliares
%%------------------------------------------------------------------------

% get_cell(+Tablero, +F, +C, -Cel)
% Dada una matriz Tablero, devuelve la celda en la fila F y columna C
get_cell(Tablero, F, C, Cel) :-
    arg(F, Tablero, Fila),
    arg(C, Fila, Cel).

% update_cell(+Tablero, +F, +C, +NewCel, -Tablero2)
% Dada una matriz Tablero, actualiza la celda en la fila F y columna C
actualizoCelda(Tablero, F, C, NewCel, Tablero2) :-
    % construye nueva lista de filas con la celda (F,C) sustituida
    functor(Tablero, matriz, N),
    numlist(1, N, Is),
    maplist(actualizoFila(F,C,NewCel,Tablero), Is, NuevasFilas),
    Tablero2 =.. [matriz|NuevasFilas].

% actualizoFila(+F,+C,+NewCel,+Tablero,+I,-FilaOut)
% Dada una fila I de la matriz Tablero, actualiza la celda (F,C) con NewCel
actualizoFila(F, C, NewCel, Tab, I, FilaOut) :-
    arg(I, Tab, FilaIn),
    functor(FilaIn, fila, N),
    ( I =:= F ->
        % es la fila donde hay que actualizar la columna C
        numlist(1, N, Js),
        maplist(update_celda(C,NewCel,FilaIn), Js, CeldasOut),
        FilaOut =.. [fila|CeldasOut]
    ;   % fila sin cambios
        FilaOut = FilaIn
    ).

% update_celda(+C,+NewCel,+FilaIn,+J,-CelOut)
% Dada una fila FilaIn, actualiza la celda en la columna C con NewCel
update_celda(C, NewCel, FilaIn, J, CelOut) :-
    ( J =:= C -> CelOut = NewCel
    ;  arg(J, FilaIn, CelOut)
    ).

% subtablero(+Tab, -Sub)
% Dada una matriz Tab, devuelve el subtablero sin la última fila y columna
subtablero(Tab, Sub) :-
    functor(Tab, matriz, N),
    N1 is N-1,
    numlist(1, N1, Is),
    maplist(arg_of(Tab), Is, FilasSinUltima),
    maplist(quitar_ultima_col, FilasSinUltima, FilasRecortadas),
    Sub =.. [matriz|FilasRecortadas].

% arg_of(+Term, +I, -Arg)
% Dado un término Term, devuelve el argumento I
arg_of(Term, I, Arg) :- arg(I, Term, Arg).

% quitar_ultima_col(+FilaIn, -FilaOut)
% Dada una fila FilaIn, devuelve la fila sin la última columna
quitar_ultima_col(FilaIn, FilaOut) :-
    functor(FilaIn, fila, M),
    M1 is M-1,
    numlist(1, M1, Js),
    maplist(arg_of(FilaIn), Js, Celdas),
    FilaOut =.. [fila|Celdas].

% jugadas_posibles(+Tablero, -Jugadas)
% Dada una matriz Tablero, devuelve una lista de jugadas posibles
jugadas_posibles(Tab, Jugadas) :-
    functor(Tab, matriz, N),
    N2 is N-1,
    findall([F,C,h],
            ( between(1, N, F),
              between(1, N2, C),
              movValido(Tab, F, C, h, N)
            ),
            Hs),
    findall([F,C,v],
            ( between(1, N2, F),
              between(1, N, C),
              movValido(Tab, F, C, v, N)
            ),
            Vs),
    append(Hs, Vs, Jugadas).

% movValido(+Tablero, +F, +C, +D, +N)
% Dada una matriz Tablero, devuelve verdadero si la jugada (F,C,D) es válida
movValido(Tab, F, C, h, N) :-
    C =< N-1,
    F =< N,
    get_cell(Tab, F, C, c(H,_,_)),
    H == false.
movValido(Tab, F, C, v, N) :-
    F =< N-1,
    C =< N,
    get_cell(Tab, F, C, c(_,V,_)),
    V == false.

% marcoLinea(+Tablero, +Turno, +F, +C, +D, -TableroOut, -Celdas)
% Dada una matriz Tablero, marca la línea (F,C,D) y devuelve el nuevo tablero
marcoLinea(Tab, T, F, C, h, TabOut, Caps) :-
    set_edge(Tab, F, C, h, Tab1),
    findall([F1,C1],
            ( member([DF,DC], [[0,0],[-1,0]]),
              F1 is F+DF, C1 is C+DC,
              checkCaptura(Tab1, T, F1, C1)
            ),
            Caps),
    capturoCeldas(Tab1, T, Caps, TabOut).
marcoLinea(Tab, T, F, C, v, TabOut, Caps) :-
    set_edge(Tab, F, C, v, Tab1),
    findall([F1,C1],
            ( member([DF,DC], [[0,0],[0,-1]]),
              F1 is F+DF, C1 is C+DC,
              checkCaptura(Tab1, T, F1, C1)
            ),
            Caps),
    capturoCeldas(Tab1, T, Caps, TabOut).

% checkCaptura(+Tablero, +Turno, +F, +C)
% Dada una matriz Tablero, verifica si la celda (F,C) puede capturar
checkCaptura(Tab, _, F, C) :-
    functor(Tab, matriz, N),
    F >= 1, C >= 1, F =< N-1, C =< N-1,
    get_cell(Tab, F, C,    c(H, V, J0)), J0 =:= 0, H==true, V==true,
    F2 is F+1, get_cell(Tab, F2, C,  c(H2,_,_)), H2==true,
    C2 is C+1, get_cell(Tab, F,  C2,  c(_,V2,_)), V2==true.

% capturoCeldas(+Tablero, +Turno, +Celdas, -TableroOut)
% Dada una matriz Tablero, captura las celdas en la lista Celdas
capturoCeldas(Tab, _, [], Tab).
capturoCeldas(Tab, T, [[F,C]|R], TabOut) :-
    get_cell(Tab, F, C, c(H,V,0)),
    actualizoCelda(Tab, F, C, c(H,V,T), Tab1),
    capturoCeldas(Tab1, T, R, TabOut).

% set_edge(+Tablero, +F, +C, +D, -TableroOut)
% Dada una matriz Tablero, marca la línea (F,C,D) y devuelve el nuevo tablero
set_edge(Tab, F, C, h, TabOut) :-
    get_cell(Tab, F, C, c(_,V,J)),
    actualizoCelda(Tab, F, C, c(true,V,J), TabOut).
set_edge(Tab, F, C, v, TabOut) :-
    get_cell(Tab, F, C, c(H,_,J)),
    actualizoCelda(Tab, F, C, c(H,true,J), TabOut).


switch(1,2). 
switch(2,1).