# Paths

A daily colour puzzle game I'm building while learning web development. The idea is simple: trace a path from S to E across a colour grid, following a repeating colour sequence. One puzzle a day, same puzzle for everyone.

Still a work in progress but the core game is working and I'm adding to it as I go.

---

## What it is

You get a grid of coloured tiles. Starting from the top-left corner, you click your way to the bottom-right, but each tile you step on has to match the next colour in a set sequence (amber, teal, coral, violet, repeat). Click a wrong colour and it counts as an error. There's a hint button if you get stuck.

When you finish, you get a little results screen with your step count, errors and time. You can also copy a shareable emoji version of your path.

---

## Running it locally

You'll need Node.js installed. Then:

```bash
npm install
npm start
```

Open `http://localhost:3000` in your browser.

There's also a puzzle maker tool at `http://localhost:3000/maker.html` which lets you draw a custom path and save it as an upcoming puzzle without touching the code directly.

---

## Project structure

```
paths/
├── index.html          # the game
├── maker.html          # puzzle builder tool
├── server.js           # express server
├── css/
│   └── style.css
├── js/
│   ├── puzzles.js      # all puzzle definitions live here
│   └── game.js         # game logic
└── package.json
```

---

## Adding puzzles

The easiest way is to use the maker tool at `/maker.html`. Draw your path on the grid, hit auto-fill, and click save. It writes directly to `puzzles.js` for you.

If you want to add one manually, each puzzle in `puzzles.js` looks like this:

```js
{
  id: 11,
  date: '2026-04-12',
  size: 10,
  sequence: [0, 1, 2, 3],
  solution: [
    [0,0],[0,1],[0,2], // ... rest of path to [9,9]
  ],
  grid: [
    // 10x10 array of colour indices (0-3)
  ],
}
```

The `solution` is the correct path from start to end. Path tiles get coloured automaticly by the sequence. Everything else is filled randomly by the maker.

---

## Colours

| Index | Name   | Hex     |
|-------|--------|---------|
| 0     | amber  | #b87020 |
| 1     | teal   | #1a6e62 |
| 2     | coral  | #a83c28 |
| 3     | violet | #52389a |

---

## Deploying

This is set up to deploy on Railway. Push to GitHub, connect the repo in Railway, and it picks up the `npm start` script automatically.

One thing to note: saving puzzles via the maker tool writes to the local filesystem. On Railway that won't persist between deploys, so the workflow is: use the maker locally, commit the updated `puzzles.js`, then push.

---

## What's next

Things I'm still working on or thinking about:

- streak tracking / previous results
- difficulty settings (bigger grids, longer sequences)
- maybe an archive of past puzzles
- mobile feels ok but could be better

---

Built while learning. Probably some rough edges.
