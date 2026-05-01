<?php
// ============================================================
// MakanApa — Top-Up API
// POST {user_id, amount}  → add amount to user's balance
// ============================================================
require_once __DIR__ . '/helpers.php';
setCorsHeaders();
requireMethod('POST');

$db   = getDB();
$body = getJsonBody();

$userId = (int) ($body['user_id'] ?? 0);
$amount = (int) ($body['amount']  ?? 0);

if ($userId <= 0) fail('Invalid user_id.');
if ($amount <= 0) fail('Amount must be greater than zero.');

// Fetch current balance
$stmt = $db->prepare('SELECT id, balance FROM users WHERE id = ? LIMIT 1');
$stmt->execute([$userId]);
$user = $stmt->fetch();
if (!$user) fail('User not found.', 404);

$newBalance = (int) $user['balance'] + $amount;

$db->beginTransaction();
try {
    // Update balance
    $db->prepare('UPDATE users SET balance = ? WHERE id = ?')
       ->execute([$newBalance, $userId]);

    // Log in balance_history
    $db->prepare(
        'INSERT INTO balance_history (user_id, type, amount, description) VALUES (?, ?, ?, ?)'
    )->execute([$userId, 'topup', $amount, 'Top-up via app']);

    $db->commit();
} catch (Throwable $e) {
    $db->rollBack();
    fail('Top-up failed: ' . $e->getMessage(), 500);
}

success(['new_balance' => $newBalance]);
