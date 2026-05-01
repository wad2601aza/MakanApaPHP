<?php
// ============================================================
// MakanApa — Orders API
// GET  ?buyer_name=X              → buyer order history
// GET  ?seller_name=X             → seller order history
// GET  ?buyer_name=X&since=TS     → polling: only new/changed orders
// GET  ?seller_name=X&since=TS    → polling: only new/changed orders
// POST {…order fields…}           → place order (atomic: deduct balance + insert + decrement stock)
// ============================================================
require_once __DIR__ . '/helpers.php';
setCorsHeaders();

$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// ── GET ──────────────────────────────────────────────────────
if ($method === 'GET') {
    $buyerName  = trim($_GET['buyer_name']  ?? '');
    $sellerName = trim($_GET['seller_name'] ?? '');
    $since      = trim($_GET['since']       ?? '');

    if ($buyerName === '' && $sellerName === '') {
        fail('Provide buyer_name or seller_name.');
    }

    if ($buyerName !== '') {
        // Exact match first, then phone-suffix fallback handled client-side
        if ($since !== '') {
            $stmt = $db->prepare(
                'SELECT * FROM orders WHERE buyer_name = ? AND created_at > ?
                 ORDER BY created_at DESC LIMIT 50'
            );
            $stmt->execute([$buyerName, $since]);
        } else {
            $stmt = $db->prepare(
                'SELECT * FROM orders WHERE buyer_name = ?
                 ORDER BY created_at DESC LIMIT 50'
            );
            $stmt->execute([$buyerName]);
        }
    } else {
        if ($since !== '') {
            $stmt = $db->prepare(
                'SELECT * FROM orders WHERE seller_name = ? AND created_at > ?
                 ORDER BY created_at DESC LIMIT 50'
            );
            $stmt->execute([$sellerName, $since]);
        } else {
            $stmt = $db->prepare(
                'SELECT * FROM orders WHERE seller_name = ?
                 ORDER BY created_at DESC LIMIT 50'
            );
            $stmt->execute([$sellerName]);
        }
    }

    success($stmt->fetchAll());
}

// ── POST ─────────────────────────────────────────────────────
if ($method === 'POST') {
    $body = getJsonBody();

    $userId         = isset($body['user_id'])    && $body['user_id']    ? (int) $body['user_id'] : null;
    $requestId      = isset($body['request_id']) && $body['request_id'] ? (int) $body['request_id'] : null;
    $offerId        = isset($body['offer_id'])   && $body['offer_id']   ? (int) $body['offer_id'] : null;
    $buyerName      = trim($body['buyer_name']    ?? '');
    $buyerPhone     = trim($body['buyer_phone']   ?? '');
    $buyerAddress   = trim($body['buyer_address'] ?? '');
    $sellerName     = trim($body['seller_name']   ?? '');
    $foodName       = trim($body['food_name']     ?? '');
    $price          = (int) ($body['price']       ?? 0);
    $quantity       = (int) ($body['quantity']    ?? 1);
    $total          = (int) ($body['total']       ?? 0);
    $contact        = trim($body['contact']       ?? '');
    $notes          = trim($body['notes']         ?? '');
    $locationCoords = trim($body['location_coords'] ?? '');

    // Basic validation
    if (!$userId)                     fail('user_id is required.');
    if ($buyerName   === '')          fail('buyer_name is required.');
    if ($buyerAddress === '')         fail('buyer_address is required.');
    if ($sellerName  === '')          fail('seller_name is required.');
    if ($foodName    === '')          fail('food_name is required.');
    if ($price <= 0)                  fail('price must be > 0.');
    if ($quantity < 1) $quantity = 1;
    if ($total <= 0) $total = $price * $quantity;

    // ── Atomic transaction ───────────────────────────────────
    $db->beginTransaction();
    try {
        // 1. Check & deduct buyer balance
        $stmt = $db->prepare('SELECT balance FROM users WHERE id = ? LIMIT 1');
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        if (!$user) throw new RuntimeException('User not found.');

        $currentBalance = (int) $user['balance'];
        if ($currentBalance < $total) {
            throw new RuntimeException('Insufficient balance.');
        }
        $newBalance = $currentBalance - $total;

        $db->prepare('UPDATE users SET balance = ? WHERE id = ?')
           ->execute([$newBalance, $userId]);

        // 2. Insert order
        $stmt = $db->prepare(
            'INSERT INTO orders
                (user_id, request_id, buyer_name, buyer_phone, buyer_address,
                 seller_name, food_name, price, quantity, total,
                 contact, status, notes, location_coords)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $userId, $requestId, $buyerName, $buyerPhone, $buyerAddress,
            $sellerName, $foodName, $price, $quantity, $total,
            $contact, 'pending', $notes ?: null, $locationCoords ?: null
        ]);
        $orderId = (int) $db->lastInsertId();

        // 3. Decrement offer stock (if offer_id provided)
        if ($offerId) {
            $stmt = $db->prepare('SELECT stock FROM offers WHERE id = ? LIMIT 1');
            $stmt->execute([$offerId]);
            $offer = $stmt->fetch();
            if ($offer) {
                $newStock = max(0, (int) $offer['stock'] - $quantity);
                $db->prepare('UPDATE offers SET stock = ? WHERE id = ?')
                   ->execute([$newStock, $offerId]);
            }
        }

        // 4. Log balance history
        $db->prepare(
            'INSERT INTO balance_history (user_id, type, amount, reference_id, description)
             VALUES (?, ?, ?, ?, ?)'
        )->execute([$userId, 'order', -$total, $orderId, "Order #{$orderId}: {$foodName} ×{$quantity}"]);

        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        fail($e->getMessage(), 400);
    }

    // Return the new order + updated balance
    $stmt = $db->prepare('SELECT * FROM orders WHERE id = ? LIMIT 1');
    $stmt->execute([$orderId]);
    $order = $stmt->fetch();

    success(['order' => $order, 'new_balance' => $newBalance], 201);
}

fail('Method not allowed.', 405);
