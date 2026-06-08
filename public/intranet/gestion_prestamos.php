<?php
session_start();
header('Content-Type: text/html; charset=utf-8');

// Solo encargados de equipo y admin pueden acceder
if (!isset($_SESSION['usuario_id']) || ($_SESSION['usuario_rol'] !== 'encargado_equipo' && $_SESSION['usuario_rol'] !== 'admin')) {
    header('Location: dashboard.php');
    exit;
}

require_once 'config/database.php';
$database = new Database();
$db = $database->getConnection();

$mensaje = '';

// Procesar acciones sobre préstamos
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $prestamo_id = $_POST['prestamo_id'] ?? '';
    $accion = $_POST['accion'] ?? '';
    
    if (!empty($prestamo_id) && !empty($accion)) {
        try {
            // Obtener información del préstamo
            $stmt = $db->prepare("SELECT p.*, e.id as equipo_id, e.nombre as equipo_nombre, u.nombres, u.apellidos 
                                 FROM prestamos_equipo p 
                                 JOIN equipos e ON p.equipo_id = e.id 
                                 JOIN usuarios u ON p.usuario_id = u.id 
                                 WHERE p.id = ?");
            $stmt->execute([$prestamo_id]);
            $prestamo = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($prestamo) {
                if ($accion === 'aprobar') {
                    // Aprobar préstamo
                    $db->prepare("UPDATE prestamos_equipo SET estado = 'aprobado', aprobado_por = ?, fecha_aprobacion = CURRENT_TIMESTAMP WHERE id = ?")
                       ->execute([$_SESSION['usuario_id'], $prestamo_id]);
                    
                    $db->prepare("UPDATE equipos SET estado = 'prestado' WHERE id = ?")
                       ->execute([$prestamo['equipo_id']]);
                    
                    $mensaje = "✅ Préstamo aprobado correctamente";
                    
                    // Notificar al usuario
                    $db->prepare("INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, enlace) VALUES (?, 'equipo', '✅ Préstamo aprobado', 'Tu solicitud de \"{$prestamo['equipo_nombre']}\" ha sido aprobada', 'equipos.php')")
                       ->execute([$prestamo['usuario_id']]);
                       
                } elseif ($accion === 'rechazar') {
                    // Rechazar préstamo
                    $db->prepare("UPDATE prestamos_equipo SET estado = 'rechazado', aprobado_por = ?, fecha_aprobacion = CURRENT_TIMESTAMP WHERE id = ?")
                       ->execute([$_SESSION['usuario_id'], $prestamo_id]);
                    
                    $db->prepare("UPDATE equipos SET estado = 'disponible' WHERE id = ?")
                       ->execute([$prestamo['equipo_id']]);
                    
                    $mensaje = "❌ Préstamo rechazado";
                    
                    // Notificar al usuario
                    $db->prepare("INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, enlace) VALUES (?, 'equipo', '❌ Préstamo rechazado', 'Tu solicitud de \"{$prestamo['equipo_nombre']}\" ha sido rechazada', 'equipos.php')")
                       ->execute([$prestamo['usuario_id']]);
                       
                } elseif ($accion === 'marcar_devuelto') {
                    // Marcar como devuelto
                    $db->prepare("UPDATE prestamos_equipo SET estado = 'devuelto' WHERE id = ?")
                       ->execute([$prestamo_id]);
                    
                    $db->prepare("UPDATE equipos SET estado = 'disponible' WHERE id = ?")
                       ->execute([$prestamo['equipo_id']]);
                    
                    $mensaje = "📦 Equipo marcado como devuelto";
                }
            }
        } catch (Exception $e) {
            $mensaje = "❌ Error procesando la acción: " . $e->getMessage();
        }
    }
}

// Obtener préstamos pendientes
$prestamos_pendientes = [];
$prestamos_activos = [];
$historial_prestamos = [];

