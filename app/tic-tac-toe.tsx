"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Player = "X" | "O";
type Cell = Player | null;
type Mode = "duel" | "cpu";
type ScoreKey = Player | "draw";

const PLAYER_X: Player = "X";
const PLAYER_O: Player = "O";
const EMPTY_BOARD: Cell[] = Array(9).fill(null);
const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const;

const SCORE_LABELS: Record<ScoreKey, string> = {
  X: "Jugador X",
  O: "Jugador O",
  draw: "Empates",
};

const SCORE_ACCENTS: Record<ScoreKey, string> = {
  X: "border-rose-400 bg-rose-50 text-rose-700",
  O: "border-cyan-400 bg-cyan-50 text-cyan-700",
  draw: "border-amber-400 bg-amber-50 text-amber-700",
};

function getWinner(
  board: Cell[],
): { player: Player; line: (typeof WINNING_LINES)[number] } | null {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    const player = board[a];

    if (player && player === board[b] && player === board[c]) {
      return { player, line };
    }
  }

  return null;
}

function isFull(board: Cell[]) {
  return board.every(Boolean);
}

function getOpenSquares(board: Cell[]) {
  return board
    .map((cell, index) => (cell === null ? index : null))
    .filter((index): index is number => index !== null);
}

function getOpponent(player: Player): Player {
  return player === PLAYER_X ? PLAYER_O : PLAYER_X;
}

function scoreBoard(board: Cell[], depth: number) {
  const winner = getWinner(board);

  if (winner?.player === PLAYER_O) {
    return 10 - depth;
  }

  if (winner?.player === PLAYER_X) {
    return depth - 10;
  }

  return 0;
}

function minimax(board: Cell[], player: Player, depth = 0): number {
  const winner = getWinner(board);

  if (winner || isFull(board)) {
    return scoreBoard(board, depth);
  }

  const scores = getOpenSquares(board).map((index) => {
    const nextBoard = [...board];
    nextBoard[index] = player;
    return minimax(nextBoard, getOpponent(player), depth + 1);
  });

  return player === PLAYER_O ? Math.max(...scores) : Math.min(...scores);
}

function chooseCpuMove(board: Cell[]) {
  const openSquares = getOpenSquares(board);

  if (openSquares.length === 0) {
    return null;
  }

  const prioritizedSquares = [4, 0, 2, 6, 8, 1, 3, 5, 7].filter((index) =>
    openSquares.includes(index),
  );

  return prioritizedSquares
    .map((index) => {
      const nextBoard = [...board];
      nextBoard[index] = PLAYER_O;

      return {
        index,
        score: minimax(nextBoard, PLAYER_X, 1),
      };
    })
    .sort((a, b) => b.score - a.score)[0].index;
}

