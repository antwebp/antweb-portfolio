<?php
// Токен и chat_id задаются переменными окружения на хостинге (не хранятся в коде/репозитории).
$botToken = getenv('TELEGRAM_BOT_TOKEN');
$chatId = getenv('TELEGRAM_CHAT_ID');

header('Content-Type: application/json; charset=utf-8');

if (!$botToken || !$chatId) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'server_not_configured']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method_not_allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$name = trim($input['name'] ?? '');
$phone = trim($input['phone'] ?? '');

if ($name === '' || $phone === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'invalid_input']);
    exit;
}

$text = "Новая заявка с сайта ANTWEB\nИмя: $name\nТелефон: $phone";

$url = "https://api.telegram.org/bot$botToken/sendMessage";
$options = [
    'http' => [
        'header' => "Content-Type: application/json\r\n",
        'method' => 'POST',
        'content' => json_encode(['chat_id' => $chatId, 'text' => $text]),
        'ignore_errors' => true,
        'timeout' => 10,
    ],
];
$context = stream_context_create($options);
$result = @file_get_contents($url, false, $context);

if ($result === false) {
    http_response_code(502);
    echo json_encode(['ok' => false, 'error' => 'telegram_unreachable']);
    exit;
}

$decoded = json_decode($result, true);
if (!($decoded['ok'] ?? false)) {
    http_response_code(502);
    echo json_encode(['ok' => false, 'error' => 'telegram_error']);
    exit;
}

echo json_encode(['ok' => true]);