try {
    // Crear tabla si no existe
    $db->exec("CREATE TABLE IF NOT EXISTS prestamos_equipo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        equipo_id INTEGER NOT NULL,
        usuario_id INTEGER NOT NULL,
        fecha_solicitud DATETIME DEFAULT CURRENT_TIMESTAMP,
        fecha_desde DATE NOT NULL,
        fecha_hasta DATE NOT NULL,
        motivo TEXT NOT NULL,
        estado TEXT DEFAULT 'pendiente',
        aprobado_por INTEGER,
        fecha_aprobacion DATETIME,
        FOREIGN KEY (equipo_id) REFERENCES equipos(id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )");
    
    // Préstamos pendientes
    $stmt = $db->query("
        SELECT p.*, e.nombre as equipo_nombre, e.categoria, 
               u.nombres, u.apellidos, u.email
        FROM prestamos_equipo p 
        JOIN equipos e ON p.equipo_id = e.id 
        JOIN usuarios u ON p.usuario_id = u.id 
        WHERE p.estado = 'pendiente'
        ORDER BY p.fecha_solicitud DESC
    ");
    $prestamos_pendientes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Préstamos activos (aprobados y en período)
    $stmt = $db->query("
        SELECT p.*, e.nombre as equipo_nombre, e.categoria, 
               u.nombres, u.apellidos, u.email
        FROM prestamos_equipo p 
        JOIN equipos e ON p.equipo_id = e.id 
        JOIN usuarios u ON p.usuario_id = u.id 
        WHERE p.estado = 'aprobado' 
        AND DATE('now') BETWEEN p.fecha_desde AND p.fecha_hasta
        ORDER BY p.fecha_desde
    ");
    $prestamos_activos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Historial (últimos 30 días)
    $stmt = $db->query("
        SELECT p.*, e.nombre as equipo_nombre, e.categoria, 
               u.nombres, u.apellidos, u.email,
               a.nombres as aprobador_nombres, a.apellidos as aprobador_apellidos
        FROM prestamos_equipo p 
        JOIN equipos e ON p.equipo_id = e.id 
        JOIN usuarios u ON p.usuario_id = u.id 
        LEFT JOIN usuarios a ON p.aprobado_por = a.id
        WHERE p.fecha_solicitud >= DATE('now', '-30 days')
        ORDER BY p.fecha_solicitud DESC
        LIMIT 50
    ");
    $historial_prestamos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
} catch (Exception $e) {
    $mensaje = "Error cargando préstamos: " . $e->getMessage();
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestión de Préstamos - Club de Montana</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .card { background: white; padding: 25px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .btn { display: inline-block; padding: 8px 15px; color: white; text-decoration: none; border-radius: 5px; border: none; cursor: pointer; font-size: 12px; }
        .btn-success { background: #28a745; }
        .btn-danger { background: #dc3545; }
        .btn-warning { background: #ffc107; color: #000; }
        .btn-info { background: #17a2b8; }
        .mensaje { padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: bold; }
        .estado-badge { padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; color: white; }
        .nav { background: #e9ecef; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .nav a { margin-right: 15px; color: #2c5aa0; text-decoration: none; font-weight: bold; }
        .prestamo-item { border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 15px; background: #fffbf0; border-radius: 5px; }
        .prestamo-item.aprobado { border-left-color: #28a745; background: #f0fff4; }
        .prestamo-item.rechazado { border-left-color: #dc3545; background: #fff5f5; }
    </style>
</head>
<body>
    <?php include 'includes/header.php'; ?>

    <div class="container">
        <?php if ($mensaje): ?>
            <div class="mensaje <?php echo strpos($mensaje, '✅') !== false ? 'success' : 'error'; ?>">
                <?php echo htmlspecialchars($mensaje); ?>
            </div>
        <?php endif; ?>

        <div class="nav">
            <a href="#pendientes">⏳ Pendientes (<?php echo count($prestamos_pendientes); ?>)</a>
            <a href="#activos">✅ Activos (<?php echo count($prestamos_activos); ?>)</a>
            <a href="#historial">📊 Historial</a>
            <a href="equipos.php">📦 Volver a Equipos</a>
        </div>

        <h1>⚙️ Gestión de Préstamos de Equipo</h1>

        <!-- Préstamos pendientes -->
        <div class="card" id="pendientes">
            <h2>⏳ Solicitudes Pendientes</h2>
            
            <?php if (empty($prestamos_pendientes)): ?>
                <p>No hay solicitudes pendientes de aprobación.</p>
            <?php else: ?>
                <?php foreach ($prestamos_pendientes as $prestamo): ?>
                <div class="prestamo-item">
                    <div style="display: flex; justify-content: between; align-items: start; margin-bottom: 10px;">
                        <div style="flex-grow: 1;">
                            <h3 style="margin: 0 0 5px 0;"><?php echo htmlspecialchars($prestamo['equipo_nombre']); ?></h3>
                            <div style="font-size: 14px; color: #666;">
                                <strong>Solicitante:</strong> <?php echo htmlspecialchars($prestamo['nombres'] . ' ' . $prestamo['apellidos']); ?> 
                                (<?php echo htmlspecialchars($prestamo['email']); ?>)<br>
                                <strong>Período:</strong> <?php echo date('d/m/Y', strtotime($prestamo['fecha_desde'])); ?> - <?php echo date('d/m/Y', strtotime($prestamo['fecha_hasta'])); ?><br>
                                <strong>Motivo:</strong> <?php echo htmlspecialchars($prestamo['motivo']); ?>
                            </div>
                        </div>
                        <div style="margin-left: 15px;">
                            <form method="POST" style="display: inline;">
                                <input type="hidden" name="prestamo_id" value="<?php echo $prestamo['id']; ?>">
                                <button type="submit" name="accion" value="aprobar" class="btn btn-success">✅ Aprobar</button>
                            </form>
                            <form method="POST" style="display: inline;">
                                <input type="hidden" name="prestamo_id" value="<?php echo $prestamo['id']; ?>">
                                <button type="submit" name="accion" value="rechazar" class="btn btn-danger">❌ Rechazar</button>
                            </form>
                        </div>
                    </div>
                    <div style="font-size: 12px; color: #999;">
                        Solicitado el: <?php echo date('d/m/Y H:i', strtotime($prestamo['fecha_solicitud'])); ?>
                    </div>
                </div>
                <?php endforeach; ?>
            <?php endif; ?>
        </div>

        <!-- Préstamos activos -->
        <div class="card" id="activos">
            <h2>✅ Préstamos Activos</h2>
            
            <?php if (empty($prestamos_activos)): ?>
                <p>No hay préstamos activos en este momento.</p>
            <?php else: ?>
                <table>
                    <thead>
                        <tr>
                            <th>Equipo</th>
                            <th>Solicitante</th>
                            <th>Período</th>
                            <th>Días restantes</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($prestamos_activos as $prestamo): 
                            $dias_restantes = (strtotime($prestamo['fecha_hasta']) - time()) / (60 * 60 * 24);
                            $dias_restantes = ceil($dias_restantes);
                        ?>
                        <tr>
                            <td>
                                <strong><?php echo htmlspecialchars($prestamo['equipo_nombre']); ?></strong><br>
                                <small><?php echo htmlspecialchars($prestamo['categoria']); ?></small>
                            </td>
                            <td><?php echo htmlspecialchars($prestamo['nombres'] . ' ' . $prestamo['apellidos']); ?></td>
                            <td>
                                <?php echo date('d/m/Y', strtotime($prestamo['fecha_desde'])); ?> -<br>
                                <?php echo date('d/m/Y', strtotime($prestamo['fecha_hasta'])); ?>
                            </td>
                            <td>
                                <span style="color: <?php echo $dias_restantes <= 2 ? '#dc3545' : ($dias_restantes <= 5 ? '#ffc107' : '#28a745'); ?>; font-weight: bold;">
                                    <?php echo $dias_restantes; ?> días
                                </span>
                            </td>
                            <td>
                                <form method="POST" style="display: inline;">
                                    <input type="hidden" name="prestamo_id" value="<?php echo $prestamo['id']; ?>">
                                    <button type="submit" name="accion" value="marcar_devuelto" class="btn btn-info">📦 Marcar Devuelto</button>
                                </form>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>

        <!-- Historial -->
        <div class="card" id="historial">
            <h2>📊 Historial de Préstamos (Últimos 30 días)</h2>
            
            <?php if (empty($historial_prestamos)): ?>
                <p>No hay historial de préstamos.</p>
            <?php else: ?>
                <table>
                    <thead>
                        <tr>
                            <th>Equipo</th>
                            <th>Solicitante</th>
                            <th>Fecha Solicitud</th>
                            <th>Período</th>
                            <th>Estado</th>
                            <th>Aprobado por</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($historial_prestamos as $prestamo): ?>
                        <tr>
                            <td><?php echo htmlspecialchars($prestamo['equipo_nombre']); ?></td>
                            <td><?php echo htmlspecialchars($prestamo['nombres'] . ' ' . $prestamo['apellidos']); ?></td>
                            <td><?php echo date('d/m/Y H:i', strtotime($prestamo['fecha_solicitud'])); ?></td>
                            <td>
                                <?php echo date('d/m/Y', strtotime($prestamo['fecha_desde'])); ?> -<br>
                                <?php echo date('d/m/Y', strtotime($prestamo['fecha_hasta'])); ?>
                            </td>
                            <td>
                                <span class="estado-badge" style="background: 
                                    <?php echo match($prestamo['estado']) {
                                        'pendiente' => '#ffc107',
                                        'aprobado' => '#28a745',
                                        'rechazado' => '#dc3545',
                                        'devuelto' => '#6c757d',
                                        default => '#6c757d'
                                    }; ?>;">
                                    <?php echo ucfirst($prestamo['estado']); ?>
                                </span>
                            </td>
                            <td>
                                <?php if ($prestamo['aprobador_nombres']): ?>
                                    <?php echo htmlspecialchars($prestamo['aprobador_nombres'] . ' ' . $prestamo['aprobador_apellidos']); ?><br>
                                    <small><?php echo date('d/m/Y H:i', strtotime($prestamo['fecha_aprobacion'])); ?></small>
                                <?php else: ?>
                                    <span style="color: #666;">N/A</span>
                                <?php endif; ?>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>
    </div>
</body>
</html>