export default function TicTacToe() {
  const [board, setBoard] = useState<Cell[]>(EMPTY_BOARD);
  const [turn, setTurn] = useState<Player>(PLAYER_X);
  const [mode, setMode] = useState<Mode>("cpu");
  const [scores, setScores] = useState<Record<ScoreKey, number>>({
    X: 0,
    O: 0,
    draw: 0,
  });

  const winner = useMemo(() => getWinner(board), [board]);
  const draw = !winner && isFull(board);
  const availableSquares = useMemo(() => getOpenSquares(board).length, [board]);
  const winningIndexes: readonly number[] = winner?.line ?? [];
  const isCpuTurn = mode === "cpu" && turn === PLAYER_O && !winner && !draw;

  const finishMove = useCallback((nextBoard: Cell[], nextTurn: Player) => {
    const nextWinner = getWinner(nextBoard);
    const nextDraw = !nextWinner && isFull(nextBoard);

    if (nextWinner?.player) {
      setScores((currentScores) => ({
        ...currentScores,
        [nextWinner.player]: currentScores[nextWinner.player] + 1,
      }));
    }

    if (nextDraw) {
      setScores((currentScores) => ({
        ...currentScores,
        draw: currentScores.draw + 1,
      }));
    }

    setBoard(nextBoard);

    if (!nextWinner && !nextDraw) {
      setTurn(nextTurn);
    }
  }, []);

  const playSquare = useCallback(
    (index: number, player = turn) => {
      if (board[index] || winner || draw || (mode === "cpu" && turn === PLAYER_O)) {
        return;
      }

      const nextBoard = [...board];
      nextBoard[index] = player;
      finishMove(nextBoard, getOpponent(player));
    },
    [board, draw, finishMove, mode, turn, winner],
  );

  useEffect(() => {
    if (!isCpuTurn) {
      return;
    }

    const timer = window.setTimeout(() => {
      const cpuMove = chooseCpuMove(board);

      if (cpuMove === null) {
        return;
      }

      const nextBoard = [...board];
      nextBoard[cpuMove] = PLAYER_O;
      finishMove(nextBoard, PLAYER_X);
    }, 420);

    return () => window.clearTimeout(timer);
  }, [board, finishMove, isCpuTurn]);

  function resetRound() {
    setBoard(EMPTY_BOARD);
    setTurn(PLAYER_X);
  }

  function resetScore() {
    resetRound();
    setScores({ X: 0, O: 0, draw: 0 });
  }

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    resetRound();
  }

  const status = winner
    ? `Gana ${winner.player}`
    : draw
      ? "Empate"
      : isCpuTurn
        ? "La CPU piensa"
        : `Turno de ${turn}`;

  return (
    <main className="game-shell relative isolate flex min-h-screen items-center overflow-hidden px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-6 lg:grid-cols-[1fr_360px]">
        <section className="relative overflow-hidden rounded-lg border border-white/45 bg-white/80 p-4 shadow-2xl shadow-slate-900/20 backdrop-blur sm:p-6">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-fuchsia-700">
                Next.js Game Lab
              </p>
              <h1 className="mt-2 text-4xl font-black leading-none text-slate-950 sm:text-6xl">
                Tic Tao Toe
              </h1>
            </div>

            <div
              className="grid grid-cols-2 rounded-lg border border-slate-200 bg-white p-1 text-sm font-bold shadow-sm"
              aria-label="Modo de juego"
            >
              <button
                type="button"
                onClick={() => changeMode("cpu")}
                className={`rounded-md px-4 py-2 transition ${
                  mode === "cpu"
                    ? "bg-slate-950 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Contra CPU
              </button>
              <button
                type="button"
                onClick={() => changeMode("duel")}
                className={`rounded-md px-4 py-2 transition ${
                  mode === "duel"
                    ? "bg-slate-950 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                2 jugadores
              </button>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
            <div className="mx-auto grid w-full max-w-[520px] grid-cols-3 gap-3 rounded-lg bg-slate-950 p-3 shadow-xl shadow-slate-900/30">
              {board.map((cell, index) => {
                const isWinningSquare = winningIndexes.includes(index);

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => playSquare(index)}
                    disabled={Boolean(cell) || Boolean(winner) || draw || isCpuTurn}
                    className={`aspect-square rounded-md border-2 text-5xl font-black leading-none transition focus:outline-none focus:ring-4 focus:ring-white/80 sm:text-7xl ${
                      isWinningSquare
                        ? "border-lime-300 bg-lime-200 text-slate-950 shadow-[0_0_0_4px_rgba(190,242,100,0.45)]"
                        : cell === PLAYER_X
                          ? "border-rose-300 bg-rose-100 text-rose-600"
                          : cell === PLAYER_O
                            ? "border-cyan-300 bg-cyan-100 text-cyan-700"
                            : "border-white/10 bg-white text-slate-300 hover:-translate-y-1 hover:border-amber-300 hover:bg-amber-50 hover:text-slate-500 disabled:hover:translate-y-0"
                    }`}
                    aria-label={`Casilla ${index + 1}${cell ? `, ${cell}` : ""}`}
                  >
                    {cell}
                  </button>
                );
              })}
            </div>

            <aside className="grid gap-3">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
                  Estado
                </p>
                <p className="mt-2 text-3xl font-black text-slate-950">{status}</p>
                <p className="mt-2 text-sm font-medium text-slate-500">
                  {availableSquares} casillas disponibles
                </p>
              </div>

              <button
                type="button"
                onClick={resetRound}
                className="rounded-md bg-amber-300 px-5 py-3 text-base font-black text-slate-950 shadow-sm transition hover:bg-amber-200 focus:outline-none focus:ring-4 focus:ring-amber-100"
              >
                Nueva ronda
              </button>
              <button
                type="button"
                onClick={resetScore}
                className="rounded-md border border-slate-300 bg-white px-5 py-3 text-base font-black text-slate-800 transition hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-200"
              >
                Reiniciar marcador
              </button>
            </aside>
          </div>
        </section>

        <section className="grid gap-4">
          <div className="rounded-lg border border-white/45 bg-slate-950 p-5 text-white shadow-2xl shadow-slate-900/20">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-amber-300">
              Marcador
            </p>
            <div className="mt-4 grid gap-3">
              {(Object.keys(SCORE_LABELS) as ScoreKey[]).map((scoreKey) => (
                <div
                  key={scoreKey}
                  className={`flex items-center justify-between rounded-lg border p-4 ${SCORE_ACCENTS[scoreKey]}`}
                >
                  <span className="text-sm font-black uppercase tracking-[0.12em]">
                    {SCORE_LABELS[scoreKey]}
                  </span>
                  <span className="text-4xl font-black">{scores[scoreKey]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/45 bg-white/85 p-5 shadow-xl shadow-slate-900/10 backdrop-blur">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-teal-700">
              Ritmo
            </p>
            <div className="mt-4 grid grid-cols-9 gap-1" aria-hidden="true">
              {board.map((cell, index) => (
                <span
                  key={index}
                  className={`h-3 rounded-sm ${
                    cell === PLAYER_X
                      ? "bg-rose-500"
                      : cell === PLAYER_O
                        ? "bg-cyan-500"
                        : "bg-slate-200"
                  }`}
                />
              ))}
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-600">
              X abre la partida. En modo CPU, O responde con una estrategia
              defensiva.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
