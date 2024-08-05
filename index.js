const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 8083;
const apiKey = 'yoshiro';  // Reemplaza con tu clave de API real

// Middleware
app.use(bodyParser.json());

// Enlaces almacenados en memoria
let links = [];

// Endpoint para obtener un enlace autorizado
app.get('/link', (req, res) => {
    const { link, api } = req.query;

    if (api !== apiKey) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!link) {
        return res.status(400).json({ error: 'Link parameter is required' });
    }

    const newLink = { id: uuidv4(), url: `https://cdn-webapi.vercel.app/cdn/La-cancha/${link}.html` };
    links.push(newLink);

    res.status(201).json(newLink);
});

// Endpoint para usar y eliminar un enlace
app.get('/use-link/:id', (req, res) => {
    const { id } = req.params;

    const linkIndex = links.findIndex(l => l.id === id);
    if (linkIndex === -1) {
        return res.status(404).json({ error: 'Link not found' });
    }

    const link = links[linkIndex];
    links.splice(linkIndex, 1);

    res.redirect(link.url);
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`API running at http://localhost:${port}`);
});
