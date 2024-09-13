<?php

// Configuration
$channels = [
    'espn1', 'espn2', 'espn3', 'espn5', 'espn6', 'espn7', 'tyc_sports',
    'espn_premium', 'dsports', 'dsports_2', 'dsports_plus', 'espn_deportes',
    'starplus06', 'eurosports2_es', 'dazn1', 'dazn2', 'fox3ar', 'fox2ar',
    'winsports', 'fox1ar', 'eurosports1_es', 'espnmx', 'foxsportspremium',
    'foxsportsmx', 'tv_publica', 'telefe'
];

$cacheFile = 'channel_cache.json';
$cacheLifetime = 300; // 5 minutes

// Function to update the playback URL of a channel
function updatePlaybackURL($channel) {
    $streamUrl = "https://streamtp.live/global1.php?stream={$channel}";
    $data = @file_get_contents($streamUrl);

    if ($data === FALSE) {
        return null;
    }

    if (preg_match('/var playbackURL = "(.*?)";/', $data, $matches)) {
        return $matches[1];
    }

    return null;
}

// Function to update all channel URLs
function updateAllChannels($channels) {
    $playbackURLs = [];
    foreach ($channels as $channel) {
        $url = updatePlaybackURL($channel);
        $playbackURLs[$channel] = $url !== null ? $url : "No disponible";
    }
    return $playbackURLs;
}

// Function to get cached data or update if expired
function getCachedData($channels, $cacheFile, $cacheLifetime) {
    if (file_exists($cacheFile)) {
        $cacheData = json_decode(file_get_contents($cacheFile), true);
        if (time() - $cacheData['timestamp'] < $cacheLifetime) {
            return $cacheData['data'];
        }
    }

    $newData = updateAllChannels($channels);
    $cacheData = [
        'timestamp' => time(),
        'data' => $newData
    ];
    file_put_contents($cacheFile, json_encode($cacheData));
    return $newData;
}

// Main API logic
header('Content-Type: application/json');

if (isset($_GET['route'])) {
    $route = $_GET['route'];
    $cachedData = getCachedData($channels, $cacheFile, $cacheLifetime);

    switch ($route) {
        case 'all':
            echo json_encode($cachedData);
            break;

        case 'channel':
            if (isset($_GET['channel'])) {
                $channel = strtolower($_GET['channel']);
                if (isset($cachedData[$channel])) {
                    echo json_encode(['playbackURL' => $cachedData[$channel]]);
                } else {
                    http_response_code(404);
                    echo json_encode(['error' => "Canal no encontrado."]);
                }
            } else {
                http_response_code(400);
                echo json_encode(['error' => "Parámetro 'channel' no especificado."]);
            }
            break;

        case 'channels':
            echo json_encode($channels);
            break;

        default:
            http_response_code(404);
            echo json_encode(['error' => "Ruta no válida."]);
    }
} else {
    http_response_code(400);
    echo json_encode(['error' => "No se especificó una ruta."]);
}

?>
aslo html
