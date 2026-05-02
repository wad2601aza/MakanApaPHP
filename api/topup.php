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
$phone  = trim($body['phone'] ?? '');
$amount = (int) ($body['amount']  ?? 0);

if ($userId <= 0 && $phone === '') fail('Invalid user identifier (id or phone).');
if ($amount <= 0) fail('Amount must be greater than zero.');

// Fetch current balance
if ($userId > 0) {
    $stmt = $db->prepare('SELECT id, balance FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$userId]);
} else {
    $stmt = $db->prepare('SELECT id, balance FROM users WHERE phone = ? LIMIT 1');
    $stmt->execute([$phone]);
}

$user = $stmt->fetch();
if (!$user) fail('User not found.', 404);

// Make sure we have the actual userId from the database row
$userId = (int) $user['id'];

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
