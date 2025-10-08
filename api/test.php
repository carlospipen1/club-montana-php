<?php
header('Content-Type: application/json');
echo json_encode([
    'status' => 'success',
    'message' => 'API PHP funcionando correctamente',
    'timestamp' => time(),
    'environment' => getenv('VERCEL_ENV') ?: 'development'
]);
?>
