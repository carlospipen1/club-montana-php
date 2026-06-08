<?php
session_start();
header('Content-Type: text/html; charset=utf-8');

if (!isset($_SESSION['usuario_id'])) {
    header('Location: login.php');
    exit;
}

require_once 'config/database.php';
$database = new Database();
$db = $database->getConnection();

$mensaje = '';

// Procesar acciones
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Agregar nuevo equipo
    if (isset($_POST['agregar_equipo'])) {
        $nombre = $_POST['nombre'] ?? '';
        $categoria = $_POST['categoria'] ?? '';
        $descripcion = $_POST['descripcion'] ?? '';
        $estado = 'disponible';
        
        if (!empty($nombre) && !empty($categoria)) {
            try {
                $stmt = $db->prepare("INSERT INTO equipos (nombre, categoria, descripcion, estado, fecha_adquisicion) VALUES (?, ?, ?, ?, DATE('now'))");
                $stmt->execute([$nombre, $categoria, $descripcion, $estado]);
                $mensaje = "✅ Equipo '$nombre' agregado correctamente";
                
                // Notificar a todos sobre nuevo equipo
                $usuarios = $db->query("SELECT id FROM usuarios WHERE estado = 'activo'")->fetchAll(PDO::FETCH_COLUMN);
                foreach ($usuarios as $usuario_id) {
                    $db->prepare("INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, enlace) VALUES (?, 'equipo', '🎒 Nuevo equipo disponible', 'Se ha agregado \"$nombre\" al inventario', 'equipos.php')")
                       ->execute([$usuario_id]);
                }
                
            } catch (Exception $e) {
                $mensaje = "❌ Error al agregar equipo: " . $e->getMessage();
            }
        }
    }
    
    // Solicitar préstamo
    if (isset($_POST['solicitar_prestamo'])) {
        $equipo_id = $_POST['equipo_id'] ?? '';
        $fecha_desde = $_POST['fecha_desde'] ?? '';
        $fecha_hasta = $_POST['fecha_hasta'] ?? '';
        $motivo = $_POST['motivo'] ?? '';
        
        if (!empty($equipo_id) && !empty($fecha_desde) && !empty($fecha_hasta)) {
            try {
                // Verificar que el equipo esté disponible
                $stmt = $db->prepare("SELECT estado FROM equipos WHERE id = ?");
                $stmt->execute([$equipo_id]);
                $equipo = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($equipo && $equipo['estado'] === 'disponible') {
                    // Crear tabla de préstamos si no existe
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
                    
                    $stmt = $db->prepare("INSERT INTO prestamos_equipo (equipo_id, usuario_id, fecha_desde, fecha_hasta, motivo) VALUES (?, ?, ?, ?, ?)");
                    $stmt->execute([$equipo_id, $_SESSION['usuario_id'], $fecha_desde, $fecha_hasta, $motivo]);
                    
                    // Cambiar estado del equipo a "reservado"
                    $db->prepare("UPDATE equipos SET estado = 'reservado' WHERE id = ?")->execute([$equipo_id]);
                    
                    $mensaje = "✅ Solicitud de préstamo enviada. Espera aprobación del encargado.";
                    
                    // Notificar al encargado de equipo
                    $encargados = $db->query("SELECT id FROM usuarios WHERE rol = 'encargado_equipo' AND estado = 'activo'")->fetchAll(PDO::FETCH_COLUMN);
                    $equipo_nombre = $db->query("SELECT nombre FROM equipos WHERE id = $equipo_id")->fetchColumn();
                    
                    foreach ($encargados as $encargado_id) {
                        $db->prepare("INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, enlace) VALUES (?, 'equipo', '📋 Nueva solicitud de préstamo', 'Solicitud de $equipo_nombre por " . $_SESSION['usuario_nombre'] . "', 'gestion_prestamos.php')")
                           ->execute([$encargado_id]);
                    }
                    
                } else {
                    $mensaje = "❌ El equipo no está disponible para préstamo";
                }
            } catch (Exception $e) {
                $mensaje = "❌ Error al solicitar préstamo: " . $e->getMessage();
            }
        }
    }
}

// Obtener equipos
$equipos = [];
$categorias = ['Escalada', 'Montañismo', 'Camping', 'Seguridad', 'Navegación', 'Otros'];
try {
    $stmt = $db->query("SELECT * FROM equipos ORDER BY categoria, nombre");
    $equipos = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    $mensaje = "Error al cargar equipos: " . $e->getMessage();
}

