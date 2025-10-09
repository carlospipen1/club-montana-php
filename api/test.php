<?php
header('Content-Type: application/json');
echo json_encode([
    'status' => 'success',
    'message' => 'API funcionando correctamente',
    'timestamp' => time(),
    'environment' => 'development'
]);
?>
