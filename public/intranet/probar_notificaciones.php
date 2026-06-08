<?php
session_start();
header('Content-Type: text/html; charset=utf-8');

if (!isset($_SESSION['usuario_id'])) {
    header('Location: login.php');
    exit;
}

// Primero, asegurarnos de que las tablas existan
require_once 'config/database.php';
$database = new Database();
$db = $database->getConnection();

$mensaje = '';

// Crear tabla de notificaciones si no existe
try {
    $db->exec("CREATE TABLE IF NOT EXISTS notificaciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        tipo TEXT NOT NULL,
        titulo TEXT NOT NULL,
        mensaje TEXT NOT NULL,
        enlace TEXT,
        leida BOOLEAN DEFAULT 0,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
    )");
} catch (Exception $e) {
    $mensaje = "❌ Error creando tabla: " . $e->getMessage();
}

// Generar notificaciones de prueba
if (isset($_POST['generar_pruebas']) && $db) {
    $usuario_id = $_SESSION['usuario_id'];
    
    try {
        // Notificación 1: Equipo
        $stmt = $db->prepare("INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, enlace) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$usuario_id, 'equipo', '🎒 Nuevo equipo disponible', 'Se ha agregado "Cuerda de 60m" al inventario del club', 'equipos.php']);
        
        // Notificación 2: Salida
        $stmt->execute([$usuario_id, 'salida', '🏔️ Nueva salida programada', 'Se ha creado la salida "Cerro Negro" para el 15 de Octubre', 'salidas.php']);
        
        // Notificación 3: Cuota
        $stmt->execute([$usuario_id, 'cuota', '💰 Recordatorio de pago', 'Tu cuota de Octubre 2024 vence en 5 días', 'cuotas.php']);
        
        // Notificación 4: Sistema
        $stmt->execute([$usuario_id, 'sistema', '⚙️ Actualización del sistema', 'Se han agregado nuevas funciones al sistema', 'dashboard.php']);
        
        $mensaje = '✅ 4 notificaciones de prueba generadas correctamente';
        
    } catch (Exception $e) {
        $mensaje = "❌ Error generando notificaciones: " . $e->getMessage();
    }
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Probar Notificaciones</title>
    <style>
        body { font-family: Arial; margin: 0; background: #f5f5f5; }
        .container { max-width: 600px; margin: 100px auto; background: white; padding: 30px; border-radius: 10px; }
        .btn { background: #2c5aa0; color: white; padding: 15px 30px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; }
        .mensaje { padding: 15px; border-radius: 5px; margin: 20px 0; }
        .success { background: #d4edda; color: #155724; }
        .error { background: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <?php include 'includes/header.php'; ?>
    
    <div class="container">
        <h1>🔔 Probar Sistema de Notificaciones</h1>
        
        <?php if ($mensaje): ?>
            <div class="mensaje <?php echo strpos($mensaje, '✅') !== false ? 'success' : 'error'; ?>">
                <?php echo $mensaje; ?>
            </div>
        <?php endif; ?>
        
        <p>Este script generará 4 notificaciones de prueba en tu cuenta:</p>
        <ul>
            <li>🎒 Notificación de equipo nuevo</li>
            <li>🏔️ Notificación de salida programada</li>
            <li>💰 Notificación de recordatorio de pago</li>
            <li>⚙️ Notificación del sistema</li>
        </ul>
        
        <form method="POST">
            <button type="submit" name="generar_pruebas" class="btn">🚀 Generar Notificaciones de Prueba</button>
        </form>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <h3>📋 Para probar:</h3>
            <ol>
                <li>Haz click en el botón arriba</li>
                <li>Ve a cualquier página del sistema</li>
                <li>Haz click en la campana 🔔 del header</li>
                <li>Deberías ver las 4 notificaciones</li>
                <li>Haz click en una notificación para marcarla como leída</li>
            </ol>
        </div>
        
        <div style="margin-top: 20px;">
            <a href="dashboard.php" style="color: #2c5aa0;">← Volver al Dashboard</a>
        </div>
    </div>
</body>
</html>
