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

// Procesar creación de salida
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['crear_salida'])) {
    $nombre = $_POST['nombre'] ?? '';
    $descripcion = $_POST['descripcion'] ?? '';
    $fecha_salida = $_POST['fecha_salida'] ?? '';
    $fecha_limite_inscripcion = $_POST['fecha_limite_inscripcion'] ?? '';
    $lugar = $_POST['lugar'] ?? '';
    $nivel_dificultad = $_POST['nivel_dificultad'] ?? 'medio';
    $cupo_maximo = $_POST['cupo_maximo'] ?? 0;
    $equipo_requerido = $_POST['equipo_requerido'] ?? '';
    
    if (!empty($nombre) && !empty($fecha_salida)) {
        try {
            $stmt = $db->prepare("INSERT INTO salidas (nombre, descripcion, fecha_salida, fecha_limite_inscripcion, lugar, nivel_dificultad, cupo_maximo, equipo_requerido, encargado_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$nombre, $descripcion, $fecha_salida, $fecha_limite_inscripcion, $lugar, $nivel_dificultad, $cupo_maximo, $equipo_requerido, $_SESSION['usuario_id']]);
            
            $salida_id = $db->lastInsertId();
            $mensaje = "✅ Salida '$nombre' creada correctamente";
            
            // Notificar a todos los usuarios
            $usuarios = $db->query("SELECT id FROM usuarios WHERE estado = 'activo'")->fetchAll(PDO::FETCH_COLUMN);
            foreach ($usuarios as $usuario_id) {
                $db->prepare("INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, enlace) VALUES (?, 'salida', '🏔️ Nueva salida programada', 'Se ha creado la salida: $nombre - Lugar: $lugar', 'salidas.php?id=$salida_id')")
                   ->execute([$usuario_id]);
            }
            
        } catch (Exception $e) {
            $mensaje = "❌ Error al crear salida: " . $e->getMessage();
        }
    }
}

// Procesar inscripción
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['inscribirse'])) {
    $salida_id = $_POST['salida_id'] ?? '';
    
    if (!empty($salida_id)) {
        try {
            // Verificar cupos y fecha límite
            $stmt = $db->prepare("
                SELECT s.*, COUNT(i.id) as inscritos_count 
                FROM salidas s 
                LEFT JOIN inscripciones_salidas i ON s.id = i.salida_id 
                WHERE s.id = ? 
                GROUP BY s.id
            ");
            $stmt->execute([$salida_id]);
            $salida = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($salida) {
                $fecha_limite = strtotime($salida['fecha_limite_inscripcion']);
                $ahora = time();
                
                if ($ahora > $fecha_limite) {
                    $mensaje = "❌ La fecha límite de inscripción ha pasado";
                } elseif ($salida['inscritos_count'] >= $salida['cupo_maximo']) {
                    $mensaje = "❌ Cupo completo para esta salida";
                } else {
                    $stmt = $db->prepare("INSERT OR IGNORE INTO inscripciones_salidas (salida_id, usuario_id, fecha_inscripcion) VALUES (?, ?, CURRENT_TIMESTAMP)");
                    $stmt->execute([$salida_id, $_SESSION['usuario_id']]);
                    
                    if ($stmt->rowCount() > 0) {
                        $mensaje = "✅ Te has inscrito correctamente a la salida";
                        
                        // Notificar al encargado
                        $db->prepare("INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, enlace) VALUES (?, 'salida', '📝 Nueva inscripción', '{$_SESSION['usuario_nombre']} se ha inscrito en: {$salida['nombre']}', 'salidas.php?id={$salida_id}&tab=inscritos')")
                           ->execute([$salida['encargado_id']]);
                    } else {
                        $mensaje = "ℹ️ Ya estabas inscrito en esta salida";
                    }
                }
            }
        } catch (Exception $e) {
            $mensaje = "❌ Error al inscribirse: " . $e->getMessage();
        }
    }
}

// Cancelar inscripción
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['cancelar_inscripcion'])) {
    $salida_id = $_POST['salida_id'] ?? '';
    
    if (!empty($salida_id)) {
        try {
            $stmt = $db->prepare("DELETE FROM inscripciones_salidas WHERE salida_id = ? AND usuario_id = ?");
            $stmt->execute([$salida_id, $_SESSION['usuario_id']]);
            
            if ($stmt->rowCount() > 0) {
                $mensaje = "✅ Inscripción cancelada correctamente";
            }
        } catch (Exception $e) {
            $mensaje = "❌ Error al cancelar inscripción: " . $e->getMessage();
        }
    }
}

