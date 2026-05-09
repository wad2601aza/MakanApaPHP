<?php
// ============================================================
// MakanApa — Offers API
// GET  ?request_id=X      → offers for a request (price ASC),
//                           includes seller average_rating
// POST (multipart)        → submit offer; auto-calculates
//                           Haversine distance from buyer coords
// ============================================================
require_once __DIR__ . '/helpers.php';
setCorsHeaders();

$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// ── GET ──────────────────────────────────────────────────────
if ($method === 'GET') {
    $requestId = (int) ($_GET['request_id'] ?? 0);
    if ($requestId <= 0) fail('Missing request_id.');

    // Join with users to pull seller average_rating
    $stmt = $db->prepare(
        'SELECT o.*,
                COALESCE(u.average_rating, 0) AS seller_rating
         FROM   offers o
         LEFT JOIN users u ON u.id = o.seller_id
         WHERE  o.request_id = ?
         ORDER  BY o.price ASC'
    );
    $stmt->execute([$requestId]);
    success($stmt->fetchAll());
}

// ── POST (multipart/form-data) ───────────────────────────────
if ($method === 'POST') {
    $requestId  = (int)   ($_POST['request_id']  ?? 0);
    $sellerName = trim(    $_POST['seller_name']  ?? '');
    $foodName   = trim(    $_POST['food_name']    ?? '');
    $price      = (int)   ($_POST['price']        ?? 0);
    $contact    = trim(    $_POST['contact']      ?? '');
    $stock      = (int)   ($_POST['stock']        ?? 1);
    $sellerId   = isset($_POST['seller_id']) && $_POST['seller_id'] ? (int) $_POST['seller_id'] : null;
    $weightVol  = isset($_POST['weight_volume']) && $_POST['weight_volume'] !== ''
                    ? (int) $_POST['weight_volume'] : null;
    $unit       = trim($_POST['unit'] ?? '') ?: null;

    if ($requestId <= 0) fail('request_id is required.');
    if ($sellerName === '') fail('seller_name is required.');
    if ($foodName   === '') fail('food_name is required.');
    if ($price      <= 0)  fail('price must be > 0.');

    // ── Haversine distance calculation ────────────────────────
    $distanceKm = null;

    // Seller shop coordinates (sent from JS via seller profile)
    $sellerLat = isset($_POST['seller_lat']) && $_POST['seller_lat'] !== '' ? (float) $_POST['seller_lat'] : null;
    $sellerLng = isset($_POST['seller_lng']) && $_POST['seller_lng'] !== '' ? (float) $_POST['seller_lng'] : null;

    if ($sellerLat !== null && $sellerLng !== null) {
        // Fetch buyer coordinates from the request row
        $rStmt = $db->prepare('SELECT buyer_lat, buyer_lng FROM requests WHERE id = ? LIMIT 1');
        $rStmt->execute([$requestId]);
        $reqRow = $rStmt->fetch();

        if ($reqRow && $reqRow['buyer_lat'] !== null && $reqRow['buyer_lng'] !== null) {
            $distanceKm = haversineKm(
                (float) $reqRow['buyer_lat'],
                (float) $reqRow['buyer_lng'],
                $sellerLat,
                $sellerLng
            );
        }
    }

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

    // ── Insert offer ──────────────────────────────────────────
    $stmt = $db->prepare(
        'INSERT INTO offers
            (request_id, seller_id, seller_name, food_name, price, contact,
             stock, media_url, weight_volume, unit, distance_km)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $requestId, $sellerId, $sellerName, $foodName, $price, $contact,
        $stock, $mediaUrl, $weightVol, $unit,
        $distanceKm !== null ? round($distanceKm, 2) : null
    ]);
    $newId = (int) $db->lastInsertId();

    // Return offer + seller rating in one shot
    $stmt = $db->prepare(
        'SELECT o.*, COALESCE(u.average_rating, 0) AS seller_rating
         FROM   offers o
         LEFT JOIN users u ON u.id = o.seller_id
         WHERE  o.id = ? LIMIT 1'
    );
    $stmt->execute([$newId]);
    success($stmt->fetch(), 201);
}

fail('Method not allowed.', 405);

// ── Haversine formula ─────────────────────────────────────────
/**
 * Returns the great-circle distance in kilometres between two
 * lat/lng points using the Haversine formula.
 */
function haversineKm(float $lat1, float $lng1, float $lat2, float $lng2): float {
    $earthRadius = 6371.0; // km
    $dLat = deg2rad($lat2 - $lat1);
    $dLng = deg2rad($lng2 - $lng1);
    $a = sin($dLat / 2) ** 2
       + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
    $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
    return $earthRadius * $c;
}
