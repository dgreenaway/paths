const express = require('express');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ── POST /api/save-puzzle ────────────────────────────────────────────────────
// Appends a new puzzle entry to js/puzzles.js.
// Used by maker.html when running via the Node server locally.
// Note: on Railway/production the filesystem is ephemeral — use this locally,
// commit the updated puzzles.js, then push/deploy.
app.post('/api/save-puzzle', (req, res) => {
  const { puzzleJS, date, id } = req.body;

  if (!puzzleJS || !date || id == null) {
    return res.status(400).json({ error: 'Missing required fields (puzzleJS, date, id)' });
  }

  const filePath = path.join(__dirname, 'js', 'puzzles.js');

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return res.status(500).json({ error: 'Could not read puzzles.js: ' + e.message });
  }

  if (!content.includes('const PUZZLES')) {
    return res.status(400).json({ error: 'Target file does not appear to be puzzles.js' });
  }

  if (content.includes(`date: '${date}'`)) {
    return res.status(409).json({ error: `A puzzle with date ${date} already exists` });
  }

  const marker = '];';
  const idx    = content.lastIndexOf(marker);
  if (idx === -1) {
    return res.status(500).json({ error: 'Could not find insertion point in puzzles.js' });
  }

  const updated = content.slice(0, idx) + '\n' + puzzleJS + '\n' + content.slice(idx);

  try {
    fs.writeFileSync(filePath, updated, 'utf8');
  } catch (e) {
    return res.status(500).json({ error: 'Could not write puzzles.js: ' + e.message });
  }

  res.json({ ok: true, message: `Puzzle #${id} saved` });
});

app.listen(PORT, () => {
  console.log(`PATHS running → http://localhost:${PORT}`);
  console.log(`Puzzle maker  → http://localhost:${PORT}/maker.html`);
});
