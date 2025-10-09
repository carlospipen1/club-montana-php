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

// Verificar permisos para módulos administrativos
$es_admin = $_SESSION['usuario_rol'] === 'admin';
$es_tesorero = $_SESSION['usuario_rol'] === 'tesorero';
$es_presidente = $_SESSION['usuario_rol'] === 'presidente';
$puede_gestionar = $es_admin || $es_tesorero || $es_presidente;

// Procesar pago de cuota (usuarios normales)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['marcar_pagada'])) {
    $cuota_id = $_POST['cuota_id'] ?? '';
    
    if (!empty($cuota_id)) {
        try {
            $stmt = $db->prepare("UPDATE cuotas SET estado = 'pagada', fecha_pago = CURRENT_DATE WHERE id = ? AND usuario_id = ?");
            $stmt->execute([$cuota_id, $_SESSION['usuario_id']]);
            
            if ($stmt->rowCount() > 0) {
                $mensaje = "✅ Cuota marcada como pagada correctamente";
                
                // Notificar al tesorero y admin
                $notificar_a = $db->query("SELECT id FROM usuarios WHERE rol IN ('admin', 'tesorero') AND estado = 'activo'")->fetchAll(PDO::FETCH_COLUMN);
                $mensaje_notificacion = $_SESSION['usuario_nombre'] . " ha marcado una cuota como pagada";
                foreach ($notificar_a as $usuario_id) {
                    $db->prepare("INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, enlace) VALUES (?, 'cuota', '💰 Pago registrado', ?, 'cuotas.php?tab=gestion')")
                       ->execute([$usuario_id, $mensaje_notificacion]);
                }
            }
        } catch (Exception $e) {
            $mensaje = "❌ Error al procesar pago: " . $e->getMessage();
        }
    }
}

// Confirmar pago (solo tesorero/admin)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['confirmar_pago']) && $puede_gestionar) {
    $cuota_id = $_POST['cuota_id'] ?? '';
    
    if (!empty($cuota_id)) {
        try {
            $stmt = $db->prepare("UPDATE cuotas SET estado = 'confirmada', fecha_pago = CURRENT_DATE WHERE id = ?");
            $stmt->execute([$cuota_id]);
            
            if ($stmt->rowCount() > 0) {
                $mensaje = "✅ Pago confirmado oficialmente";
                
                // Obtener info de la cuota para notificar al usuario
                $stmt = $db->prepare("SELECT usuario_id, mes FROM cuotas WHERE id = ?");
                $stmt->execute([$cuota_id]);
                $cuota_info = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($cuota_info) {
                    $mensaje_notificacion = "Tu cuota de " . $cuota_info['mes'] . " ha sido confirmada por el tesorero";
                    $db->prepare("INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, enlace) VALUES (?, 'cuota', '✅ Pago confirmado', ?, 'cuotas.php')")
                       ->execute([$cuota_info['usuario_id'], $mensaje_notificacion]);
                }
            }
        } catch (Exception $e) {
            $mensaje = "❌ Error al confirmar pago: " . $e->getMessage();
        }
    }
}

// Generar cuotas mensuales (solo tesorero/admin) - VERSIÓN CORREGIDA
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['generar_cuotas']) && $puede_gestionar) {
    $mes = $_POST['mes'] ?? '';
    $monto = $_POST['monto'] ?? 0;
    
    if (!empty($mes) && $monto > 0) {
        try {
            // Obtener usuarios activos (excepto admin)
            $usuarios = $db->query("SELECT id FROM usuarios WHERE estado = 'activo' AND rol != 'admin'")->fetchAll(PDO::FETCH_COLUMN);
            $cuotas_generadas = 0;
            
            // Preparar statements fuera del loop para mejor performance
            $stmt_check = $db->prepare("SELECT id FROM cuotas WHERE usuario_id = ? AND mes = ?");
            $stmt_insert = $db->prepare("INSERT INTO cuotas (usuario_id, tipo, monto, mes, fecha_vencimiento) VALUES (?, 'mensual', ?, ?, ?)");
            $stmt_notify = $db->prepare("INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, enlace) VALUES (?, 'cuota', ?, ?, 'cuotas.php')");
            
            foreach ($usuarios as $usuario_id) {
                // Verificar si ya existe cuota para este mes
                $stmt_check->execute([$usuario_id, $mes]);
                
                if (!$stmt_check->fetch()) {
                    $fecha_vencimiento = date('Y-m-d', strtotime($mes . ' +15 days'));
                    
                    $stmt_insert->execute([$usuario_id, $monto, $mes, $fecha_vencimiento]);
                    $cuotas_generadas++;
                    
                    // Notificar al usuario (VERSIÓN CORREGIDA)
                    $titulo_notificacion = "💰 Cuota del mes " . $mes;
                    $mensaje_notificacion = "Tu cuota de " . $mes . " está pendiente. Monto: $" . number_format($monto, 0, ',', '.');
                    
                    $stmt_notify->execute([$usuario_id, $titulo_notificacion, $mensaje_notificacion]);
                }
            }
            
            $mensaje = "✅ $cuotas_generadas cuotas generadas para $mes";
            
        } catch (Exception $e) {
            $mensaje = "❌ Error generando cuotas: " . $e->getMessage();
        }
    }
}

