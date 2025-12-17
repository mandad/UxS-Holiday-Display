const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
// Cloud Run provides the PORT environment variable
const PORT = process.env.PORT || 8080;

// Serve static files from the 'dist' directory, but do not automatically serve index.html
// so we can handle the root request and inject environment variables manually.
app.use(express.static(path.join(__dirname, 'dist'), { index: false }));

// Handle all requests by serving index.html with runtime env injection
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  
  fs.readFile(indexPath, 'utf8', (err, htmlData) => {
    if (err) {
      console.error('Error reading index.html', err);
      return res.status(500).send('Internal Server Error');
    }

    // Inject the API_KEY from the server's environment (Cloud Run) into the client's window object.
    const envScript = `
      <script>
        window.env = {
          API_KEY: "${process.env.API_KEY || ''}"
        };
      </script>
    `;

    // Insert the script before the closing head tag or placeholder
    const finalHtml = htmlData.replace('<!--ENV_INJECTION-->', envScript);
    
    res.setHeader('Content-Type', 'text/html');
    res.send(finalHtml);
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});