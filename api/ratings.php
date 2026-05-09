<?php
// ============================================================
// MakanApa — Ratings API
// GET  ?order_id=X        → rating for a specific order
// GET  ?seller_id=X       → all ratings for a seller
// POST {order_id, seller_id, buyer_id, stars, comment?}
//      → insert rating, set orders.is_rated=1,
//        recalculate users.average_rating + total_reviews
// ============================================================
require_once __DIR__ . '/helpers.php';
setCorsHeaders();

$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// ── GET ──────────────────────────────────────────────────────
if ($method === 'GET') {
    $sellerId = isset($_GET['seller_id']) ? (int) $_GET['seller_id'] : 0;
    $orderId  = isset($_GET['order_id'])  ? (int) $_GET['order_id']  : 0;

    if ($sellerId > 0) {
        $stmt = $db->prepare(
            'SELECT r.*, u.name AS buyer_name
             FROM   ratings r
             LEFT JOIN users u ON u.id = r.buyer_id
             WHERE  r.seller_id = ?
             ORDER  BY r.created_at DESC LIMIT 50'
        );
        $stmt->execute([$sellerId]);
        success($stmt->fetchAll());
    }

    if ($orderId > 0) {
        $stmt = $db->prepare('SELECT * FROM ratings WHERE order_id = ? LIMIT 1');
        $stmt->execute([$orderId]);
        success($stmt->fetch() ?: null);
    }

    fail('Provide seller_id or order_id.');
}

// ── POST ─────────────────────────────────────────────────────
if ($method === 'POST') {
    $body     = getJsonBody();
    $orderId  = isset($body['order_id'])  ? (int) $body['order_id']  : 0;
    $sellerId = isset($body['seller_id']) && $body['seller_id'] ? (int) $body['seller_id'] : null;
    $buyerId  = isset($body['buyer_id'])  && $body['buyer_id']  ? (int) $body['buyer_id']  : null;
    $stars    = isset($body['stars'])     ? (int) $body['stars']     : 0;
    $comment  = trim($body['comment'] ?? '') ?: null;

    if ($orderId <= 0)             fail('order_id is required.');
    if ($stars < 1 || $stars > 5) fail('stars must be 1–5.');

    // Verify order exists and is completed (or delivered — accept both)
    $oStmt = $db->prepare('SELECT id, status, seller_id, is_rated FROM orders WHERE id = ? LIMIT 1');
    $oStmt->execute([$orderId]);
    $order = $oStmt->fetch();
    if (!$order) fail('Order not found.', 404);
    if (!in_array($order['status'], ['completed', 'delivered'], true)) {
        fail('Can only rate completed orders.');
    }
    if ((int) $order['is_rated'] === 1) fail('This order has already been rated.');

    // Use seller_id from the order row if not supplied by caller
    if (!$sellerId && $order['seller_id']) {
        $sellerId = (int) $order['seller_id'];
    }

    $db->beginTransaction();
    try {
        // 1. Insert rating (ON DUPLICATE KEY handles retries gracefully)
        $stmt = $db->prepare(
            'INSERT INTO ratings (order_id, seller_id, buyer_id, stars, comment)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               stars   = VALUES(stars),
               comment = VALUES(comment)'
        );
        $stmt->execute([$orderId, $sellerId, $buyerId, $stars, $comment]);

        // 2. Mark order as rated
        $db->prepare('UPDATE orders SET is_rated = 1 WHERE id = ?')
           ->execute([$orderId]);

        // 3. Recalculate seller average_rating + total_reviews
        if ($sellerId) {
            $avgStmt = $db->prepare(
                'SELECT COUNT(*) AS cnt, AVG(stars) AS avg_stars
                 FROM ratings WHERE seller_id = ?'
            );
            $avgStmt->execute([$sellerId]);
            $row    = $avgStmt->fetch();
            $newAvg = round((float) ($row['avg_stars'] ?? 0), 2);
            $newCnt = (int) ($row['cnt'] ?? 0);

            // Check if total_reviews column exists (may be missing on older deployments)
            $colCheck = $db->prepare(
                "SELECT COUNT(*) FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE()
                   AND TABLE_NAME   = 'users'
                   AND COLUMN_NAME  = 'total_reviews'"
            );
            $colCheck->execute();
            $hasTotalReviews = (int) $colCheck->fetchColumn() > 0;

            if ($hasTotalReviews) {
                $db->prepare(
                    'UPDATE users SET average_rating = ?, total_reviews = ? WHERE id = ?'
                )->execute([$newAvg, $newCnt, $sellerId]);
            } else {
                // Column missing — update only average_rating and add the column for next time
                $db->prepare(
                    'UPDATE users SET average_rating = ? WHERE id = ?'
                )->execute([$newAvg, $sellerId]);
                // Add the missing column so future ratings work without a manual ALTER
                $db->exec(
                    'ALTER TABLE `users` ADD COLUMN `total_reviews` INT(11) NOT NULL DEFAULT 0'
                );
                $db->prepare(
                    'UPDATE users SET total_reviews = ? WHERE id = ?'
                )->execute([$newCnt, $sellerId]);
            }
        }

        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        fail($e->getMessage(), 500);
    }

    $stmt = $db->prepare('SELECT * FROM ratings WHERE order_id = ? LIMIT 1');
    $stmt->execute([$orderId]);
    success($stmt->fetch(), 201);
}

fail('Method not allowed.', 405);
