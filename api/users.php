<?php
// ============================================================
// MakanApa — Users API
// GET  ?phone=XXXX        → fetch user by phone
// POST {phone, name}      → upsert user (find or create)
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

    // Return null data if not found (JS will then POST to create)
    success($user ?: null);
}

// ── POST: upsert user ────────────────────────────────────────
if ($method === 'POST') {
    $body  = getJsonBody();
    $phone = trim($body['phone'] ?? '');
    $name  = trim($body['name']  ?? '');

    if ($phone === '') fail('Missing phone.');
    if ($name  === '') fail('Missing name.');

    // Try find existing first
    $stmt = $db->prepare('SELECT * FROM users WHERE phone = ? LIMIT 1');
    $stmt->execute([$phone]);
    $user = $stmt->fetch();

    if ($user) {
        // Update name if it changed
        if ($user['name'] !== $name) {
            $db->prepare('UPDATE users SET name = ? WHERE id = ?')
               ->execute([$name, $user['id']]);
            $user['name'] = $name;
        }
        success($user);
    }

    // Create new user with balance 0
    $stmt = $db->prepare('INSERT INTO users (phone, name, balance) VALUES (?, ?, 0)');
    $stmt->execute([$phone, $name]);
    $newId = (int) $db->lastInsertId();

    $stmt = $db->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$newId]);
    success($stmt->fetch(), 201);
}

fail('Method not allowed.', 405);
