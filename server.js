// server.js
const express = require('express');
const path = require('path');

const app = express();

// ✅ Add required headers
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

// ✅ Serve build output
app.use(express.static(path.join(__dirname, 'build')));

app.listen(3000, () => {
  console.log('✅ Secure dev server running at http://localhost:3000');
});