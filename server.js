const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const httpsLocalhost = require('https-localhost')();

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/pay', (req, res) => {
    res.render('pay');
});

async function startServer() {
    // Get certificates for HTTPS
    const certs = await httpsLocalhost.getCerts();
    
    // Create HTTPS server
    https.createServer(certs, app).listen(PORT, () => {
        console.log(`Secure server running on https://localhost:${PORT}`);
    });
}

startServer().catch(console.error);

