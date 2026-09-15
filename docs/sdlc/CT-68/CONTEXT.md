# Tic-Tac-Toe (CT-68)

A local two-player 3×3 tic-tac-toe game played in the browser. This glossary is for the game, not the surrounding SDLC tooling repo.

## Language

**Board**:
A 3×3 grid of Cells shown in the browser, shared by both Players in one session.
_Avoid_: grid (as a product name), table, field

**Cell**:
One of the nine positions on the Board. It is empty or holds a Mark.
_Avoid_: square, tile, slot

**Game**:
One local session of tic-tac-toe on a Board. No accounts and no network.
_Avoid_: match (until we need ranked play), room, lobby

**Player**:
One of two humans taking turns on the same Board in the same browser. One Player uses Mark X, the other Mark O. X takes the first Turn.
_Avoid_: user, account, opponent (as a computer), AI

**Mark**:
X or O, placed in a Cell on a Player's Turn.
_Avoid_: piece, token, symbol

**Turn**:
The Player whose Mark is next to be placed. Players alternate after each legal placement.
_Avoid_: move (as the name of whose-turn), round

**Line**:
Three Cells in a row, a column, or a diagonal on the Board.
_Avoid_: streak, combo

**Win**:
A Game outcome: one Player has a Line of three of their Marks.
_Avoid_: victory, success

**Draw**:
A Game outcome: every Cell holds a Mark and neither Player has a Win.
_Avoid_: tie, stalemate, cat's game

**New Game**:
A control that clears the Board and starts a new Game with X's Turn. After a Win or Draw, Cells ignore clicks until New Game.
_Avoid_: reset, restart, play again (as the term we use in docs)
