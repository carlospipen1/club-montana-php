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

// Obtener datos del usuario actual
$usuario_actual = [];
$mis_cuotas = [];
$mis_salidas = [];
$mis_prestamos = [];
$mis_notificaciones = [];

try {
    // Datos del usuario
    $stmt = $db->prepare("SELECT * FROM usuarios WHERE id = ?");
    $stmt->execute([$_SESSION['usuario_id']]);
    $usuario_actual = $stmt->fetch(PDO::FETCH_ASSOC);

    // Cuotas del usuario (último año)
    $año_actual = date('Y');
    $stmt = $db->prepare("
        SELECT cm.*, ca.año as año_cuota
        FROM cuotas_mensuales cm
        JOIN cuotas_anuales ca ON cm.año = ca.año
        WHERE cm.usuario_id = ? AND cm.año >= ?
        ORDER BY cm.año DESC, cm.mes DESC
    ");
    $stmt->execute([$_SESSION['usuario_id'], $año_actual - 1]);
    $mis_cuotas = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Salidas inscritas
    $stmt = $db->prepare("
        SELECT s.*, i.fecha_inscripcion, i.asistio
        FROM inscripciones_salidas i
        JOIN salidas s ON i.salida_id = s.id
        WHERE i.usuario_id = ?
        ORDER BY s.fecha_salida DESC
        LIMIT 10
    ");
    $stmt->execute([$_SESSION['usuario_id']]);
    $mis_salidas = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Préstamos de equipo
    $stmt = $db->prepare("
        SELECT p.*, e.nombre as equipo_nombre, e.categoria
        FROM prestamos_equipo p
        JOIN equipos e ON p.equipo_id = e.id
        WHERE p.usuario_id = ?
        ORDER BY p.fecha_solicitud DESC
        LIMIT 10
    ");
    $stmt->execute([$_SESSION['usuario_id']]);
    $mis_prestamos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Notificaciones recientes
    $stmt = $db->prepare("
        SELECT * FROM notificaciones 
        WHERE usuario_id = ? 
        ORDER BY fecha_creacion DESC 
        LIMIT 10
    ");
    $stmt->execute([$_SESSION['usuario_id']]);
    $mis_notificaciones = $stmt->fetchAll(PDO::FETCH_ASSOC);

} catch (Exception $e) {
    $mensaje = "Error cargando datos: " . $e->getMessage();
}

// Nombres de meses
$meses_nombres = [
    1 => 'Enero', 2 => 'Febrero', 3 => 'Marzo', 4 => 'Abril',
    5 => 'Mayo', 6 => 'Junio', 7 => 'Julio', 8 => 'Agosto',
    9 => 'Septiembre', 10 => 'Octubre', 11 => 'Noviembre', 12 => 'Diciembre'
];

// Función para formatear dinero
function formato_dinero($monto) {
    return '$' . number_format($monto, 0, ',', '.');
}

// Calcular estadísticas personales
$estadisticas_personales = [
    'total_cuotas' => count($mis_cuotas),
    'cuotas_pagadas' => count(array_filter($mis_cuotas, fn($c) => $c['estado'] === 'pagado')),
    'total_salidas' => count($mis_salidas),
    'salidas_asistidas' => count(array_filter($mis_salidas, fn($s) => $s['asistio'])),
    'total_prestamos' => count($mis_prestamos),
    'prestamos_activos' => count(array_filter($mis_prestamos, fn($p) => $p['estado'] === 'aprobado')),
    'notificaciones_pendientes' => count(array_filter($mis_notificaciones, fn($n) => !$n['leida']))
];
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mi Actividad - Club de Montana</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .card { background: white; padding: 25px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .btn { display: inline-block; padding: 8px 15px; background: #2c5aa0; color: white; text-decoration: none; border-radius: 5px; border: none; cursor: pointer; font-size: 12px; }
        .btn-success { background: #28a745; }
        .btn-warning { background: #ffc107; color: #000; }
        .btn-danger { background: #dc3545; }
        .btn-info { background: #17a2b8; }
        .btn-sm { padding: 5px 10px; font-size: 11px; }
        .mensaje { padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .nav { background: #e9ecef; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .nav a { margin-right: 15px; color: #2c5aa0; text-decoration: none; font-weight: bold; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
        .grid-4 { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .tabs { display: flex; border-bottom: 2px solid #2c5aa0; margin-bottom: 20px; flex-wrap: wrap; }
        .tab { padding: 12px 20px; background: #f8f9fa; border: none; border-bottom: 2px solid transparent; cursor: pointer; white-space: nowrap; }
        .tab.active { background: white; border-bottom: 2px solid #2c5aa0; font-weight: bold; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; }
        .estado-badge { padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; color: white; }
        .estado-pagado { background: #28a745; }
        .estado-parcial { background: #ffc107; color: #000; }
        .estado-pendiente { background: #dc3545; }
        .estado-aprobado { background: #28a745; }
        .estado-pendiente-prestamo { background: #ffc107; color: #000; }
        .estado-rechazado { background: #dc3545; }
        .estado-devuelto { background: #6c757d; }
        .stat-card { text-align: center; padding: 20px; border-radius: 8px; color: white; }
        .stat-number { font-size: 32px; margin-bottom: 5px; font-weight: bold; }
        .stat-label { font-size: 14px; opacity: 0.9; }
        .activity-item { 
            border-left: 4px solid #2c5aa0; 
            padding: 15px; 
            margin-bottom: 10px; 
            background: #f8f9fa; 
            border-radius: 5px;
        }
        .activity-item.cuota { border-left-color: #28a745; }
        .activity-item.salida { border-left-color: #007bff; }
        .activity-item.prestamo { border-left-color: #ffc107; }
        .activity-item.notificacion { border-left-color: #6c757d; }
        .progress-bar { background: #e9ecef; border-radius: 10px; height: 8px; margin: 5px 0; }
        .progress-fill { background: #28a745; height: 100%; border-radius: 10px; }
        .tipo-badge { 
            padding: 2px 6px; 
            border-radius: 8px; 
            font-size: 10px; 
            font-weight: bold; 
            color: white;
        }
        .tipo-general { background: #007bff; }
        .tipo-estudiante { background: #28a745; }
        .badge { padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; color: white; }
        .badge-facil { background: #28a745; }
        .badge-medio { background: #ffc107; color: #000; }
        .badge-dificil { background: #fd7e14; }
        .badge-experto { background: #dc3545; }
    </style>
</head>
<body>
    <?php include 'includes/header.php'; ?>

    <div class="container">
        <div class="nav">
            <a href="dashboard.php">📊 Dashboard</a>
            <a href="#resumen">📈 Resumen</a>
            <a href="#cuotas">💰 Mis Cuotas</a>
            <a href="#salidas">🏔️ Mis Salidas</a>
            <a href="#prestamos">🎒 Mis Préstamos</a>
            <a href="#notificaciones">🔔 Notificaciones</a>
        </div>

        <h1>📊 Mi Actividad - Club de Montana</h1>

        <!-- Resumen personal -->
        <div class="card" id="resumen">
            <h2>👤 Resumen de Mi Actividad</h2>
            
            <div class="grid-4">
                <div class="stat-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    <div class="stat-number"><?php echo $estadisticas_personales['total_cuotas']; ?></div>
                    <div class="stat-label">Cuotas Registradas</div>
                    <div style="font-size: 12px;">
                        <?php echo $estadisticas_personales['cuotas_pagadas']; ?> pagadas
                    </div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                    <div class="stat-number"><?php echo $estadisticas_personales['total_salidas']; ?></div>
                    <div class="stat-label">Salidas Inscritas</div>
                    <div style="font-size: 12px;">
                        <?php echo $estadisticas_personales['salidas_asistidas']; ?> asistidas
                    </div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                    <div class="stat-number"><?php echo $estadisticas_personales['total_prestamos']; ?></div>
                    <div class="stat-label">Préstamos Solicitados</div>
                    <div style="font-size: 12px;">
                        <?php echo $estadisticas_personales['prestamos_activos']; ?> activos
                    </div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">
                    <div class="stat-number"><?php echo $estadisticas_personales['notificaciones_pendientes']; ?></div>
                    <div class="stat-label">Notificaciones Pendientes</div>
                    <div style="font-size: 12px;">
                        de <?php echo count($mis_notificaciones); ?> total
                    </div>
                </div>
            </div>

            <!-- Información del usuario -->
            <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; margin-top: 20px;">
                <h3>👤 Mi Información</h3>
                <div class="grid-2">
                    <div>
                        <p><strong>Nombre:</strong> <?php echo htmlspecialchars($usuario_actual['nombres'] . ' ' . $usuario_actual['apellidos']); ?></p>
                        <p><strong>Email:</strong> <?php echo htmlspecialchars($usuario_actual['email']); ?></p>
                        <p><strong>RUT:</strong> <?php echo htmlspecialchars($usuario_actual['rut'] ?? 'No registrado'); ?></p>
                    </div>
                    <div>
                        <p><strong>Tipo de Miembro:</strong> 
                            <span class="tipo-badge tipo-<?php echo $usuario_actual['tipo_miembro']; ?>">
                                <?php echo $usuario_actual['tipo_miembro'] === 'estudiante' ? '📚 Estudiante' : '🎓 General'; ?>
                            </span>
                        </p>
                        <p><strong>Rol:</strong> <?php echo htmlspecialchars($usuario_actual['rol']); ?></p>
                        <p><strong>Estado:</strong> 
                            <span style="color: <?php echo $usuario_actual['estado'] === 'activo' ? 'green' : 'red'; ?>;">
                                ● <?php echo htmlspecialchars($usuario_actual['estado']); ?>
                            </span>
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Pestañas principales -->
        <div class="tabs">
            <button class="tab active" onclick="openTab('cuotas')">💰 Mis Cuotas</button>
            <button class="tab" onclick="openTab('salidas')">🏔️ Mis Salidas</button>
            <button class="tab" onclick="openTab('prestamos')">🎒 Mis Préstamos</button>
            <button class="tab" onclick="openTab('notificaciones')">🔔 Notificaciones</button>
        </div>

        <!-- Mis Cuotas -->
        <div id="cuotas" class="tab-content active">
            <h2>💰 Mis Cuotas</h2>
            
            <?php if (empty($mis_cuotas)): ?>
                <div class="card">
                    <p>No tienes cuotas registradas.</p>
                    <p>Las cuotas se generan automáticamente cuando el tesorero habilita un nuevo año.</p>
                </div>
            <?php else: ?>
                <div class="card">
                    <h3>📋 Historial de Cuotas</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Año</th>
                                <th>Mes</th>
                                <th>Monto Esperado</th>
                                <th>Monto Pagado</th>
                                <th>Estado</th>
                                <th>Fecha Pago</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php 
                            $total_esperado = 0;
                            $total_pagado = 0;
                            ?>
                            <?php foreach ($mis_cuotas as $cuota): 
                                $total_esperado += $cuota['monto_esperado'];
                                $total_pagado += $cuota['monto_pagado'];
                            ?>
                            <tr>
                                <td><strong><?php echo $cuota['año']; ?></strong></td>
                                <td><?php echo $meses_nombres[$cuota['mes']]; ?></td>
                                <td><?php echo formato_dinero($cuota['monto_esperado']); ?></td>
                                <td><?php echo formato_dinero($cuota['monto_pagado']); ?></td>
                                <td>
                                    <span class="estado-badge estado-<?php echo $cuota['estado']; ?>">
                                        <?php echo ucfirst($cuota['estado']); ?>
                                    </span>
                                </td>
                                <td><?php echo $cuota['fecha_pago'] ? date('d/m/Y', strtotime($cuota['fecha_pago'])) : '--'; ?></td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                        <tfoot style="background: #f8f9fa; font-weight: bold;">
                            <tr>
                                <td colspan="2">TOTALES</td>
                                <td><?php echo formato_dinero($total_esperado); ?></td>
                                <td><?php echo formato_dinero($total_pagado); ?></td>
                                <td>
                                    <?php 
                                    $porcentaje_personal = $total_esperado > 0 ? ($total_pagado / $total_esperado) * 100 : 0;
                                    echo number_format($porcentaje_personal, 1) . '%';
                                    ?>
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            <?php endif; ?>
        </div>

        <!-- Mis Salidas -->
        <div id="salidas" class="tab-content">
            <h2>🏔️ Mis Salidas</h2>
            
            <?php if (empty($mis_salidas)): ?>
                <div class="card">
                    <p>No estás inscrito en ninguna salida.</p>
                    <p>¡Explora el <a href="salidas.php">calendario de salidas</a> y únete a nuestras próximas aventuras! 🏔️</p>
                </div>
            <?php else: ?>
                <div class="card">
                    <h3>📋 Salidas Inscritas</h3>
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
                            <?php foreach ($mis_salidas as $salida): ?>
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
                                        <?php echo ucfirst($salida['nivel_dificultad']); ?>
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
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            <?php endif; ?>
        </div>

        <!-- Mis Préstamos -->
        <div id="prestamos" class="tab-content">
            <h2>🎒 Mis Préstamos de Equipo</h2>
            
            <?php if (empty($mis_prestamos)): ?>
                <div class="card">
                    <p>No has solicitado préstamos de equipo.</p>
                    <p>Puedes solicitar equipo desde el <a href="equipos.php">inventario de equipos</a>.</p>
                </div>
            <?php else: ?>
                <div class="card">
                    <h3>📋 Historial de Préstamos</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Equipo</th>
                                <th>Categoría</th>
                                <th>Fecha Solicitud</th>
                                <th>Período</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($mis_prestamos as $prestamo): ?>
                            <tr>
                                <td>
                                    <strong><?php echo htmlspecialchars($prestamo['equipo_nombre']); ?></strong><br>
                                    <small><?php echo htmlspecialchars($prestamo['motivo']); ?></small>
                                </td>
                                <td><?php echo htmlspecialchars($prestamo['categoria']); ?></td>
                                <td><?php echo date('d/m/Y H:i', strtotime($prestamo['fecha_solicitud'])); ?></td>
                                <td>
                                    <?php echo date('d/m/Y', strtotime($prestamo['fecha_desde'])); ?> -<br>
                                    <?php echo date('d/m/Y', strtotime($prestamo['fecha_hasta'])); ?>
                                </td>
                                <td>
                                    <span class="estado-badge estado-<?php echo $prestamo['estado']; ?>">
                                        <?php echo ucfirst($prestamo['estado']); ?>
                                    </span>
                                </td>
                                <td>
                                    <a href="equipos.php" class="btn btn-info btn-sm">📦 Ver Equipos</a>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            <?php endif; ?>
        </div>

        <!-- Mis Notificaciones -->
        <div id="notificaciones" class="tab-content">
            <h2>🔔 Mis Notificaciones</h2>
            
            <?php if (empty($mis_notificaciones)): ?>
                <div class="card">
                    <p>No tienes notificaciones.</p>
                    <p>Las notificaciones aparecerán aquí cuando tengas nuevas actividades o mensajes del sistema.</p>
                </div>
            <?php else: ?>
                <div class="card">
                    <h3>📢 Notificaciones Recientes</h3>
                    <?php foreach ($mis_notificaciones as $notif): ?>
                    <div class="activity-item notificacion <?php echo $notif['leida'] ? '' : 'unread'; ?>">
                        <div style="display: flex; justify-content: between; align-items: start;">
                            <div style="flex-grow: 1;">
                                <h4 style="margin: 0 0 5px 0; <?php echo !$notif['leida'] ? 'font-weight: bold;' : ''; ?>">
                                    <?php echo htmlspecialchars($notif['titulo']); ?>
                                </h4>
                                <p style="margin: 0 0 10px 0; color: #333;">
                                    <?php echo htmlspecialchars($notif['mensaje']); ?>
                                </p>
                                <div style="font-size: 12px; color: #666;">
                                    <?php echo date('d/m/Y H:i', strtotime($notif['fecha_creacion'])); ?>
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
                                    ">
                                        <?php echo ucfirst($notif['tipo']); ?>
                                    </span>
                                    <?php if (!$notif['leida']): ?>
                                    <span style="color: #dc3545; font-weight: bold;"> • Nuevo</span>
                                    <?php endif; ?>
                                </div>
                            </div>
                            <div style="margin-left: 15px;">
                                <?php if (!$notif['leida']): ?>
                                    <a href="notificaciones.php?marcar_leida=<?php echo $notif['id']; ?>" class="btn btn-success btn-sm">✅ Leída</a>
                                <?php endif; ?>
                                <?php if ($notif['enlace']): ?>
                                    <a href="<?php echo $notif['enlace']; ?>" class="btn btn-info btn-sm">🔗 Ver</a>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>
                    <?php endforeach; ?>
                    
                    <div style="text-align: center; margin-top: 20px;">
                        <a href="notificaciones.php" class="btn">📋 Ver Todas las Notificaciones</a>
                    </div>
                </div>
            <?php endif; ?>
        </div>
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

        // Activar primera pestaña por defecto
        document.addEventListener('DOMContentLoaded', function() {
            openTab('cuotas');
        });
    </script>
</body>
</html>