<?php
// ============================================================
// MakanApa — Environment-Adaptive Configuration
// ============================================================

// ── Auto-detect environment ──────────────────────────────────
// Uses strpos() instead of str_starts_with() for PHP 7.4 compatibility (InfinityFree).
$_host   = isset($_SERVER['HTTP_HOST'])   ? $_SERVER['HTTP_HOST']   : '';
$_sname  = isset($_SERVER['SERVER_NAME']) ? $_SERVER['SERVER_NAME'] : '';
$isLocal = in_array($_sname, ['localhost', '127.0.0.1', '::1'], true)
        || strpos($_host, 'localhost') === 0
        || strpos($_host, '127.0.0.1') === 0;

if ($isLocal) {
    // ── LOCAL (XAMPP / Port 3307) ────────────────────────────
    define('DB_HOST', '127.0.0.1');
    define('DB_PORT', '3307');          // Your custom MariaDB port
    define('DB_NAME', 'PHPmakanapa_local');   // Your local database name
    define('DB_USER', 'root');
    define('DB_PASS', '');              // Default XAMPP has no password

    define('APP_URL',    'http://localhost/makanapaPHP2');
    define('UPLOAD_DIR', __DIR__ . '/../uploads/');
    define('UPLOAD_URL', APP_URL . '/uploads/');
} else {
    // ── PRODUCTION (InfinityFree) ────────────────────────────
    define('DB_HOST', 'sql102.infinityfree.com');
    define('DB_PORT', '3306');
    define('DB_NAME', 'if0_41704967_makanapa');
    define('DB_USER', 'if0_41704967');
    define('DB_PASS', 'qZ3wa91umH1T');  // ← change if rotated

    define('APP_URL',    'https://makanapa.is-great.net');
    define('UPLOAD_DIR', __DIR__ . '/../uploads/');
    define('UPLOAD_URL', APP_URL . '/uploads/');
}

// ── Shared constants ─────────────────────────────────────────
define('MAX_UPLOAD_BYTES', 5 * 1024 * 1024);   // 5 MB
define('ALLOWED_MIME', [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4',  'video/webm'
]);
