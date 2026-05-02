<?php

define('DB_HOST', 'sql102.infinityfree.com');

// Standard MySQL port on InfinityFree
define('DB_PORT', '3306');

// Your InfinityFree database name
define('DB_NAME', 'if0_41704967_makanapa');

// Your InfinityFree database username.
define('DB_USER', 'if0_41704967');

// The password you set when creating the database
define('DB_PASS', 'qZ3wa91umH1T');

// Your InfinityFree subdomain or custom domain (no trailing slash)
// Example: https://makanapa.infinityfreeapp.com
define('APP_URL', 'https://makanapa.is-great.net');

// Absolute server path to the uploads folder
define('UPLOAD_DIR', __DIR__ . '/../uploads/');

// Public URL prefix for uploaded files
define('UPLOAD_URL', APP_URL . '/uploads/');

// Max upload size in bytes (5 MB default — InfinityFree allows up to 10 MB per file)
define('MAX_UPLOAD_BYTES', 5 * 1024 * 1024);

// Allowed MIME types for offer media
define('ALLOWED_MIME', ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm']);
