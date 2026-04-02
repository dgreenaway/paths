# Pathfinder — Daily Puzzle Game

A daily visual puzzle game. Players trace a path from S to E across a colour grid,
following a repeating colour sequence. One puzzle per day, shared globally.

## Project Structure

```
pathfinder/
├── index.html          # Main game page
├── css/
│   └── style.css       # All styles
├── js/
│   ├── puzzles.js      # Puzzle definitions (add new puzzles here)
│   └── game.js         # Game logic
└── README.md
```

## Running Locally

Just open `index.html` in a browser — no build step or server needed.

In VS Code, install the **Live Server** extension (ritwickdey.liveserver),
right-click `index.html` and choose "Open with Live Server".

## Adding New Puzzles

Open `js/puzzles.js` and add a new object to the `PUZZLES` array.

**Step 1 — Design your solution path**
Draw a path from start tile to end tile on paper (or mentally).
Example for a 5×5 grid: `(0,0)→(1,0)→(2,0)→(2,1)→(2,2)→(3,2)→(4,2)→(4,3)→(4,4)`

**Step 2 — Assign colours to solution tiles**
The colour at each step must match `sequence[stepIndex % sequence.length]`.
Default sequence is `[0, 1, 2, 3]` (amber → teal → coral → violet, repeating).

| Step | sequence index | colour |
|------|---------------|--------|
| 0 (start) | 0 | amber  |
| 1         | 1 | teal   |
| 2         | 2 | coral  |
| 3         | 3 | violet |
| 4         | 0 | amber  |
| …         | … | …      |

**Step 3 — Fill the rest of the grid**
Non-solution tiles can be any colour. Avoid placing the "next expected" colour
on tiles adjacent to the solution path (it misleads players).

**Step 4 — Add to PUZZLES array**

```js
{
  id: 4,
  size: 5,
  sequence: [0, 1, 2, 3],
  solution: [
    [0,0],[1,0],[2,0],[2,1],[2,2],[3,2],[4,2],[4,3],[4,4]
  ],
  grid: [
    [0, 3, 1, 2, 3],
    [1, 2, 3, 0, 2],
    [2, 1, 0, 1, 3],   // solution tiles at cols 0,1,2 in this row
    [0, 3, 1, 2, 0],
    [1, 2, 0, 3, 0],   // solution tiles at cols 2,3,4 in this row
  ],
}
```

## Colour Reference

| Index | Name   | Background |
|-------|--------|------------|
| 0     | amber  | #b87020    |
| 1     | teal   | #1a6e62    |
| 2     | coral  | #a83c28    |
| 3     | violet | #52389a    |

## Daily Puzzle Rotation

Puzzles rotate automatically by day of year:
`puzzleIndex = dayOfYear % PUZZLES.length`

So with 3 puzzles, day 1 = puzzle 1, day 2 = puzzle 2, day 3 = puzzle 3, day 4 = puzzle 1 again.

## Deploying

Any static host works — Netlify, Vercel, GitHub Pages, Cloudflare Pages.
Just upload the folder contents. No server-side code required.
