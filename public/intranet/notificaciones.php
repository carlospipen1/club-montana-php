<?php
session_start();
header('Content-Type: text/html; charset=utf-8');

if (!isset($_SESSION['usuario_id'])) {
    header('Location: login.php');
    exit;
}

require_once 'config/database.php';
require_once 'config/NotificationSystem.php';

$database = new Database();
$db = $database->getConnection();
$notificationSystem = new NotificationSystem($db);

// Obtener todas las notificaciones del usuario
$stmt = $db->prepare("SELECT * FROM notificaciones WHERE usuario_id = ? ORDER BY fecha_creacion DESC");
$stmt->execute([$_SESSION['usuario_id']]);
$todas_notificaciones = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Marcar como leída si se solicita
if (isset($_GET['marcar_leida']) && is_numeric($_GET['marcar_leida'])) {
    $notificationSystem->markAsRead($_GET['marcar_leida']);
    header('Location: notificaciones.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Mis Notificaciones</title>
    <style>
        body { font-family: Arial; margin: 0; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .notification { background: white; padding: 20px; margin-bottom: 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .notification.unread { background: #f0f8ff; border-left: 4px solid #2c5aa0; }
        .notification.leida { opacity: 0.7; }
        .btn { background: #2c5aa0; color: white; padding: 8px 15px; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; display: inline-block; }
        .timestamp { color: #666; font-size: 12px; margin-top: 5px; }
    </style>
</head>
<body>
    <?php include 'includes/header.php'; ?>
    
    <div class="container">
        <h1>🔔 Mis Notificaciones</h1>
        
        <div style="margin-bottom: 20px;">
            <a href="probar_notificaciones.php" class="btn">🧪 Generar Notificaciones de Prueba</a>
            <a href="notificaciones.php?action=limpiar" class="btn" style="background: #dc3545;">🗑️ Limpiar Todas</a>
        </div>
        
        <?php if (empty($todas_notificaciones)): ?>
            <div style="text-align: center; padding: 40px; color: #666;">
                <div style="font-size: 48px; margin-bottom: 20px;">🔔</div>
                <h3>No tienes notificaciones</h3>
                <p>Todas tus notificaciones aparecerán aquí.</p>
            </div>
        <?php else: ?>
            <div style="margin-bottom: 15px;">
                <strong>Total: <?php echo count($todas_notificaciones); ?> notificaciones</strong>
            </div>
            
            <?php foreach ($todas_notificaciones as $notif): ?>
            <div class="notification <?php echo $notif['leida'] ? 'leida' : 'unread'; ?>">
                <div style="display: flex; justify-content: between; align-items: start;">
                    <div style="flex-grow: 1;">
                        <h3 style="margin: 0 0 5px 0; font-size: 16px;">
                            <?php echo htmlspecialchars($notif['titulo']); ?>
                        </h3>
                        <p style="margin: 0 0 10px 0; color: #333;">
                            <?php echo htmlspecialchars($notif['mensaje']); ?>
                        </p>
                        <div class="timestamp">
                            <?php 
                            $fecha = new DateTime($notif['fecha_creacion']);
                            echo $fecha->format('d/m/Y H:i');
                            ?>
                            • 
                            <span style="
                                background: <?php echo match($notif['tipo']) {
                                    'equipo' => '#e8f5e8',
                                    'salida' => '#fff3cd', 
                                    'cuota' => '#ffeaa7',
                                    'sistema' => '#e3f2fd',
                                    default => '#f8f9fa'
                                }; ?>;
                                color: #333;
                                padding: 2px 8px;
                                border-radius: 10px;
                                font-size: 10px;
                            ">
                                <?php echo ucfirst($notif['tipo']); ?>
                            </span>
                        </div>
                    </div>
                    <div style="margin-left: 15px;">
                        <?php if (!$notif['leida']): ?>
                            <a href="notificaciones.php?marcar_leida=<?php echo $notif['id']; ?>" class="btn" style="background: #28a745; font-size: 12px;">Marcar leída</a>
                        <?php endif; ?>
                        <?php if ($notif['enlace']): ?>
                            <a href="<?php echo $notif['enlace']; ?>" class="btn" style="font-size: 12px;">Ver</a>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        <?php endif; ?>
    </div>
</body>
</html>
