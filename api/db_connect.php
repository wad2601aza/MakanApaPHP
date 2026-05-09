<?php
// ============================================================
// MakanApa — PDO Database Connection
// Auto-detects localhost (port 3307) vs InfinityFree (port 3306)
// ============================================================
require_once __DIR__ . '/config.php';

function getDB() {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    // ── LOCAL (XAMPP port 3307) ──────────────────────────────
    // DB_HOST = '127.0.0.1'
    // DB_PORT = '3307'
    // DB_NAME = 'PHPmakanapa'
    // DB_USER = 'root'
    // DB_PASS = ''
    //
    // ── PRODUCTION (InfinityFree port 3306) ─────────────────
    // DB_HOST = 'sql102.infinityfree.com'
    // DB_PORT = '3306'
    // DB_NAME = 'if0_41704967_makanapa'
    // DB_USER = 'if0_41704967'
    // DB_PASS = 'your_password_here'
    //
    // All values above are set automatically by config.php
    // based on whether the request comes from localhost or not.

    $dsn = 'mysql:host=' . DB_HOST
         . ';port='     . DB_PORT
         . ';dbname='   . DB_NAME
         . ';charset=utf8mb4';

    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    } catch (PDOException $e) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'error'   => 'Database connection failed. Check config.php.'
        ]);
        exit;
    }

    return $pdo;
}
