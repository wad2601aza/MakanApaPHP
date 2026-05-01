<?php
// ============================================================
// MakanApa — User Habits API
// GET  ?user_id=X         → fetch habit record for user
// POST {user_id, last_food, avg_price, total_orders, cheapest_count}
//                         → upsert habit (INSERT or UPDATE)
// ============================================================
require_once __DIR__ . '/helpers.php';
setCorsHeaders();

$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// ── GET ──────────────────────────────────────────────────────
if ($method === 'GET') {
    $userId = (int) ($_GET['user_id'] ?? 0);
    if ($userId <= 0) fail('user_id is required.');

    $stmt = $db->prepare('SELECT * FROM user_habits WHERE id = ? LIMIT 1');
    $stmt->execute([$userId]);
    $habit = $stmt->fetch();

    success($habit ?: null);
}

// ── POST (upsert) ─────────────────────────────────────────────
if ($method === 'POST') {
    $body          = getJsonBody();
    $userId        = (int)   ($body['user_id']       ?? 0);
    $lastFood      = trim($body['last_food']     ?? '');
    $avgPrice      = (int)   ($body['avg_price']     ?? 0);
    $totalOrders   = (int)   ($body['total_orders']  ?? 0);
    $cheapestCount = (int)   ($body['cheapest_count'] ?? 0);

    if ($userId <= 0) fail('user_id is required.');

    // Check if row exists
    $stmt = $db->prepare('SELECT id FROM user_habits WHERE id = ? LIMIT 1');
    $stmt->execute([$userId]);
    $exists = $stmt->fetch();

    if ($exists) {
        $db->prepare(
            'UPDATE user_habits SET user_id=?, last_food=?, avg_price=?, total_orders=?, cheapest_count=?
             WHERE id = ?'
        )->execute([$userId, $lastFood ?: null, $avgPrice, $totalOrders, $cheapestCount, $userId]);
    } else {
        $db->prepare(
            'INSERT INTO user_habits (id, user_id, last_food, avg_price, total_orders, cheapest_count)
             VALUES (?, ?, ?, ?, ?, ?)'
        )->execute([$userId, $userId, $lastFood ?: null, $avgPrice, $totalOrders, $cheapestCount]);
    }

    $stmt = $db->prepare('SELECT * FROM user_habits WHERE id = ? LIMIT 1');
    $stmt->execute([$userId]);
    success($stmt->fetch());
}

fail('Method not allowed.', 405);