// Obtener cuotas del usuario
$mis_cuotas = [];
$cuotas_pendientes = [];
$estadisticas = [
    'total' => 0,
    'pagadas' => 0,
    'pendientes' => 0,
    'vencidas' => 0,
    'confirmadas' => 0
];

// Obtener todas las cuotas para admin/tesorero
$todas_cuotas = [];
$resumen_mensual = [];

try {
    // Obtener mis cuotas
    $stmt = $db->prepare("
        SELECT * FROM cuotas 
        WHERE usuario_id = ? 
        ORDER BY mes DESC, fecha_creacion DESC
    ");
    $stmt->execute([$_SESSION['usuario_id']]);
    $mis_cuotas = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Calcular estadísticas personales
    foreach ($mis_cuotas as $cuota) {
        $estadisticas['total']++;
        if ($cuota['estado'] === 'confirmada') {
            $estadisticas['confirmadas']++;
        } elseif ($cuota['estado'] === 'pagada') {
            $estadisticas['pagadas']++;
        } else {
            $estadisticas['pendientes']++;
            if (strtotime($cuota['fecha_vencimiento']) < time()) {
                $estadisticas['vencidas']++;
            }
        }
    }
    
    // Obtener cuotas pendientes (próximas a vencer)
    $stmt = $db->prepare("
        SELECT * FROM cuotas 
        WHERE usuario_id = ? AND estado = 'pendiente' AND fecha_vencimiento >= DATE('now')
        ORDER BY fecha_vencimiento ASC
        LIMIT 5
    ");
    $stmt->execute([$_SESSION['usuario_id']]);
    $cuotas_pendientes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Obtener todas las cuotas para admin/tesorero
    if ($puede_gestionar) {
        $stmt = $db->query("
            SELECT c.*, u.nombres, u.apellidos, u.email, u.rol
            FROM cuotas c 
            JOIN usuarios u ON c.usuario_id = u.id 
            ORDER BY c.mes DESC, u.apellidos, u.nombres
        ");
        $todas_cuotas = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Resumen mensual para reportes
        $stmt = $db->query("
            SELECT 
                mes,
                COUNT(*) as total,
                SUM(CASE WHEN estado = 'confirmada' THEN 1 ELSE 0 END) as confirmadas,
                SUM(CASE WHEN estado = 'pagada' THEN 1 ELSE 0 END) as pagadas,
                SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
                SUM(monto) as monto_total,
                SUM(CASE WHEN estado = 'confirmada' THEN monto ELSE 0 END) as monto_confirmado,
                SUM(CASE WHEN estado = 'pagada' THEN monto ELSE 0 END) as monto_pagado,
                SUM(CASE WHEN estado = 'pendiente' THEN monto ELSE 0 END) as monto_pendiente
            FROM cuotas 
            GROUP BY mes 
            ORDER BY mes DESC
        ");
        $resumen_mensual = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
} catch (Exception $e) {
    $mensaje = "Error cargando cuotas: " . $e->getMessage();
}

// Meses disponibles
$meses = [];
for ($i = -3; $i <= 3; $i++) {
    $fecha = strtotime("$i months");
    $meses[date('Y-m', $fecha)] = date('F Y', $fecha);
}

// Función para formatear dinero
function formato_dinero($monto) {
    return '$' . number_format($monto, 0, ',', '.');
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sistema de Cuotas - Club de Montana</title>
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
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input, select, textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box; }
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
        .estado-confirmada { background: #28a745; }
        .estado-pagada { background: #17a2b8; }
        .estado-pendiente { background: #ffc107; color: #000; }
        .estado-vencida { background: #dc3545; }
        .stat-card { text-align: center; padding: 20px; border-radius: 8px; color: white; }
        .stat-number { font-size: 32px; margin-bottom: 5px; font-weight: bold; }
        .cuota-card { border-left: 4px solid; padding: 15px; margin-bottom: 15px; background: #f8f9fa; border-radius: 5px; }
        .cuota-confirmada { border-left-color: #28a745; background: #f0fff4; }
        .cuota-pagada { border-left-color: #17a2b8; background: #f0f9ff; }
        .cuota-pendiente { border-left-color: #ffc107; background: #fffbf0; }
        .cuota-vencida { border-left-color: #dc3545; background: #fff5f5; }
        .role-badge { 
            padding: 2px 6px; 
            border-radius: 8px; 
            font-size: 10px; 
            font-weight: bold; 
            color: white;
            background: #6c757d;
        }
        .role-admin { background: #dc3545; }
        .role-tesorero { background: #20c997; }
        .role-presidente { background: #fd7e14; }
        .role-secretario { background: #6f42c1; }
        .role-miembro { background: #6c757d; }
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
            <a href="#resumen">💰 Resumen</a>
            <a href="#mis-cuotas">📋 Mis Cuotas</a>
            <a href="#pagos">💳 Pagos Pendientes</a>
            <?php if ($puede_gestionar): ?>
            <a href="#gestion">⚙️ Gestión</a>
            <a href="#reportes">📈 Reportes</a>
            <?php endif; ?>
        </div>

        <h1>💰 Sistema de Cuotas 
            <?php if ($es_tesorero): ?>
            <span class="role-badge role-tesorero">TESORERO</span>
            <?php elseif ($es_admin): ?>
            <span class="role-badge role-admin">ADMIN</span>
            <?php elseif ($es_presidente): ?>
            <span class="role-badge role-presidente">PRESIDENTE</span>
            <?php endif; ?>
        </h1>

        <!-- Pestañas principales -->
        <div class="tabs">
            <button class="tab active" onclick="openTab('resumen')">📊 Resumen</button>
            <button class="tab" onclick="openTab('mis-cuotas')">📋 Mis Cuotas</button>
            <button class="tab" onclick="openTab('pagos')">💳 Pagos Pendientes</button>
            <?php if ($puede_gestionar): ?>
            <button class="tab" onclick="openTab('gestion')">⚙️ Gestión</button>
            <button class="tab" onclick="openTab('reportes')">📈 Reportes</button>
            <?php endif; ?>
        </div>

        <!-- Resumen -->
        <div id="resumen" class="tab-content active">
            <h2>📊 Resumen de Cuotas</h2>
            
            <div class="grid-4">
                <div class="stat-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    <div class="stat-number"><?php echo $estadisticas['total']; ?></div>
                    <div>Total Cuotas</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                    <div class="stat-number"><?php echo $estadisticas['confirmadas']; ?></div>
                    <div>Confirmadas</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                    <div class="stat-number"><?php echo $estadisticas['pagadas']; ?></div>
                    <div>Pagadas</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">
                    <div class="stat-number"><?php echo $estadisticas['pendientes']; ?></div>
                    <div>Pendientes</div>
                </div>
            </div>

            <!-- Próximos vencimientos -->
            <div class="card">
                <h3>📅 Próximos Vencimientos</h3>
                <?php if (empty($cuotas_pendientes)): ?>
                    <p>¡Excelente! No tienes cuotas pendientes. 🎉</p>
                <?php else: ?>
                    <?php foreach ($cuotas_pendientes as $cuota): 
                        $dias_restantes = (strtotime($cuota['fecha_vencimiento']) - time()) / (60 * 60 * 24);
                        $dias_restantes = ceil($dias_restantes);
                        $clase_estado = $cuota['estado'] === 'confirmada' ? 'confirmada' : 
                                       ($cuota['estado'] === 'pagada' ? 'pagada' : 
                                       ($dias_restantes < 0 ? 'vencida' : 'pendiente'));
                    ?>
                    <div class="cuota-card cuota-<?php echo $clase_estado; ?>">
                        <div style="display: flex; justify-content: between; align-items: center;">
                            <div style="flex-grow: 1;">
                                <h4 style="margin: 0 0 5px 0;">Cuota <?php echo $cuota['mes']; ?></h4>
                                <p style="margin: 0; color: #666;">
                                    <strong>Monto:</strong> <?php echo formato_dinero($cuota['monto']); ?> • 
                                    <strong>Vence:</strong> <?php echo date('d/m/Y', strtotime($cuota['fecha_vencimiento'])); ?>
                                </p>
                            </div>
                            <div style="text-align: right;">
                                <?php if ($cuota['estado'] === 'pendiente'): ?>
                                <span style="color: <?php echo $dias_restantes <= 3 ? '#dc3545' : ($dias_restantes <= 7 ? '#ffc107' : '#28a745'); ?>; font-weight: bold;">
                                    <?php echo $dias_restantes; ?> días
                                </span>
                                <form method="POST" style="margin-top: 10px;">
                                    <input type="hidden" name="cuota_id" value="<?php echo $cuota['id']; ?>">
                                    <button type="submit" name="marcar_pagada" class="btn btn-success btn-sm">✅ Marcar Pagada</button>
                                </form>
                                <?php else: ?>
                                <span class="estado-badge estado-<?php echo $cuota['estado']; ?>">
                                    <?php echo ucfirst($cuota['estado']); ?>
                                </span>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
        </div>

        <!-- Mis cuotas -->
        <div id="mis-cuotas" class="tab-content">
            <h2>📋 Historial de Mis Cuotas</h2>
            
            <?php if (empty($mis_cuotas)): ?>
                <div class="card">
                    <p>No tienes cuotas registradas.</p>
                </div>
            <?php else: ?>
                <table>
                    <thead>
                        <tr>
                            <th>Mes</th>
                            <th>Tipo</th>
                            <th>Monto</th>
                            <th>Fecha Vencimiento</th>
                            <th>Estado</th>
                            <th>Fecha Pago</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($mis_cuotas as $cuota): 
                            $esta_vencida = $cuota['estado'] === 'pendiente' && strtotime($cuota['fecha_vencimiento']) < time();
                            $clase_estado = $esta_vencida ? 'vencida' : $cuota['estado'];
                        ?>
                        <tr>
                            <td><strong><?php echo $cuota['mes']; ?></strong></td>
                            <td><?php echo ucfirst($cuota['tipo']); ?></td>
                            <td><?php echo formato_dinero($cuota['monto']); ?></td>
                            <td><?php echo date('d/m/Y', strtotime($cuota['fecha_vencimiento'])); ?></td>
                            <td>
                                <span class="estado-badge estado-<?php echo $clase_estado; ?>">
                                    <?php echo ucfirst($cuota['estado']); ?>
                                    <?php if ($esta_vencida) echo ' (Vencida)'; ?>
                                </span>
                            </td>
                            <td>
                                <?php echo $cuota['fecha_pago'] ? date('d/m/Y', strtotime($cuota['fecha_pago'])) : '--'; ?>
                            </td>
                            <td>
                                <?php if ($cuota['estado'] === 'pendiente'): ?>
                                <form method="POST" style="display: inline;">
                                    <input type="hidden" name="cuota_id" value="<?php echo $cuota['id']; ?>">
                                    <button type="submit" name="marcar_pagada" class="btn btn-success btn-sm">✅ Pagar</button>
                                </form>
                                <?php else: ?>
                                <span style="color: #28a745;">✅ <?php echo ucfirst($cuota['estado']); ?></span>
                                <?php endif; ?>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>

        <!-- Gestión (solo admin/tesorero) -->
        <?php if ($puede_gestionar): ?>
        <div id="gestion" class="tab-content">
            <h2>⚙️ Gestión de Cuotas</h2>
            
            <!-- Generar cuotas -->
            <div class="card">
                <h3>🔄 Generar Cuotas Mensuales</h3>
                <form method="POST" class="grid-2">
                    <div class="form-group">
                        <label for="mes">Mes y Año *</label>
                        <select id="mes" name="mes" required>
                            <option value="">Seleccionar mes</option>
                            <?php foreach ($meses as $valor => $etiqueta): ?>
                            <option value="<?php echo $valor; ?>"><?php echo $etiqueta; ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="monto">Monto *</label>
                        <input type="number" id="monto" name="monto" min="1000" max="100000" value="15000" required>
                    </div>
                    <div class="form-group" style="grid-column: 1 / -1;">
                        <button type="submit" name="generar_cuotas" class="btn btn-success">🔄 Generar Cuotas</button>
                    </div>
                </form>
            </div>
        </div>
        <?php endif; ?>
    </div>

    <script>
        function openTab(tabName) {
            const tabContents = document.getElementsByClassName('tab-content');
            for (let i = 0; i < tabContents.length; i++) {
                tabContents[i].classList.remove('active');
            }
            
            const tabs = document.getElementsByClassName('tab');
            for (let i = 0; i < tabs.length; i++) {
                tabs[i].classList.remove('active');
            }
            
            document.getElementById(tabName).classList.add('active');
            event.currentTarget.classList.add('active');
        }
        
        // Configurar mes actual por defecto
        document.addEventListener('DOMContentLoaded', function() {
            const ahora = new Date();
            const mesActual = ahora.toISOString().slice(0, 7);
            
            const selectMes = document.getElementById('mes');
            if (selectMes) {
                selectMes.value = mesActual;
            }
        });
    </script>
</body>
</html>
