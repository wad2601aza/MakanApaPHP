<?php
// ============================================================
// MakanApa — Central Configuration File
// Fill in YOUR InfinityFree credentials below before uploading.
// ============================================================

// ── DATABASE ────────────────────────────────────────────────
// Find your DB host in InfinityFree Control Panel → MySQL Databases
// It will look like: sql123.infinityfreeapp.com
define('DB_HOST', 'sql123.infinityfreeapp.com'); // ← CHANGE THIS

// Standard MySQL port on InfinityFree (do NOT use 3307 — that's only for local XAMPP)
define('DB_PORT', '3306');

// Your InfinityFree database name. Format: epiz_XXXXXXX_makanapa
define('DB_NAME', 'epiz_XXXXXXX_makanapa'); // ← CHANGE THIS

// Your InfinityFree database username. Format: epiz_XXXXXXX
define('DB_USER', 'epiz_XXXXXXX');           // ← CHANGE THIS

// The password you set when creating the database
define('DB_PASS', 'your_password_here');     // ← CHANGE THIS

// ── APP ─────────────────────────────────────────────────────
// Your InfinityFree subdomain or custom domain (no trailing slash)
// Example: https://makanapa.infinityfreeapp.com
define('APP_URL', 'https://yourdomain.infinityfreeapp.com'); // ← CHANGE THIS

// Absolute server path to the uploads folder
define('UPLOAD_DIR', __DIR__ . '/../uploads/');

// Public URL prefix for uploaded files
define('UPLOAD_URL', APP_URL . '/uploads/');

// Max upload size in bytes (5 MB default — InfinityFree allows up to 10 MB per file)
define('MAX_UPLOAD_BYTES', 5 * 1024 * 1024);

// Allowed MIME types for offer media
define('ALLOWED_MIME', ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm']);