// Obtener salidas
$salidas = [];
$mis_inscripciones = [];
$salida_detalle = null;

try {
    // Crear tabla de inscripciones si no existe
    $db->exec("CREATE TABLE IF NOT EXISTS inscripciones_salidas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        salida_id INTEGER NOT NULL,
        usuario_id INTEGER NOT NULL,
        fecha_inscripcion DATETIME DEFAULT CURRENT_TIMESTAMP,
        asistio BOOLEAN DEFAULT 0,
        observaciones TEXT,
        UNIQUE(salida_id, usuario_id),
        FOREIGN KEY (salida_id) REFERENCES salidas(id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )");
    
    // Actualizar tabla salidas si es necesario
    $db->exec("ALTER TABLE salidas ADD COLUMN equipo_requerido TEXT");
    $db->exec("ALTER TABLE salidas ADD COLUMN cupo_maximo INTEGER DEFAULT 20");
    $db->exec("ALTER TABLE salidas ADD COLUMN nivel_dificultad TEXT DEFAULT 'medio'");
    
    // Obtener salida específica si hay ID
    if (isset($_GET['id']) && is_numeric($_GET['id'])) {
        $stmt = $db->prepare("
            SELECT s.*, 
                   u.nombres as encargado_nombres, 
                   u.apellidos as encargado_apellidos,
                   COUNT(i.id) as inscritos_count
            FROM salidas s 
            LEFT JOIN usuarios u ON s.encargado_id = u.id 
            LEFT JOIN inscripciones_salidas i ON s.id = i.salida_id 
            WHERE s.id = ?
            GROUP BY s.id
        ");
        $stmt->execute([$_GET['id']]);
        $salida_detalle = $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    // Obtener todas las salidas
    $stmt = $db->query("
        SELECT s.*, 
               u.nombres as encargado_nombres, 
               u.apellidos as encargado_apellidos,
               COUNT(i.id) as inscritos_count,
               EXISTS(SELECT 1 FROM inscripciones_salidas WHERE salida_id = s.id AND usuario_id = {$_SESSION['usuario_id']}) as estoy_inscrito
        FROM salidas s 
        LEFT JOIN usuarios u ON s.encargado_id = u.id 
        LEFT JOIN inscripciones_salidas i ON s.id = i.salida_id 
        GROUP BY s.id 
        ORDER BY s.fecha_salida ASC
    ");
    $salidas = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Obtener mis inscripciones
    $stmt = $db->prepare("
        SELECT s.*, i.fecha_inscripcion, i.asistio 
        FROM inscripciones_salidas i 
        JOIN salidas s ON i.salida_id = s.id 
        WHERE i.usuario_id = ? 
        ORDER BY s.fecha_salida ASC
    ");
    $stmt->execute([$_SESSION['usuario_id']]);
    $mis_inscripciones = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
} catch (Exception $e) {
    // Ignorar errores de ALTER TABLE si las columnas ya existen
    if (strpos($e->getMessage(), 'duplicate column name') === false) {
        $mensaje = "Error cargando salidas: " . $e->getMessage();
    }
}

$niveles_dificultad = [
    'facil' => '🥾 Fácil - Iniciación',
    'medio' => '⛰️ Medio - Intermedio', 
    'dificil' => '🧗 Difícil - Avanzado',
    'experto' => '🏔️ Experto - Técnico'
];
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Salidas y Eventos - Club de Montana</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .card { background: white; padding: 25px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .btn { display: inline-block; padding: 10px 20px; background: #2c5aa0; color: white; text-decoration: none; border-radius: 5px; border: none; cursor: pointer; }
        .btn-success { background: #28a745; }
        .btn-warning { background: #ffc107; color: #000; }
        .btn-danger { background: #dc3545; }
        .btn-info { background: #17a2b8; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input, select, textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box; }
        .mensaje { padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .nav { background: #e9ecef; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .nav a { margin-right: 15px; color: #2c5aa0; text-decoration: none; font-weight: bold; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .salida-card { border-left: 4px solid; padding: 20px; margin-bottom: 15px; background: #f8f9fa; border-radius: 5px; }
        .salida-card.facil { border-left-color: #28a745; }
        .salida-card.medio { border-left-color: #ffc107; }
        .salida-card.dificil { border-left-color: #fd7e14; }
        .salida-card.experto { border-left-color: #dc3545; }
        .badge { padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; color: white; }
        .badge-facil { background: #28a745; }
        .badge-medio { background: #ffc107; color: #000; }
        .badge-dificil { background: #fd7e14; }
        .badge-experto { background: #dc3545; }
        .progress-bar { background: #e9ecef; border-radius: 10px; height: 10px; margin: 10px 0; }
        .progress-fill { background: #28a745; height: 100%; border-radius: 10px; }
        .tabs { display: flex; border-bottom: 2px solid #2c5aa0; margin-bottom: 20px; }
        .tab { padding: 12px 20px; background: #f8f9fa; border: none; border-bottom: 2px solid transparent; cursor: pointer; }
        .tab.active { background: white; border-bottom: 2px solid #2c5aa0; font-weight: bold; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; }
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
            <a href="dashboard.php">📊 Dashboard</a>
            <a href="#calendario">📅 Calendario</a>
            <a href="#mis-salidas">🥾 Mis Salidas</a>
            <?php if ($_SESSION['usuario_rol'] === 'admin' || $_SESSION['usuario_rol'] === 'comision_tecnica' || $_SESSION['usuario_rol'] === 'presidente'): ?>
            <a href="#crear-salida">➕ Crear Salida</a>
            <a href="#gestion">⚙️ Gestión</a>
            <?php endif; ?>
        </div>

        <h1>🏔️ Salidas y Eventos</h1>

        <!-- Vista de detalle de salida -->
        <?php if ($salida_detalle): ?>
        <div class="card">
            <div style="display: flex; justify-content: between; align-items: start; margin-bottom: 20px;">
                <div style="flex-grow: 1;">
                    <h2 style="margin: 0 0 10px 0;"><?php echo htmlspecialchars($salida_detalle['nombre']); ?></h2>
                    <div style="display: flex; gap: 15px; flex-wrap: wrap; margin-bottom: 15px;">
                        <span class="badge badge-<?php echo $salida_detalle['nivel_dificultad']; ?>">
                            <?php echo $niveles_dificultad[$salida_detalle['nivel_dificultad']] ?? $salida_detalle['nivel_dificultad']; ?>
                        </span>
                        <span>👥 <?php echo $salida_detalle['inscritos_count']; ?>/<?php echo $salida_detalle['cupo_maximo']; ?> inscritos</span>
                        <span>📅 <?php echo date('d/m/Y H:i', strtotime($salida_detalle['fecha_salida'])); ?></span>
                        <span>📍 <?php echo htmlspecialchars($salida_detalle['lugar']); ?></span>
                    </div>
                </div>
                <div>
                    <a href="salidas.php" class="btn">← Volver al listado</a>
                </div>
            </div>

            <?php if (!empty($salida_detalle['descripcion'])): ?>
            <div style="margin-bottom: 20px;">
                <h3>📝 Descripción</h3>
                <p><?php echo nl2br(htmlspecialchars($salida_detalle['descripcion'])); ?></p>
            </div>
            <?php endif; ?>

            <?php if (!empty($salida_detalle['equipo_requerido'])): ?>
            <div style="margin-bottom: 20px;">
                <h3>🎒 Equipo Requerido</h3>
                <p><?php echo nl2br(htmlspecialchars($salida_detalle['equipo_requerido'])); ?></p>
            </div>
            <?php endif; ?>

            <div class="grid-2">
                <div>
                    <h3>📋 Información</h3>
                    <p><strong>Encargado:</strong> <?php echo htmlspecialchars($salida_detalle['encargado_nombres'] . ' ' . $salida_detalle['encargado_apellidos']); ?></p>
                    <p><strong>Fecha límite inscripción:</strong> <?php echo date('d/m/Y H:i', strtotime($salida_detalle['fecha_limite_inscripcion'])); ?></p>
                    <p><strong>Estado:</strong> <?php echo ucfirst($salida_detalle['estado']); ?></p>
                </div>
                <div>
                    <h3>👥 Participación</h3>
                    <?php
                    $porcentaje = $salida_detalle['cupo_maximo'] > 0 ? ($salida_detalle['inscritos_count'] / $salida_detalle['cupo_maximo']) * 100 : 0;
                    ?>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: <?php echo $porcentaje; ?>%"></div>
                    </div>
                    <p><?php echo $salida_detalle['inscritos_count']; ?> de <?php echo $salida_detalle['cupo_maximo']; ?> cupos ocupados</p>
                    
                    <?php
                    $estoy_inscrito = false;
                    foreach ($mis_inscripciones as $inscripcion) {
                        if ($inscripcion['id'] == $salida_detalle['id']) {
                            $estoy_inscrito = true;
                            break;
                        }
                    }
                    
                    $fecha_limite_pasada = time() > strtotime($salida_detalle['fecha_limite_inscripcion']);
                    $cupo_completo = $salida_detalle['inscritos_count'] >= $salida_detalle['cupo_maximo'];
                    ?>
                    
                    <?php if ($estoy_inscrito): ?>
                        <form method="POST" style="margin-top: 15px;">
                            <input type="hidden" name="salida_id" value="<?php echo $salida_detalle['id']; ?>">
                            <button type="submit" name="cancelar_inscripcion" class="btn btn-danger">❌ Cancelar Inscripción</button>
                        </form>
                        <p style="color: #28a745; margin-top: 10px;">✅ Estás inscrito en esta salida</p>
                    <?php elseif (!$fecha_limite_pasada && !$cupo_completo): ?>
                        <form method="POST" style="margin-top: 15px;">
                            <input type="hidden" name="salida_id" value="<?php echo $salida_detalle['id']; ?>">
                            <button type="submit" name="inscribirse" class="btn btn-success">✅ Inscribirse</button>
                        </form>
                    <?php elseif ($fecha_limite_pasada): ?>
                        <p style="color: #dc3545;">❌ Período de inscripción finalizado</p>
                    <?php elseif ($cupo_completo): ?>
                        <p style="color: #dc3545;">❌ Cupo completo</p>
                    <?php endif; ?>
                </div>
            </div>
        </div>
        <?php else: ?>

        <!-- Pestañas principales -->
        <div class="tabs">
            <button class="tab active" onclick="openTab('calendario')">📅 Calendario</button>
            <button class="tab" onclick="openTab('mis-salidas')">🥾 Mis Salidas</button>
            <?php if ($_SESSION['usuario_rol'] === 'admin' || $_SESSION['usuario_rol'] === 'comision_tecnica' || $_SESSION['usuario_rol'] === 'presidente'): ?>
            <button class="tab" onclick="openTab('crear-salida')">➕ Crear Salida</button>
            <button class="tab" onclick="openTab('gestion')">⚙️ Gestión</button>
            <?php endif; ?>
        </div>

        <!-- Calendario de salidas -->
        <div id="calendario" class="tab-content active">
            <h2>📅 Próximas Salidas</h2>
            
            <?php if (empty($salidas)): ?>
                <div class="card">
                    <p>No hay salidas programadas.</p>
                </div>
            <?php else: ?>
                <div class="grid-2">
                    <?php foreach ($salidas as $salida): 
                        $fecha_limite_pasada = time() > strtotime($salida['fecha_limite_inscripcion']);
                        $porcentaje = $salida['cupo_maximo'] > 0 ? ($salida['inscritos_count'] / $salida['cupo_maximo']) * 100 : 0;
                    ?>
                    <div class="salida-card <?php echo $salida['nivel_dificultad']; ?>">
                        <h3 style="margin: 0 0 10px 0;">
                            <a href="salidas.php?id=<?php echo $salida['id']; ?>" style="color: inherit; text-decoration: none;">
                                <?php echo htmlspecialchars($salida['nombre']); ?>
                            </a>
                        </h3>
                        
                        <div style="display: flex; gap: 10px; margin-bottom: 10px; flex-wrap: wrap;">
                            <span class="badge badge-<?php echo $salida['nivel_dificultad']; ?>">
                                <?php echo $niveles_dificultad[$salida['nivel_dificultad']] ?? $salida['nivel_dificultad']; ?>
                            </span>
                            <span style="background: #e9ecef; padding: 2px 8px; border-radius: 10px; font-size: 12px;">
                                📅 <?php echo date('d/m/Y', strtotime($salida['fecha_salida'])); ?>
                            </span>
                        </div>
                        
                        <p style="margin: 0 0 10px 0; color: #666;">
                            📍 <?php echo htmlspecialchars($salida['lugar']); ?>
                        </p>
                        
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: <?php echo $porcentaje; ?>%"></div>
                        </div>
                        <div style="font-size: 12px; color: #666;">
                            👥 <?php echo $salida['inscritos_count']; ?>/<?php echo $salida['cupo_maximo']; ?> • 
                            📝 <?php echo $salida['estoy_inscrito'] ? 'Inscrito' : 'Disponible'; ?>
                        </div>
                        
                        <div style="margin-top: 15px; display: flex; gap: 10px;">
                            <a href="salidas.php?id=<?php echo $salida['id']; ?>" class="btn btn-info">👀 Ver Detalles</a>
                            
                            <?php if (!$salida['estoy_inscrito'] && !$fecha_limite_pasada && $salida['inscritos_count'] < $salida['cupo_maximo']): ?>
                                <form method="POST" style="display: inline;">
                                    <input type="hidden" name="salida_id" value="<?php echo $salida['id']; ?>">
                                    <button type="submit" name="inscribirse" class="btn btn-success">✅ Inscribirse</button>
                                </form>
                            <?php elseif ($salida['estoy_inscrito']): ?>
                                <span style="color: #28a745; font-weight: bold;">✅ Inscrito</span>
                            <?php endif; ?>
                        </div>
                    </div>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        </div>

        <!-- Mis salidas -->
        <div id="mis-salidas" class="tab-content">
            <h2>🥾 Mis Salidas Inscritas</h2>
            
            <?php if (empty($mis_inscripciones)): ?>
                <div class="card">
                    <p>No estás inscrito en ninguna salida.</p>
                    <p>¡Explora el calendario y únete a nuestras próximas aventuras! 🏔️</p>
                </div>
            <?php else: ?>
                <table>
                    <thead>
                        <tr>
                            <th>Salida</th>
                            <th>Fecha</th>
                            <th>Lugar</th>
                            <th>Dificultad</th>
                            <th>Fecha Inscripción</th>
                            <th>Asistencia</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($mis_inscripciones as $salida): ?>
                        <tr>
                            <td>
                                <strong><?php echo htmlspecialchars($salida['nombre']); ?></strong>
                                <?php if (!empty($salida['descripcion'])): ?>
                                <br><small><?php echo htmlspecialchars(substr($salida['descripcion'], 0, 50)); ?>...</small>
                                <?php endif; ?>
                            </td>
                            <td><?php echo date('d/m/Y H:i', strtotime($salida['fecha_salida'])); ?></td>
                            <td><?php echo htmlspecialchars($salida['lugar']); ?></td>
                            <td>
                                <span class="badge badge-<?php echo $salida['nivel_dificultad']; ?>">
                                    <?php echo $niveles_dificultad[$salida['nivel_dificultad']] ?? $salida['nivel_dificultad']; ?>
                                </span>
                            </td>
                            <td><?php echo date('d/m/Y H:i', strtotime($salida['fecha_inscripcion'])); ?></td>
                            <td>
                                <?php if ($salida['asistio']): ?>
                                    <span style="color: #28a745;">✅ Asistió</span>
                                <?php else: ?>
                                    <span style="color: #6c757d;">⏳ Pendiente</span>
                                <?php endif; ?>
                            </td>
                            <td>
                                <a href="salidas.php?id=<?php echo $salida['id']; ?>" class="btn btn-info btn-sm">👀 Ver</a>
                                <?php if (time() < strtotime($salida['fecha_limite_inscripcion'])): ?>
                                <form method="POST" style="display: inline;">
                                    <input type="hidden" name="salida_id" value="<?php echo $salida['id']; ?>">
                                    <button type="submit" name="cancelar_inscripcion" class="btn btn-danger btn-sm">❌ Cancelar</button>
                                </form>
                                <?php endif; ?>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>

        <!-- Crear salida (solo para roles autorizados) -->
        <?php if ($_SESSION['usuario_rol'] === 'admin' || $_SESSION['usuario_rol'] === 'comision_tecnica' || $_SESSION['usuario_rol'] === 'presidente'): ?>
        <div id="crear-salida" class="tab-content">
            <h2>➕ Crear Nueva Salida</h2>
            <div class="card">
                <form method="POST">
                    <div class="grid-2">
                        <div class="form-group">
                            <label for="nombre">Nombre de la Salida *</label>
                            <input type="text" id="nombre" name="nombre" required placeholder="Ej: Ascenso al Cerro Negro">
                        </div>
                        <div class="form-group">
                            <label for="lugar">Lugar *</label>
                            <input type="text" id="lugar" name="lugar" required placeholder="Ej: Cerro Negro, Cordillera de los Andes">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="descripcion">Descripción</label>
                        <textarea id="descripcion" name="descripcion" rows="3" placeholder="Detalles de la salida, objetivos, puntos de interés..."></textarea>
                    </div>
                    
                    <div class="grid-2">
                        <div class="form-group">
                            <label for="fecha_salida">Fecha y Hora de Salida *</label>
                            <input type="datetime-local" id="fecha_salida" name="fecha_salida" required>
                        </div>
                        <div class="form-group">
                            <label for="fecha_limite_inscripcion">Fecha Límite de Inscripción *</label>
                            <input type="datetime-local" id="fecha_limite_inscripcion" name="fecha_limite_inscripcion" required>
                        </div>
                    </div>
                    
                    <div class="grid-2">
                        <div class="form-group">
                            <label for="nivel_dificultad">Nivel de Dificultad *</label>
                            <select id="nivel_dificultad" name="nivel_dificultad" required>
                                <?php foreach ($niveles_dificultad as $valor => $etiqueta): ?>
                                <option value="<?php echo $valor; ?>"><?php echo $etiqueta; ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="cupo_maximo">Cupo Máximo *</label>
                            <input type="number" id="cupo_maximo" name="cupo_maximo" min="1" max="100" value="20" required>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="equipo_requerido">Equipo Requerido</label>
                        <textarea id="equipo_requerido" name="equipo_requerido" rows="3" placeholder="Equipo personal obligatorio, equipo técnico requerido..."></textarea>
                    </div>
                    
                    <button type="submit" name="crear_salida" class="btn btn-success">🏔️ Crear Salida</button>
                </form>
            </div>
        </div>

        <!-- Gestión de salidas -->
        <div id="gestion" class="tab-content">
            <h2>⚙️ Gestión de Salidas</h2>
            
            <?php
            // Obtener todas las inscripciones para gestión
            $inscripciones_gestion = [];
            if ($_SESSION['usuario_rol'] === 'admin') {
                $stmt = $db->query("
                    SELECT i.*, s.nombre as salida_nombre, s.fecha_salida,
                           u.nombres, u.apellidos, u.email
                    FROM inscripciones_salidas i
                    JOIN salidas s ON i.salida_id = s.id
                    JOIN usuarios u ON i.usuario_id = u.id
                    ORDER BY s.fecha_salida DESC, i.fecha_inscripcion DESC
                ");
                $inscripciones_gestion = $stmt->fetchAll(PDO::FETCH_ASSOC);
            }
            ?>
            
            <div class="card">
                <h3>📊 Estadísticas</h3>
                <?php
                $total_salidas = count($salidas);
                $salidas_pasadas = array_filter($salidas, function($s) {
                    return strtotime($s['fecha_salida']) < time();
                });
                $salidas_futuras = array_filter($salidas, function($s) {
                    return strtotime($s['fecha_salida']) >= time();
                });
                ?>
                <div class="grid-3">
                    <div style="text-align: center; padding: 15px; background: #e7f3ff; border-radius: 8px;">
                        <div style="font-size: 24px; font-weight: bold;"><?php echo $total_salidas; ?></div>
                        <div>Total Salidas</div>
                    </div>
                    <div style="text-align: center; padding: 15px; background: #fff3cd; border-radius: 8px;">
                        <div style="font-size: 24px; font-weight: bold;"><?php echo count($salidas_futuras); ?></div>
                        <div>Próximas Salidas</div>
                    </div>
                    <div style="text-align: center; padding: 15px; background: #d4edda; border-radius: 8px;">
                        <div style="font-size: 24px; font-weight: bold;"><?php echo count($salidas_pasadas); ?></div>
                        <div>Salidas Realizadas</div>
                    </div>
                </div>
            </div>
            
            <?php if ($_SESSION['usuario_rol'] === 'admin' && !empty($inscripciones_gestion)): ?>
            <div class="card">
                <h3>👥 Todas las Inscripciones</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Usuario</th>
                            <th>Salida</th>
                            <th>Fecha Salida</th>
                            <th>Fecha Inscripción</th>
                            <th>Asistió</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($inscripciones_gestion as $inscripcion): ?>
                        <tr>
                            <td><?php echo htmlspecialchars($inscripcion['nombres'] . ' ' . $inscripcion['apellidos']); ?></td>
                            <td><?php echo htmlspecialchars($inscripcion['salida_nombre']); ?></td>
                            <td><?php echo date('d/m/Y', strtotime($inscripcion['fecha_salida'])); ?></td>
                            <td><?php echo date('d/m/Y H:i', strtotime($inscripcion['fecha_inscripcion'])); ?></td>
                            <td>
                                <?php if ($inscripcion['asistio']): ?>
                                    <span style="color: #28a745;">✅</span>
                                <?php else: ?>
                                    <span style="color: #6c757d;">⏳</span>
                                <?php endif; ?>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
            <?php endif; ?>
        </div>
        <?php endif; ?>
        <?php endif; ?>
    </div>

    <script>
        function openTab(tabName) {
            // Ocultar todos los contenidos
            const tabContents = document.getElementsByClassName('tab-content');
            for (let i = 0; i < tabContents.length; i++) {
                tabContents[i].classList.remove('active');
            }
            
            // Desactivar todas las pestañas
            const tabs = document.getElementsByClassName('tab');
            for (let i = 0; i < tabs.length; i++) {
                tabs[i].classList.remove('active');
            }
            
            // Activar la pestaña seleccionada
            document.getElementById(tabName).classList.add('active');
            event.currentTarget.classList.add('active');
        }
        
        // Configurar fechas por defecto
        document.addEventListener('DOMContentLoaded', function() {
            const ahora = new Date();
            const mañana = new Date(ahora);
            mañana.setDate(mañana.getDate() + 1);
            
            // Formatear para input datetime-local
            const formatDate = (date) => {
                return date.toISOString().slice(0, 16);
            };
            
            // Establecer fechas por defecto en el formulario de creación
            const fechaSalida = document.getElementById('fecha_salida');
            const fechaLimite = document.getElementById('fecha_limite_inscripcion');
            
            if (fechaSalida) {
                fechaSalida.min = formatDate(ahora);
                fechaSalida.value = formatDate(mañana);
            }
            
            if (fechaLimite) {
                fechaLimite.min = formatDate(ahora);
                fechaLimite.value = formatDate(ahora);
            }
        });
    </script>
</body>
</html>
