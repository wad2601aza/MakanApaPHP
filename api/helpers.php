<?php
// ============================================================
// MakanApa — Shared API Helper Functions
// ============================================================
require_once __DIR__ . '/db_connect.php';

// ── CORS & JSON headers ─────────────────────────────────────
function setCorsHeaders(): void {
    // Allow your InfinityFree domain. '*' is fine for public apps.
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Content-Type: application/json; charset=UTF-8');

    // Handle preflight
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

// ── Response helpers ────────────────────────────────────────
function success(mixed $data = null, int $code = 200): never {
    http_response_code($code);
    echo json_encode(['success' => true, 'data' => $data]);
    exit;
}

function fail(string $message, int $code = 400): never {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $message]);
    exit;
}

// ── Request body helpers ────────────────────────────────────
function getJsonBody(): array {
    $raw = file_get_contents('php://input');
    if (empty($raw)) return [];
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

// ── Method guard ────────────────────────────────────────────
function requireMethod(string ...$methods): void {
    if (!in_array($_SERVER['REQUEST_METHOD'], $methods, true)) {
        fail('Method not allowed.', 405);
    }
}
