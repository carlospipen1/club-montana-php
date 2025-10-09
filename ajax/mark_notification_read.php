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

if ($_POST['id'] ?? false) {
    $notificationSystem->markAsRead($_POST['id']);
    echo 'OK';
}
?>
