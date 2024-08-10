const express = require('express');
const https = require('https');
const app = express();
const port = 8083;

let playbackURL = '';  // Variable para almacenar la URL de reproducción

// Función para actualizar el enlace de reproducción
function updatePlaybackURL() {
    const streamUrl = 'https://streamtp.live/global1.php?stream=espn1';

    https.get(streamUrl, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            const regex = /var playbackURL = "(.*?)";/;
            const match = data.match(regex);

            if (match && match[1]) {
                playbackURL = match[1];
                console.log(`Enlace actualizado: ${playbackURL}`);
            } else {
                console.log('No se encontró la URL de reproducción en la página.');
            }
        });

    }).on('error', (err) => {
        console.log('Error en la solicitud: ' + err.message);
    });
}

// Llamar la función por primera vez
updatePlaybackURL();

// Configurar el intervalo para actualizar el enlace cada 2 minutos (120000 ms)
setInterval(updatePlaybackURL, 120000);

// Ruta para obtener la URL de reproducción actualizada
app.get('/api/getPlaybackURL', (req, res) => {
    if (playbackURL) {
        res.json({ playbackURL: playbackURL });
    } else {
        res.status(404).json({ error: 'URL de reproducción no disponible.' });
    }
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
