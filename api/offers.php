<?php
// ============================================================
// MakanApa — Offers API
// GET  ?request_id=X      → offers for a request (sorted price ASC)
// POST (multipart)        → submit offer with optional image/video upload
// ============================================================
require_once __DIR__ . '/helpers.php';
setCorsHeaders();

$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// ── GET ──────────────────────────────────────────────────────
if ($method === 'GET') {
    $requestId = (int) ($_GET['request_id'] ?? 0);
    if ($requestId <= 0) fail('Missing request_id.');

    $stmt = $db->prepare(
        'SELECT * FROM offers WHERE request_id = ? ORDER BY price ASC'
    );
    $stmt->execute([$requestId]);
    success($stmt->fetchAll());
}

// ── POST (multipart/form-data) ───────────────────────────────
if ($method === 'POST') {
    // Fields come from $_POST (not JSON) because we have a file upload
    $requestId   = (int)   ($_POST['request_id']   ?? 0);
    $sellerName  = trim($_POST['seller_name']  ?? '');
    $foodName    = trim($_POST['food_name']    ?? '');
    $price       = (int)   ($_POST['price']       ?? 0);
    $contact     = trim($_POST['contact']     ?? '');
    $stock       = (int)   ($_POST['stock']       ?? 1);
    $weightVol   = isset($_POST['weight_volume']) && $_POST['weight_volume'] !== ''
                    ? (int) $_POST['weight_volume'] : null;
    $unit        = trim($_POST['unit'] ?? '') ?: null;

    if ($requestId  <= 0) fail('request_id is required.');
    if ($sellerName === '') fail('seller_name is required.');
    if ($foodName   === '') fail('food_name is required.');
    if ($price      <= 0)  fail('price must be > 0.');

    // ── Media upload ──────────────────────────────────────────
    $mediaUrl = null;

    if (!empty($_FILES['media']) && $_FILES['media']['error'] === UPLOAD_ERR_OK) {
        $file     = $_FILES['media'];
        $mimeType = mime_content_type($file['tmp_name']);

        if (!in_array($mimeType, ALLOWED_MIME, true)) {
            fail('File type not allowed. Use JPG, PNG, GIF, WEBP, MP4 or WEBM.');
        }
        if ($file['size'] > MAX_UPLOAD_BYTES) {
            fail('File too large. Maximum is 5 MB.');
        }

        // Ensure upload directory exists
        if (!is_dir(UPLOAD_DIR)) {
            mkdir(UPLOAD_DIR, 0755, true);
        }

        $ext      = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $fileName = time() . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
        $destPath = UPLOAD_DIR . $fileName;

        if (!move_uploaded_file($file['tmp_name'], $destPath)) {
            fail('Failed to save uploaded file.', 500);
        }

        $mediaUrl = UPLOAD_URL . $fileName;
    }

    $stmt = $db->prepare(
        'INSERT INTO offers
            (request_id, seller_name, food_name, price, contact, stock, media_url, weight_volume, unit)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $requestId, $sellerName, $foodName, $price,
        $contact, $stock, $mediaUrl, $weightVol, $unit
    ]);
    $newId = (int) $db->lastInsertId();

    $stmt = $db->prepare('SELECT * FROM offers WHERE id = ? LIMIT 1');
    $stmt->execute([$newId]);
    success($stmt->fetch(), 201);
}

fail('Method not allowed.', 405);
