<?php
// ============================================================
// MakanApa — Requests API
// GET  (no params)                          → latest 10 requests (seller feed)
// GET  ?since=ISO_TIMESTAMP                 → requests newer than timestamp
// POST {user_id, buyer_name, description, quantity} → create request
// ============================================================
require_once __DIR__ . '/helpers.php';
setCorsHeaders();

$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// ── GET ──────────────────────────────────────────────────────
if ($method === 'GET') {
    $since = trim($_GET['since'] ?? '');

    if ($since !== '') {
        // Validate it looks like a datetime
        $stmt = $db->prepare(
            'SELECT * FROM requests WHERE created_at > ? ORDER BY created_at DESC LIMIT 20'
        );
        $stmt->execute([$since]);
    } else {
        $stmt = $db->prepare(
            'SELECT * FROM requests ORDER BY created_at DESC LIMIT 10'
        );
        $stmt->execute();
    }

    success($stmt->fetchAll());
}

// ── POST ─────────────────────────────────────────────────────
if ($method === 'POST') {
    $body        = getJsonBody();
    $userId      = isset($body['user_id']) && $body['user_id'] ? (int) $body['user_id'] : null;
    $buyerName   = trim($body['buyer_name']  ?? '');
    $description = trim($body['description'] ?? '');
    $quantity    = (int) ($body['quantity']  ?? 1);

    if ($buyerName   === '') fail('buyer_name is required.');
    if ($description === '') fail('description is required.');
    if ($quantity < 1) $quantity = 1;

    $stmt = $db->prepare(
        'INSERT INTO requests (user_id, buyer_name, description, quantity) VALUES (?, ?, ?, ?)'
    );
    $stmt->execute([$userId, $buyerName, $description, $quantity]);
    $newId = (int) $db->lastInsertId();

    $stmt = $db->prepare('SELECT * FROM requests WHERE id = ? LIMIT 1');
    $stmt->execute([$newId]);
    success($stmt->fetch(), 201);
}

fail('Method not allowed.', 405);
