<?php
/**
 * Endpoint pour récupérer et gérer les logs de l'application
 * 
 * GET /api/logs - Récupère les logs
 * GET /api/logs/download - Télécharge les logs en tant que fichier
 * DELETE /api/logs - Efface les logs
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Gérer les requêtes OPTIONS (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/functions.php';
require_once __DIR__ . '/config.php';

$config = getConfig();
$logPath = $config['api']['logPath'] ?? __DIR__ . '/logs';

// Créer le répertoire logs s'il n'existe pas
if (!is_dir($logPath)) {
    mkdir($logPath, 0755, true);
}

$action = $_GET['action'] ?? 'view';
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        if ($action === 'download') {
            downloadLogs($logPath);
        } else {
            viewLogs($logPath);
        }
    } elseif ($method === 'DELETE') {
        clearLogs($logPath);
    } else {
        http_response_code(405);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Method not allowed']);
    }
} catch (Exception $e) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}

/**
 * Afficher les logs en JSON
 */
function viewLogs($logPath) {
    header('Content-Type: application/json');
    
    $logsData = [];
    
    // Chercher tous les fichiers .log
    if (is_dir($logPath)) {
        $files = glob($logPath . '/*.log');
        
        foreach ($files as $file) {
            if (is_file($file) && is_readable($file)) {
                $content = file_get_contents($file);
                $logsData[] = [
                    'filename' => basename($file),
                    'size' => filesize($file),
                    'modified' => date('Y-m-d H:i:s', filemtime($file)),
                    'content' => $content,
                ];
            }
        }
    }
    
    echo json_encode([
        'success' => true,
        'logs' => $logsData,
        'logPath' => $logPath,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}

/**
 * Télécharger les logs en tant que fichier
 */
function downloadLogs($logPath) {
    $mainLogFile = $logPath . '/app.log';
    
    if (!file_exists($mainLogFile)) {
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Log file not found']);
        return;
    }
    
    $content = file_get_contents($mainLogFile);
    $filename = 'app-logs-' . date('Y-m-d-H-i-s') . '.log';
    
    header('Content-Type: text/plain; charset=utf-8');
    header('Content-Disposition: attachment; filename=' . $filename);
    header('Content-Length: ' . strlen($content));
    
    echo $content;
}

/**
 * Effacer les logs
 */
function clearLogs($logPath) {
    header('Content-Type: application/json');
    
    $cleared = 0;
    $errors = [];
    
    if (is_dir($logPath)) {
        $files = glob($logPath . '/*.log');
        
        foreach ($files as $file) {
            if (is_file($file) && is_writable($file)) {
                if (unlink($file)) {
                    $cleared++;
                } else {
                    $errors[] = 'Failed to delete: ' . basename($file);
                }
            }
        }
    }
    
    echo json_encode([
        'success' => count($errors) === 0,
        'cleared' => $cleared,
        'errors' => $errors,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>
