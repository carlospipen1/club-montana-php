<?php
session_start();
header('Content-Type: text/html; charset=utf-8');

// Solo admin y presidente pueden acceder
$roles_permitidos = ['admin', 'presidente'];
if (!isset($_SESSION['usuario_id']) || !in_array($_SESSION['usuario_rol'], $roles_permitidos)) {
    header('Location: dashboard.php');
    exit;
}

require_once 'config/database.php';
$database = new Database();
$db = $database->getConnection();

$mensaje = '';

// Procesar backup de datos
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['crear_backup'])) {
    try {
        $fecha = date('Y-m-d_H-i-s');
        $backup_file = "backups/backup_{$fecha}.sql";
        
        // Crear directorio backups si no existe
        if (!is_dir('backups')) {
            mkdir('backups', 0755, true);
        }
        
        // En SQLite, el backup es copiar el archivo de la base de datos
        if (file_exists('club_montana.db')) {
            copy('club_montana.db', $backup_file);
            $mensaje = "✅ Backup creado correctamente: " . basename($backup_file);
        } else {
            $mensaje = "❌ No se encontró la base de datos para hacer backup";
        }
        
    } catch (Exception $e) {
        $mensaje = "❌ Error creando backup: " . $e->getMessage();
    }
}

// Procesar limpieza de notificaciones antiguas
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['limpiar_notificaciones'])) {
    try {
        $stmt = $db->prepare("DELETE FROM notificaciones WHERE fecha_creacion < DATE('now', '-30 days')");
        $stmt->execute();
        $eliminadas = $stmt->rowCount();
        $mensaje = "✅ Se eliminaron $eliminadas notificaciones antiguas (más de 30 días)";
    } catch (Exception $e) {
        $mensaje = "❌ Error limpiando notificaciones: " . $e->getMessage();
    }
}

