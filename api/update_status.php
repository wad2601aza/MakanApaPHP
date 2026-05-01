<?php
// ============================================================
// MakanApa — Update Order Status API
// POST {order_id, status}
//   Allowed statuses: 'on process', 'delivered', 'cancelled'
//   (Use cancel_order.php for 'cancelled' to get full refund logic)
// ============================================================
require_once __DIR__ . '/helpers.php';
setCorsHeaders();
requireMethod('POST');

$db   = getDB();
$body = getJsonBody();

$orderId   = (int)    ($body['order_id'] ?? 0);
$newStatus = trim($body['status']    ?? '');

$allowedStatuses = ['on process', 'delivered', 'cancelled'];

if ($orderId <= 0)                              fail('order_id is required.');
if (!in_array($newStatus, $allowedStatuses, true)) fail('Invalid status. Allowed: ' . implode(', ', $allowedStatuses));

$stmt = $db->prepare('SELECT id, status FROM orders WHERE id = ? LIMIT 1');
$stmt->execute([$orderId]);
$order = $stmt->fetch();
if (!$order) fail('Order not found.', 404);

$db->prepare('UPDATE orders SET status = ? WHERE id = ?')
   ->execute([$newStatus, $orderId]);

// Return updated order
$stmt = $db->prepare('SELECT * FROM orders WHERE id = ? LIMIT 1');
$stmt->execute([$orderId]);
success($stmt->fetch());
