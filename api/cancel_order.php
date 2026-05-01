<?php
// ============================================================
// MakanApa — Cancel Order API
// POST {order_id}
//   → Atomically: fetch order → refund buyer balance
//              → set status='cancelled' → restore offer stock
// ============================================================
require_once __DIR__ . '/helpers.php';
setCorsHeaders();
requireMethod('POST');

$db   = getDB();
$body = getJsonBody();

$orderId = (int) ($body['order_id'] ?? 0);
if ($orderId <= 0) fail('order_id is required.');

$db->beginTransaction();
try {
    // 1. Fetch the order
    $stmt = $db->prepare(
        'SELECT id, user_id, buyer_phone, seller_name, food_name,
                request_id, quantity, total, status
         FROM orders WHERE id = ? LIMIT 1'
    );
    $stmt->execute([$orderId]);
    $order = $stmt->fetch();

    if (!$order) throw new RuntimeException('Order not found.');
    if ($order['status'] !== 'pending' && $order['status'] !== null) {
        throw new RuntimeException('Only pending orders can be cancelled.');
    }

    // 2. Refund buyer balance (find user by user_id or buyer_phone)
    $userId = (int) ($order['user_id'] ?? 0);
    $refundTotal = (int) ($order['total'] ?? 0);

    if ($userId > 0) {
        $stmt = $db->prepare('SELECT id, balance FROM users WHERE id = ? LIMIT 1');
        $stmt->execute([$userId]);
    } else {
        // Fallback: look up by phone
        $stmt = $db->prepare('SELECT id, balance FROM users WHERE phone = ? LIMIT 1');
        $stmt->execute([$order['buyer_phone']]);
    }
    $user = $stmt->fetch();

    if ($user && $refundTotal > 0) {
        $refundedBalance = (int) $user['balance'] + $refundTotal;
        $db->prepare('UPDATE users SET balance = ? WHERE id = ?')
           ->execute([$refundedBalance, $user['id']]);

        // Log refund
        $db->prepare(
            'INSERT INTO balance_history (user_id, type, amount, reference_id, description)
             VALUES (?, ?, ?, ?, ?)'
        )->execute([$user['id'], 'refund', $refundTotal, $orderId, "Refund for cancelled order #{$orderId}"]);
    }

    // 3. Set order status to cancelled
    $db->prepare('UPDATE orders SET status = ? WHERE id = ?')
       ->execute(['cancelled', $orderId]);

    // 4. Restore offer stock
    if ($order['request_id'] && $order['seller_name'] && $order['food_name']) {
        $stmt = $db->prepare(
            'SELECT id, stock FROM offers
             WHERE request_id = ? AND seller_name = ? AND food_name = ? LIMIT 1'
        );
        $stmt->execute([$order['request_id'], $order['seller_name'], $order['food_name']]);
        $offer = $stmt->fetch();

        if ($offer) {
            $restoredStock = (int) $offer['stock'] + (int) ($order['quantity'] ?? 1);
            $db->prepare('UPDATE offers SET stock = ? WHERE id = ?')
               ->execute([$restoredStock, $offer['id']]);
        }
    }

    $db->commit();
} catch (Throwable $e) {
    $db->rollBack();
    fail($e->getMessage(), 400);
}

success([
    'cancelled_order_id' => $orderId,
    'refund_amount'      => $refundTotal ?? 0,
    'new_balance'        => $refundedBalance ?? null
]);