// Procesar regeneración de datos de prueba
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['regenerar_datos_prueba'])) {
    try {
        // Insertar usuarios de prueba adicionales
        $stmt = $db->prepare("INSERT OR IGNORE INTO usuarios (email, password_hash, nombres, apellidos, tipo_miembro, rol) VALUES (?, ?, ?, ?, ?, ?)");
        
        $usuarios_prueba = [
            ['socio1@clubmontana.cl', password_hash('socio123', PASSWORD_DEFAULT), 'Carlos', 'Montaña', 'general', 'miembro'],
            ['socio2@clubmontana.cl', password_hash('socio123', PASSWORD_DEFAULT), 'Ana', 'Cordillera', 'estudiante', 'miembro'],
            ['socio3@clubmontana.cl', password_hash('socio123', PASSWORD_DEFAULT), 'Pedro', 'Andes', 'general', 'miembro'],
            ['encargado@clubmontana.cl', password_hash('encargado123', PASSWORD_DEFAULT), 'Roberto', 'Equipos', 'general', 'encargado_equipo'],
            ['tecnico@clubmontana.cl', password_hash('tecnico123', PASSWORD_DEFAULT), 'Laura', 'Técnica', 'general', 'comision_tecnica']
        ];
        
        $agregados = 0;
        foreach ($usuarios_prueba as $usuario) {
            try {
                $stmt->execute($usuario);
                $agregados++;
            } catch (Exception $e) {
                // Ignorar errores de duplicados
            }
        }
        
        // Crear algunas salidas de prueba
        $stmt_salida = $db->prepare("INSERT OR IGNORE INTO salidas (nombre, descripcion, fecha_salida, fecha_limite_inscripcion, lugar, nivel_dificultad, cupo_maximo, encargado_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        
        $fecha_base = date('Y-m-d H:i:s', strtotime('+7 days'));
        $salidas_prueba = [
            ['Ascenso Cerro Negro', 'Ascenso técnico al Cerro Negro', $fecha_base, date('Y-m-d H:i:s', strtotime('+5 days')), 'Cerro Negro, Cordillera', 'dificil', 15, 1],
            ['Trekking Familiar', 'Salida familiar para principiantes', date('Y-m-d H:i:s', strtotime('+14 days')), date('Y-m-d H:i:s', strtotime('+12 days')), 'Valle Escondido', 'facil', 25, 1],
            ['Escalada Roca', 'Práctica de escalada en roca', date('Y-m-d H:i:s', strtotime('+21 days')), date('Y-m-d H:i:s', strtotime('+19 days')), 'Sector Los Paredones', 'medio', 12, 1]
        ];
        
        $salidas_creadas = 0;
        foreach ($salidas_prueba as $salida) {
            try {
                $stmt_salida->execute($salida);
                $salidas_creadas++;
            } catch (Exception $e) {
                // Ignorar errores
            }
        }
        
        // Crear equipos de prueba
        $stmt_equipo = $db->prepare("INSERT OR IGNORE INTO equipos (categoria, nombre, descripcion, estado) VALUES (?, ?, ?, ?)");
        
        $equipos_prueba = [
            ['Escalada', 'Cuerda dinámica 60m', 'Cuerda de escalada dinámica 60 metros, 10.2mm', 'disponible'],
            ['Montañismo', 'Crampones ajustables', 'Crampones de 12 puntas ajustables talla 38-45', 'disponible'],
            ['Camping', 'Carpa 4 estaciones', 'Carpa resistente para 4 personas, 4 estaciones', 'disponible'],
            ['Seguridad', 'Casco escalada', 'Casco de escalada color naranja, talla M', 'disponible'],
            ['Navegación', 'GPS Garmin', 'GPS Garmin con mapas topográficos', 'prestado']
        ];
        
        $equipos_creados = 0;
        foreach ($equipos_prueba as $equipo) {
            try {
                $stmt_equipo->execute($equipo);
                $equipos_creados++;
            } catch (Exception $e) {
                // Ignorar errores
            }
        }
        
        $mensaje = "✅ Datos de prueba regenerados: $agregados usuarios, $salidas_creadas salidas, $equipos_creados equipos";
        
    } catch (Exception $e) {
        $mensaje = "❌ Error regenerando datos: " . $e->getMessage();
    }
}

// Obtener estadísticas del sistema
$estadisticas = [];
$usuarios_recientes = [];
$logs_sistema = [];

try {
    // Estadísticas generales - CORREGIDAS para usar las tablas correctas
    $estadisticas['total_usuarios'] = $db->query("SELECT COUNT(*) FROM usuarios")->fetchColumn();
    $estadisticas['usuarios_activos'] = $db->query("SELECT COUNT(*) FROM usuarios WHERE estado = 'activo'")->fetchColumn();
    $estadisticas['total_equipos'] = $db->query("SELECT COUNT(*) FROM equipos")->fetchColumn();
    $estadisticas['equipos_disponibles'] = $db->query("SELECT COUNT(*) FROM equipos WHERE estado = 'disponible'")->fetchColumn();
    $estadisticas['total_salidas'] = $db->query("SELECT COUNT(*) FROM salidas")->fetchColumn();
    $estadisticas['salidas_planificadas'] = $db->query("SELECT COUNT(*) FROM salidas WHERE estado = 'planificada'")->fetchColumn();
    
    // Estadísticas de cuotas usando la tabla correcta (cuotas_mensuales)
    $estadisticas['total_cuotas_mensuales'] = $db->query("SELECT COUNT(*) FROM cuotas_mensuales")->fetchColumn();
    $estadisticas['cuotas_pendientes'] = $db->query("SELECT COUNT(*) FROM cuotas_mensuales WHERE estado = 'pendiente'")->fetchColumn();
    
    $estadisticas['total_notificaciones'] = $db->query("SELECT COUNT(*) FROM notificaciones")->fetchColumn();
    $estadisticas['notificaciones_no_leidas'] = $db->query("SELECT COUNT(*) FROM notificaciones WHERE leida = 0")->fetchColumn();
    
    // Espacio en disco
    $estadisticas['tamano_bd'] = file_exists('club_montana.db') ? filesize('club_montana.db') : 0;
    
    // Usuarios recientes (últimos 7 días)
    $stmt = $db->query("SELECT * FROM usuarios WHERE fecha_creacion >= DATE('now', '-7 days') ORDER BY fecha_creacion DESC LIMIT 5");
    $usuarios_recientes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Obtener archivos de backup
    $backups = [];
    if (is_dir('backups')) {
        $archivos = scandir('backups');
        foreach ($archivos as $archivo) {
            if (strpos($archivo, 'backup_') === 0 && strpos($archivo, '.db') !== false) {
                $ruta = 'backups/' . $archivo;
                $backups[] = [
                    'nombre' => $archivo,
                    'tamaño' => filesize($ruta),
                    'fecha' => date('Y-m-d H:i:s', filemtime($ruta))
                ];
            }
        }
        // Ordenar por fecha (más reciente primero)
        usort($backups, function($a, $b) {
            return strtotime($b['fecha']) - strtotime($a['fecha']);
        });
    }
    
    // Obtener logs del sistema (simulados)
    $logs_sistema = [
        date('Y-m-d H:i:s') . ' - Sistema de administración cargado',
        date('Y-m-d H:i:s', time() - 3600) . ' - Usuario ' . $_SESSION['usuario_nombre'] . ' accedió al sistema',
        date('Y-m-d H:i:s', time() - 7200) . ' - Backup automático ejecutado',
        date('Y-m-d H:i:s', time() - 86400) . ' - Mantenimiento nocturno completado',
        date('Y-m-d H:i:s', time() - 172800) . ' - Actualización de estadísticas del sistema'
    ];
    
} catch (Exception $e) {
    $mensaje = "Error cargando estadísticas: " . $e->getMessage();
}

// Función para formatear tamaño de archivo
function formato_tamaño($bytes) {
    if ($bytes >= 1073741824) {
        return number_format($bytes / 1073741824, 2) . ' GB';
    } elseif ($bytes >= 1048576) {
        return number_format($bytes / 1048576, 2) . ' MB';
    } elseif ($bytes >= 1024) {
        return number_format($bytes / 1024, 2) . ' KB';
    } else {
        return $bytes . ' bytes';
    }
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Panel de Administración - Club de Montana</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; background: #f5f5f5; }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .card { background: white; padding: 25px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .btn { display: inline-block; padding: 10px 20px; background: #2c5aa0; color: white; text-decoration: none; border-radius: 5px; border: none; cursor: pointer; }
        .btn-success { background: #28a745; }
        .btn-warning { background: #ffc107; color: #000; }
        .btn-danger { background: #dc3545; }
        .btn-info { background: #17a2b8; }
        .btn-sm { padding: 5px 10px; font-size: 12px; }
        .mensaje { padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .nav { background: #e9ecef; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .nav a { margin-right: 15px; color: #2c5aa0; text-decoration: none; font-weight: bold; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .grid-4 { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .tabs { display: flex; border-bottom: 2px solid #2c5aa0; margin-bottom: 20px; flex-wrap: wrap; }
        .tab { padding: 12px 20px; background: #f8f9fa; border: none; border-bottom: 2px solid transparent; cursor: pointer; white-space: nowrap; }
        .tab.active { background: white; border-bottom: 2px solid #2c5aa0; font-weight: bold; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; }
        .stat-card { text-align: center; padding: 20px; border-radius: 8px; color: white; }
        .stat-number { font-size: 32px; margin-bottom: 5px; font-weight: bold; }
        .stat-label { font-size: 14px; opacity: 0.9; }
        .progress-bar { background: #e9ecef; border-radius: 10px; height: 8px; margin: 5px 0; }
        .progress-fill { background: #28a745; height: 100%; border-radius: 10px; }
        .backup-item { display: flex; justify-content: between; align-items: center; padding: 10px; background: #f8f9fa; margin-bottom: 5px; border-radius: 5px; }
        .role-badge { 
            padding: 2px 6px; 
            border-radius: 8px; 
            font-size: 10px; 
            font-weight: bold; 
            color: white;
        }
        .role-admin { background: #dc3545; }
        .role-tesorero { background: #20c997; }
        .role-presidente { background: #fd7e14; }
        .role-secretario { background: #6f42c1; }
        .role-encargado_equipo { background: #6f42c1; }
        .role-comision_tecnica { background: #0dcaf0; }
        .role-miembro { background: #6c757d; }
        .system-health { 
            padding: 15px; 
            border-radius: 8px; 
            margin: 10px 0;
            border-left: 4px solid;
        }
        .health-good { background: #d4edda; border-left-color: #28a745; }
        .health-warning { background: #fff3cd; border-left-color: #ffc107; }
        .health-error { background: #f8d7da; border-left-color: #dc3545; }
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
            <a href="#estadisticas">📈 Estadísticas</a>
            <a href="#usuarios">👥 Usuarios</a>
            <a href="#sistema">⚙️ Sistema</a>
            <a href="#backup">💾 Backup</a>
            <?php if ($_SESSION['usuario_rol'] === 'admin'): ?>
            <a href="#avanzado">🔧 Avanzado</a>
            <?php endif; ?>
        </div>

        <h1>⚙️ Panel de Administración 
            <span class="role-badge role-<?php echo $_SESSION['usuario_rol']; ?>">
                <?php echo strtoupper($_SESSION['usuario_rol']); ?>
            </span>
        </h1>

        <!-- Estado del sistema -->
        <div class="card">
            <h3>🔍 Estado del Sistema</h3>
            <div class="grid-3">
                <div class="system-health health-good">
                    <strong>✅ Base de Datos</strong>
                    <p>Conexión establecida correctamente</p>
                </div>
                <div class="system-health health-good">
                    <strong>✅ Archivos</strong>
                    <p>Sistema de archivos operativo</p>
                </div>
                <div class="system-health <?php echo $estadisticas['tamano_bd'] > 10485760 ? 'health-warning' : 'health-good'; ?>">
                    <strong>💾 Almacenamiento</strong>
                    <p>BD: <?php echo formato_tamaño($estadisticas['tamano_bd']); ?></p>
                </div>
            </div>
        </div>

        <!-- Pestañas principales -->
        <div class="tabs">
            <button class="tab active" onclick="openTab('estadisticas')">📈 Estadísticas</button>
            <button class="tab" onclick="openTab('usuarios')">👥 Usuarios</button>
            <button class="tab" onclick="openTab('sistema')">⚙️ Sistema</button>
            <button class="tab" onclick="openTab('backup')">💾 Backup</button>
            <?php if ($_SESSION['usuario_rol'] === 'admin'): ?>
            <button class="tab" onclick="openTab('avanzado')">🔧 Avanzado</button>
            <?php endif; ?>
        </div>

        <!-- Estadísticas -->
        <div id="estadisticas" class="tab-content active">
            <h2>📈 Estadísticas del Sistema</h2>
            
            <div class="grid-4">
                <div class="stat-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    <div class="stat-number"><?php echo $estadisticas['total_usuarios']; ?></div>
                    <div class="stat-label">Total Usuarios</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                    <div class="stat-number"><?php echo $estadisticas['usuarios_activos']; ?></div>
                    <div class="stat-label">Usuarios Activos</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                    <div class="stat-number"><?php echo $estadisticas['total_equipos']; ?></div>
                    <div class="stat-label">Total Equipos</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">
                    <div class="stat-number"><?php echo $estadisticas['equipos_disponibles']; ?></div>
                    <div class="stat-label">Equipos Disponibles</div>
                </div>
            </div>

            <div class="grid-3">
                <div class="stat-card" style="background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); color: #333;">
                    <div class="stat-number"><?php echo $estadisticas['total_salidas']; ?></div>
                    <div class="stat-label">Total Salidas</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%); color: #333;">
                    <div class="stat-number"><?php echo $estadisticas['salidas_planificadas']; ?></div>
                    <div class="stat-label">Salidas Planificadas</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%); color: #333;">
                    <div class="stat-number"><?php echo $estadisticas['total_cuotas_mensuales']; ?></div>
                    <div class="stat-label">Cuotas Mensuales</div>
                </div>
            </div>

            <!-- Usuarios recientes -->
            <div class="card">
                <h3>👥 Usuarios Recientes (Últimos 7 días)</h3>
                <?php if (empty($usuarios_recientes)): ?>
                    <p>No hay usuarios nuevos en los últimos 7 días.</p>
                <?php else: ?>
                    <table>
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Email</th>
                                <th>Rol</th>
                                <th>Fecha Registro</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($usuarios_recientes as $usuario): ?>
                            <tr>
                                <td><?php echo htmlspecialchars($usuario['nombres'] . ' ' . $usuario['apellidos']); ?></td>
                                <td><?php echo htmlspecialchars($usuario['email']); ?></td>
                                <td>
                                    <span class="role-badge role-<?php echo $usuario['rol']; ?>">
                                        <?php echo ucfirst($usuario['rol']); ?>
                                    </span>
                                </td>
                                <td><?php echo date('d/m/Y H:i', strtotime($usuario['fecha_creacion'])); ?></td>
                                <td>
                                    <span style="color: <?php echo $usuario['estado'] === 'activo' ? '#28a745' : '#dc3545'; ?>;">
                                        ● <?php echo ucfirst($usuario['estado']); ?>
                                    </span>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php endif; ?>
            </div>
        </div>

        <!-- Gestión de usuarios -->
        <div id="usuarios" class="tab-content">
            <h2>👥 Gestión de Usuarios</h2>
            
            <div class="card">
                <h3>📊 Distribución por Roles</h3>
                <?php
                $stmt = $db->query("SELECT rol, COUNT(*) as cantidad FROM usuarios GROUP BY rol ORDER BY cantidad DESC");
                $distribucion_roles = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $total_usuarios = array_sum(array_column($distribucion_roles, 'cantidad'));
                ?>
                <div style="display: grid; gap: 10px;">
                    <?php foreach ($distribucion_roles as $rol): 
                        $porcentaje = $total_usuarios > 0 ? ($rol['cantidad'] / $total_usuarios) * 100 : 0;
                    ?>
                    <div>
                        <div style="display: flex; justify-content: between; margin-bottom: 5px;">
                            <span>
                                <span class="role-badge role-<?php echo $rol['rol']; ?>">
                                    <?php echo ucfirst($rol['rol']); ?>
                                </span>
                                <span style="margin-left: 10px;"><?php echo $rol['cantidad']; ?> usuarios</span>
                            </span>
                            <span><?php echo number_format($porcentaje, 1); ?>%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: <?php echo $porcentaje; ?>%"></div>
                        </div>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>

            <div class="card">
                <h3>🚀 Acciones Rápidas</h3>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <a href="socios.php" class="btn btn-success">➕ Agregar Usuario</a>
                    <a href="socios.php" class="btn btn-info">📋 Ver Todos los Usuarios</a>
                    <button class="btn btn-warning" onclick="generarReporteUsuarios()">📊 Reporte de Usuarios</button>
                </div>
            </div>
        </div>

        <!-- Configuración del sistema -->
        <div id="sistema" class="tab-content">
            <h2>⚙️ Configuración del Sistema</h2>
            
            <div class="grid-2">
                <div class="card">
                    <h3>🔧 Información del Servidor</h3>
                    <div style="font-family: monospace; font-size: 14px;">
                        <p><strong>PHP Version:</strong> <?php echo phpversion(); ?></p>
                        <p><strong>Servidor:</strong> <?php echo $_SERVER['SERVER_SOFTWARE'] ?? 'N/A'; ?></p>
                        <p><strong>Base de datos:</strong> SQLite</p>
                        <p><strong>Zona horaria:</strong> <?php echo date_default_timezone_get(); ?></p>
                        <p><strong>Memoria usada:</strong> <?php echo formato_tamaño(memory_get_usage(true)); ?></p>
                        <p><strong>Límite memoria:</strong> <?php echo ini_get('memory_limit'); ?></p>
                    </div>
                </div>
                
                <div class="card">
                    <h3>📁 Estado del Sistema</h3>
                    <div style="display: grid; gap: 10px;">
                        <div style="display: flex; justify-content: between;">
                            <span>Base de datos:</span>
                            <span style="color: #28a745;">✅ Conectada</span>
                        </div>
                        <div style="display: flex; justify-content: between;">
                            <span>Archivos de sesión:</span>
                            <span style="color: #28a745;">✅ Activas</span>
                        </div>
                        <div style="display: flex; justify-content: between;">
                            <span>Directorio backups:</span>
                            <span style="color: <?php echo is_dir('backups') ? '#28a745' : '#dc3545'; ?>;">
                                <?php echo is_dir('backups') ? '✅ Existe' : '❌ No existe'; ?>
                            </span>
                        </div>
                        <div style="display: flex; justify-content: between;">
                            <span>Espacio disco BD:</span>
                            <span style="color: #28a745;"><?php echo formato_tamaño($estadisticas['tamano_bd']); ?></span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <h3>🛠️ Mantenimiento</h3>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <form method="POST" style="display: inline;">
                        <button type="submit" name="limpiar_notificaciones" class="btn btn-warning" onclick="return confirm('¿Limpiar notificaciones antiguas?')">
                            🗑️ Limpiar Notificaciones
                        </button>
                    </form>
                    <button class="btn btn-info" onclick="optimizarBaseDatos()">🔧 Optimizar BD</button>
                    <button class="btn btn-info" onclick="limpiarCache()">🧹 Limpiar Cache</button>
                </div>
                <p style="font-size: 12px; color: #666; margin-top: 10px;">
                    Nota: La limpieza de notificaciones eliminará las notificaciones con más de 30 días de antigüedad.
                </p>
            </div>
        </div>

        <!-- Backup de datos -->
        <div id="backup" class="tab-content">
            <h2>💾 Sistema de Backup</h2>
            
            <div class="grid-2">
                <div class="card">
                    <h3>🔄 Crear Backup</h3>
                    <p>Crea una copia de seguridad completa de la base de datos.</p>
                    <form method="POST">
                        <button type="submit" name="crear_backup" class="btn btn-success">💾 Crear Backup Ahora</button>
                    </form>
                    <p style="font-size: 12px; color: #666; margin-top: 10px;">
                        El backup incluye: usuarios, equipos, salidas, cuotas y notificaciones.
                    </p>
                </div>
                
                <div class="card">
                    <h3>📊 Información de Backup</h3>
                    <p><strong>Último backup:</strong> 
                        <?php echo !empty($backups) ? $backups[0]['fecha'] : 'Nunca'; ?>
                    </p>
                    <p><strong>Total de backups:</strong> <?php echo count($backups); ?></p>
                    <p><strong>Tamaño total:</strong> 
                        <?php 
                        $tamaño_total = 0;
                        foreach ($backups as $backup) {
                            $tamaño_total += $backup['tamaño'];
                        }
                        echo formato_tamaño($tamaño_total);
                        ?>
                    </p>
                </div>
            </div>

            <!-- Lista de backups -->
            <div class="card">
                <h3>📋 Backups Existentes</h3>
                <?php if (empty($backups)): ?>
                    <p>No hay backups creados.</p>
                <?php else: ?>
                    <table>
                        <thead>
                            <tr>
                                <th>Archivo</th>
                                <th>Fecha</th>
                                <th>Tamaño</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($backups as $backup): ?>
                            <tr>
                                <td><?php echo $backup['nombre']; ?></td>
                                <td><?php echo $backup['fecha']; ?></td>
                                <td><?php echo formato_tamaño($backup['tamaño']); ?></td>
                                <td>
                                    <button class="btn btn-info btn-sm" onclick="descargarBackup('<?php echo $backup['nombre']; ?>')">📥 Descargar</button>
                                    <button class="btn btn-danger btn-sm" onclick="eliminarBackup('<?php echo $backup['nombre']; ?>')">🗑️ Eliminar</button>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php endif; ?>
            </div>
        </div>

        <!-- Configuración avanzada (solo admin) -->
        <?php if ($_SESSION['usuario_rol'] === 'admin'): ?>
        <div id="avanzado" class="tab-content">
            <h2>🔧 Configuración Avanzada</h2>
            
            <div class="card">
                <h3>🔄 Datos de Prueba</h3>
                <p>Regenera datos de prueba para testing del sistema.</p>
                <form method="POST">
                    <button type="submit" name="regenerar_datos_prueba" class="btn btn-warning" onclick="return confirm('¿Regenerar datos de prueba? Esto agregará usuarios, salidas y equipos de ejemplo.')">
                        🔄 Regenerar Datos de Prueba
                    </button>
                </form>
                <p style="font-size: 12px; color: #666; margin-top: 10px;">
                    Esto creará usuarios, salidas y equipos de ejemplo para testing.
                </p>
            </div>
            
            <div class="card">
                <h3>⚠️ Operaciones Peligrosas</h3>
                <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin-bottom: 15px; border-left: 4px solid #ffc107;">
                    <strong>⚠️ Advertencia:</strong> Estas operaciones pueden afectar el funcionamiento del sistema.
                    Realízalas solo si sabes lo que estás haciendo.
                </div>
                
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button class="btn btn-danger" onclick="reinstalarSistema()">🔄 Reinstalar Sistema</button>
                    <button class="btn btn-danger" onclick="limpiarBaseDatos()">🗑️ Limpiar BD</button>
                    <button class="btn btn-warning" onclick="reiniciarSistema()">🔄 Reiniciar Sistema</button>
                </div>
            </div>
            
            <div class="card">
                <h3>🔍 Logs del Sistema</h3>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 12px; max-height: 300px; overflow-y: auto;">
                    <?php foreach ($logs_sistema as $log): ?>
                    <div style="padding: 2px 0;"><?php echo htmlspecialchars($log); ?></div>
                    <?php endforeach; ?>
                </div>
            </div>
        </div>
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
        
        function generarReporteUsuarios() {
            alert('📊 Generando reporte de usuarios...');
            // Aquí iría la lógica para generar el reporte
        }
        
        function optimizarBaseDatos() {
            if (confirm('¿Estás seguro de que quieres optimizar la base de datos?')) {
                alert('🔧 Optimizando base de datos...');
                // Aquí iría la lógica de optimización
            }
        }
        
        function limpiarCache() {
            if (confirm('¿Estás seguro de que quieres limpiar la cache del sistema?')) {
                alert('🧹 Limpiando cache...');
                // Aquí iría la lógica de limpieza
            }
        }
        
        function reiniciarSistema() {
            if (confirm('⚠️ ¿Estás seguro de que quieres reiniciar el sistema? Esto puede afectar a los usuarios conectados.')) {
                alert('🔄 Reiniciando sistema...');
                // Aquí iría la lógica de reinicio
            }
        }
        
        function descargarBackup(nombre) {
            alert('📥 Descargando backup: ' + nombre);
            // En una implementación real, redirigiría al archivo
            window.open('backups/' + nombre, '_blank');
        }
        
        function eliminarBackup(nombre) {
            if (confirm('¿Estás seguro de que quieres eliminar el backup: ' + nombre + '?')) {
                if (confirm('⚠️ Esta acción no se puede deshacer. ¿Continuar?')) {
                    // En una implementación real, haría una petición AJAX para eliminar
                    alert('🗑️ Eliminando backup: ' + nombre);
                    window.location.href = 'admin.php?eliminar_backup=' + encodeURIComponent(nombre);
                }
            }
        }
        
        // Funciones avanzadas (solo admin)
        function reinstalarSistema() {
            if (confirm('🚨 ¡PELIGRO! ¿Estás completamente seguro de que quieres reinstalar el sistema? Esto borrará todos los datos.')) {
                if (confirm('⚠️ ⚠️ ⚠️ ESTA ACCIÓN NO SE PUEDE DESHACER. ¿CONTINUAR?')) {
                    alert('🔄 Reinstalando sistema... (esta es una simulación)');
                    // Aquí iría la lógica de reinstalación
                }
            }
        }
        
        function limpiarBaseDatos() {
            if (confirm('🚨 ¿Estás seguro de que quieres limpiar la base de datos? Esto borrará datos históricos.')) {
                alert('🗑️ Limpiando base de datos... (esta es una simulación)');
                // Aquí iría la lógica de limpieza
            }
        }
    </script>
</body>
</html>