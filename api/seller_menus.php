<?php
require_once __DIR__ . '/helpers.php';
setCorsHeaders();

$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $phone = $_GET['seller_phone'] ?? '';
    if (!$phone) {
        fail('Missing seller_phone');
    }

    $stmt = $db->prepare("SELECT * FROM seller_menus WHERE seller_phone = ? ORDER BY id DESC");
    $stmt->execute([$phone]);
    success($stmt->fetchAll());
}

if ($method === 'POST') {
    $body = getJsonBody();
    
    $phone = $body['seller_phone'] ?? '';
    $foodName = $body['food_name'] ?? '';
    $price = $body['price'] ?? 0;
    $mediaUrl = $body['media_url'] ?? '';

    if (!$phone || !$foodName || !$price) {
        fail('Missing required fields');
    }

    $stmt = $db->prepare("INSERT INTO seller_menus (seller_phone, food_name, price, media_url) VALUES (?, ?, ?, ?)");
    $stmt->execute([$phone, $foodName, $price, $mediaUrl]);

    success(['id' => $db->lastInsertId()]);
}

if ($method === 'DELETE') {
    $body = getJsonBody();
    $id = $body['id'] ?? '';

    if (!$id) {
        fail('Missing ID');
    }

    $stmt = $db->prepare("DELETE FROM seller_menus WHERE id = ?");
    $stmt->execute([$id]);

    success(['deleted' => true]);
}

fail('Method not allowed.', 405);
