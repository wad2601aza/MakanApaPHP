<?php
// ============================================================
// MakanApa — Update Order Status API
// POST {order_id, status}
//   Allowed: 'on process' | 'completed' | 'cancelled'
//   When status → 'completed': credits seller balance atomically
// ============================================================
require_once __DIR__ . '/helpers.php';
setCorsHeaders();
requireMethod('POST');

$db   = getDB();
$body = getJsonBody();

$orderId   = (int)  ($body['order_id'] ?? 0);
$newStatus = trim($body['status']  ?? '');

$allowedStatuses = ['on process', 'completed', 'delivered', 'cancelled'];

if ($orderId <= 0) fail('order_id is required.');
if (!in_array($newStatus, $allowedStatuses, true)) {
    fail('Invalid status. Allowed: on process, completed, cancelled.');
}

// Normalise legacy 'delivered' → 'completed'
if ($newStatus === 'delivered') $newStatus = 'completed';

$stmt = $db->prepare('SELECT * FROM orders WHERE id = ? LIMIT 1');
$stmt->execute([$orderId]);
$order = $stmt->fetch();
if (!$order) fail('Order not found.', 404);

// Prevent double-crediting if already completed
if ($order['status'] === 'completed' && $newStatus === 'completed') {
    success($order); // idempotent — already done
}

$db->beginTransaction();
try {
    $db->prepare('UPDATE orders SET status = ? WHERE id = ?')
       ->execute([$newStatus, $orderId]);

    $sellerNewBalance = null;

    // Credit seller balance when order is completed
    if ($newStatus === 'completed' && $order['status'] !== 'completed') {
        $total    = (int) ($order['total'] ?? 0);
        $sellerId = (int) ($order['seller_id'] ?? 0);

        // Find seller by seller_id first, fall back to seller_name
        if ($sellerId > 0) {
            $sStmt = $db->prepare('SELECT id, balance FROM users WHERE id = ? LIMIT 1');
            $sStmt->execute([$sellerId]);
        } else {
            $sStmt = $db->prepare('SELECT id, balance FROM users WHERE name = ? LIMIT 1');
            $sStmt->execute([$order['seller_name'] ?? '']);
        }
        $seller = $sStmt->fetch();

        if ($seller && $total > 0) {
            $sellerNewBalance = (int) $seller['balance'] + $total;
            $db->prepare('UPDATE users SET balance = ? WHERE id = ?')
               ->execute([$sellerNewBalance, $seller['id']]);

            // Log in balance_history
            $db->prepare(
                'INSERT INTO balance_history (user_id, type, amount, reference_id, description)
                 VALUES (?, ?, ?, ?, ?)'
            )->execute([
                $seller['id'], 'sale', $total, $orderId,
                "Sale #$orderId: {$order['food_name']} completed"
            ]);
        }
    }

    $db->commit();
} catch (Throwable $e) {
    $db->rollBack();
    fail($e->getMessage(), 400);
}

$stmt = $db->prepare('SELECT * FROM orders WHERE id = ? LIMIT 1');
$stmt->execute([$orderId]);
$updated = $stmt->fetch();

// Return updated order + seller's new balance so JS can update UI immediately
success([
    'order'              => $updated,
    'seller_new_balance' => $sellerNewBalance
]);