// Obtener préstamos del usuario actual
$mis_prestamos = [];
try {
    $stmt = $db->prepare("
        SELECT p.*, e.nombre as equipo_nombre, e.categoria 
        FROM prestamos_equipo p 
        JOIN equipos e ON p.equipo_id = e.id 
        WHERE p.usuario_id = ? 
        ORDER BY p.fecha_solicitud DESC
    ");
    $stmt->execute([$_SESSION['usuario_id']]);
    $mis_prestamos = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    // Tabla puede no existir aún
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestión de Equipo - Club de Montana</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .card { background: white; padding: 25px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .btn { display: inline-block; padding: 10px 20px; background: #2c5aa0; color: white; text-decoration: none; border-radius: 5px; border: none; cursor: pointer; }
        .btn-success { background: #28a745; }
        .btn-warning { background: #ffc107; color: #000; }
        .btn-danger { background: #dc3545; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input, select, textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box; }
        .mensaje { padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .equipo-card { border-left: 4px solid; padding: 15px; margin-bottom: 15px; background: #f8f9fa; border-radius: 5px; }
        .disponible { border-left-color: #28a745; }
        .reservado { border-left-color: #ffc107; }
        .prestado { border-left-color: #007bff; }
        .mantencion { border-left-color: #dc3545; }
        .estado-badge { padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; color: white; }
        .nav { background: #e9ecef; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .nav a { margin-right: 15px; color: #2c5aa0; text-decoration: none; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: bold; }
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
            <a href="#inventario">📦 Inventario</a>
            <a href="#agregar">➕ Agregar Equipo</a>
            <a href="#solicitar">🎒 Solicitar Préstamo</a>
            <a href="#mis-prestamos">📋 Mis Préstamos</a>
            <?php if ($_SESSION['usuario_rol'] === 'encargado_equipo' || $_SESSION['usuario_rol'] === 'admin'): ?>
            <a href="gestion_prestamos.php">⚙️ Gestionar Préstamos</a>
            <?php endif; ?>
        </div>

        <!-- Inventario de Equipo -->
        <div class="card" id="inventario">
            <h2>📦 Inventario de Equipo (<?php echo count($equipos); ?>)</h2>
            
            <?php if (empty($equipos)): ?>
                <p>No hay equipo registrado en el inventario.</p>
            <?php else: ?>
                <div class="grid-3">
                    <?php foreach ($equipos as $equipo): ?>
                    <div class="equipo-card <?php echo $equipo['estado']; ?>">
                        <h4 style="margin: 0 0 10px 0;"><?php echo htmlspecialchars($equipo['nombre']); ?></h4>
                        <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
                            📁 <?php echo htmlspecialchars($equipo['categoria']); ?>
                        </div>
                        <?php if (!empty($equipo['descripcion'])): ?>
                        <p style="font-size: 13px; margin: 0 0 10px 0; color: #555;">
                            <?php echo htmlspecialchars($equipo['descripcion']); ?>
                        </p>
                        <?php endif; ?>
                        <div style="display: flex; justify-content: between; align-items: center;">
                            <span class="estado-badge" style="background: 
                                <?php echo match($equipo['estado']) {
                                    'disponible' => '#28a745',
                                    'reservado' => '#ffc107',
                                    'prestado' => '#007bff',
                                    'mantencion' => '#dc3545',
                                    default => '#6c757d'
                                }; ?>;">
                                ● <?php echo ucfirst($equipo['estado']); ?>
                            </span>
                            <small style="color: #666;">
                                <?php echo date('d/m/Y', strtotime($equipo['fecha_adquisicion'])); ?>
                            </small>
                        </div>
                    </div>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        </div>

        <!-- Agregar nuevo equipo (solo encargados/admin) -->
        <?php if ($_SESSION['usuario_rol'] === 'encargado_equipo' || $_SESSION['usuario_rol'] === 'admin'): ?>
        <div class="card" id="agregar">
            <h2>➕ Agregar Nuevo Equipo</h2>
            <form method="POST">
                <div class="grid-2">
                    <div class="form-group">
                        <label for="nombre">Nombre del Equipo *</label>
                        <input type="text" id="nombre" name="nombre" required placeholder="Ej: Cuerda dinámica 60m">
                    </div>
                    <div class="form-group">
                        <label for="categoria">Categoría *</label>
                        <select id="categoria" name="categoria" required>
                            <option value="">Seleccionar categoría</option>
                            <?php foreach ($categorias as $cat): ?>
                            <option value="<?php echo $cat; ?>"><?php echo $cat; ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label for="descripcion">Descripción</label>
                    <textarea id="descripcion" name="descripcion" rows="3" placeholder="Características, marca, especificaciones..."></textarea>
                </div>
                <button type="submit" name="agregar_equipo" class="btn btn-success">➕ Agregar al Inventario</button>
            </form>
        </div>
        <?php endif; ?>

        <!-- Solicitar préstamo -->
        <div class="card" id="solicitar">
            <h2>🎒 Solicitar Préstamo de Equipo</h2>
            <form method="POST">
                <div class="grid-2">
                    <div class="form-group">
                        <label for="equipo_id">Equipo a solicitar *</label>
                        <select id="equipo_id" name="equipo_id" required>
                            <option value="">Seleccionar equipo</option>
                            <?php foreach ($equipos as $equipo): ?>
                                <?php if ($equipo['estado'] === 'disponible'): ?>
                                <option value="<?php echo $equipo['id']; ?>">
                                    <?php echo htmlspecialchars($equipo['nombre']); ?> (<?php echo $equipo['categoria']; ?>)
                                </option>
                                <?php endif; ?>
                            <?php endforeach; ?>
                        </select>
                        <?php 
                        $disponibles = array_filter($equipos, fn($e) => $e['estado'] === 'disponible');
                        if (empty($disponibles)): ?>
                        <small style="color: #dc3545;">No hay equipos disponibles para préstamo</small>
                        <?php endif; ?>
                    </div>
                    <div class="form-group">
                        <label for="motivo">Motivo del préstamo *</label>
                        <input type="text" id="motivo" name="motivo" required placeholder="Ej: Salida al Cerro X, práctica de escalada...">
                    </div>
                </div>
                <div class="grid-2">
                    <div class="form-group">
                        <label for="fecha_desde">Fecha desde *</label>
                        <input type="date" id="fecha_desde" name="fecha_desde" required min="<?php echo date('Y-m-d'); ?>">
                    </div>
                    <div class="form-group">
                        <label for="fecha_hasta">Fecha hasta *</label>
                        <input type="date" id="fecha_hasta" name="fecha_hasta" required>
                    </div>
                </div>
                <button type="submit" name="solicitar_prestamo" class="btn" <?php echo empty($disponibles) ? 'disabled' : ''; ?>>📨 Enviar Solicitud</button>
            </form>
        </div>

        <!-- Mis préstamos -->
        <div class="card" id="mis-prestamos">
            <h2>📋 Mis Préstamos Solicitados</h2>
            
            <?php if (empty($mis_prestamos)): ?>
                <p>No has solicitado préstamos de equipo.</p>
            <?php else: ?>
                <table>
                    <thead>
                        <tr>
                            <th>Equipo</th>
                            <th>Fecha Solicitud</th>
                            <th>Período</th>
                            <th>Motivo</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($mis_prestamos as $prestamo): ?>
                        <tr>
                            <td>
                                <strong><?php echo htmlspecialchars($prestamo['equipo_nombre']); ?></strong><br>
                                <small><?php echo htmlspecialchars($prestamo['categoria']); ?></small>
                            </td>
                            <td><?php echo date('d/m/Y H:i', strtotime($prestamo['fecha_solicitud'])); ?></td>
                            <td>
                                <?php echo date('d/m/Y', strtotime($prestamo['fecha_desde'])); ?> -<br>
                                <?php echo date('d/m/Y', strtotime($prestamo['fecha_hasta'])); ?>
                            </td>
                            <td><?php echo htmlspecialchars($prestamo['motivo']); ?></td>
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
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>
    </div>

    <script>
        // Validación de fechas
        document.getElementById('fecha_desde').addEventListener('change', function() {
            const desde = this.value;
            const hasta = document.getElementById('fecha_hasta');
            if (desde) {
                hasta.min = desde;
                if (hasta.value && hasta.value < desde) {
                    hasta.value = '';
                }
            }
        });
    </script>
</body>
</html>
