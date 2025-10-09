<?php
session_start();
require_once '../config/database.php';
require_once '../config/NotificationSystem.php';

if (!isset($_SESSION['usuario_id'])) {
    http_response_code(401);
    exit;
}

$database = new Database();
$db = $database->getConnection();
$notificationSystem = new NotificationSystem($db);

// Marcar todas como leídas
$stmt = $db->prepare("UPDATE notificaciones SET leida = 1 WHERE usuario_id = ?");
$stmt->execute([$_SESSION['usuario_id']]);
echo 'OK';
?>
