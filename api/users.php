<?php
// ============================================================
// MakanApa — Users API
// GET  ?phone=XXXX                    → fetch user by phone
// POST {phone, name,                  → upsert user (find or create)
//       latitude?, longitude?,
//       address_name?}
// ============================================================
require_once __DIR__ . '/helpers.php';
setCorsHeaders();

$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// ── GET: fetch user by phone ─────────────────────────────────
if ($method === 'GET') {
    $phone = trim($_GET['phone'] ?? '');
    if ($phone === '') fail('Missing phone parameter.');

    $stmt = $db->prepare('SELECT * FROM users WHERE phone = ? LIMIT 1');
    $stmt->execute([$phone]);
    $user = $stmt->fetch();

    success($user ?: null);
}

// ── POST: upsert user ────────────────────────────────────────
if ($method === 'POST') {
    $body        = getJsonBody();
    $phone       = trim($body['phone']        ?? '');
    $name        = trim($body['name']         ?? '');
    $latitude    = isset($body['latitude'])    && $body['latitude']    !== '' ? (float) $body['latitude']    : null;
    $longitude   = isset($body['longitude'])   && $body['longitude']   !== '' ? (float) $body['longitude']   : null;
    $addressName = trim($body['address_name'] ?? '') ?: null;

    if ($phone === '') fail('Missing phone.');
    if ($name  === '') fail('Missing name.');

    // Try find existing first
    $stmt = $db->prepare('SELECT * FROM users WHERE phone = ? LIMIT 1');
    $stmt->execute([$phone]);
    $user = $stmt->fetch();

    if ($user) {
        // Update name and/or location if provided
        $updates = [];
        $params  = [];

        if ($user['name'] !== $name) {
            $updates[] = 'name = ?';
            $params[]  = $name;
        }
        if ($latitude !== null) {
            $updates[] = 'latitude = ?';
            $params[]  = $latitude;
        }
        if ($longitude !== null) {
            $updates[] = 'longitude = ?';
            $params[]  = $longitude;
        }
        if ($addressName !== null) {
            $updates[] = 'address_name = ?';
            $params[]  = $addressName;
        }

        if (!empty($updates)) {
            $params[] = $user['id'];
            $db->prepare('UPDATE users SET ' . implode(', ', $updates) . ' WHERE id = ?')
               ->execute($params);
        }

        // Re-fetch to return fresh data
        $stmt = $db->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
        $stmt->execute([$user['id']]);
        success($stmt->fetch());
    }

    // Create new user
    $stmt = $db->prepare(
        'INSERT INTO users (phone, name, balance, latitude, longitude, address_name)
         VALUES (?, ?, 0, ?, ?, ?)'
    );
    $stmt->execute([$phone, $name, $latitude, $longitude, $addressName]);
    $newId = (int) $db->lastInsertId();

    $stmt = $db->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$newId]);
    success($stmt->fetch(), 201);
}

fail('Method not allowed.', 405);
