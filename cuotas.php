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

// Verificar permisos
$es_admin = $_SESSION['usuario_rol'] === 'admin';
$es_tesorero = $_SESSION['usuario_rol'] === 'tesorero';
$es_presidente = $_SESSION['usuario_rol'] === 'presidente';
$puede_gestionar = $es_admin || $es_tesorero || $es_presidente;

// Montos por tipo de miembro
$montos_cuota = [
    'general' => 5000,
    'estudiante' => 3000
];

// Procesar habilitación de año (solo tesorero/admin)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['habilitar_año']) && $puede_gestionar) {
    $año = $_POST['año'] ?? '';
    
    if (!empty($año) && is_numeric($año)) {
        try {
            // Verificar si el año ya existe
            $stmt = $db->prepare("SELECT id FROM cuotas_anuales WHERE año = ?");
            $stmt->execute([$año]);
            
            if (!$stmt->fetch()) {
                // Crear nuevo año
                $stmt = $db->prepare("INSERT INTO cuotas_anuales (año, estado, creado_por) VALUES (?, 'activo', ?)");
                $stmt->execute([$año, $_SESSION['usuario_id']]);
                
                // Obtener usuarios activos
                $usuarios = $db->query("SELECT id, tipo_miembro FROM usuarios WHERE estado = 'activo'")->fetchAll(PDO::FETCH_ASSOC);
                
                // Preparar statement para insertar cuotas mensuales
                $stmt_cuota = $db->prepare("INSERT INTO cuotas_mensuales (año, mes, usuario_id, tipo_miembro, monto_esperado) VALUES (?, ?, ?, ?, ?)");
                
                $cuotas_creadas = 0;
                foreach ($usuarios as $usuario) {
                    for ($mes = 1; $mes <= 12; $mes++) {
                        $monto_esperado = $montos_cuota[$usuario['tipo_miembro']];
                        try {
                            $stmt_cuota->execute([$año, $mes, $usuario['id'], $usuario['tipo_miembro'], $monto_esperado]);
                            $cuotas_creadas++;
                        } catch (Exception $e) {
                            // Ignorar errores de duplicados
                            if (strpos($e->getMessage(), 'UNIQUE constraint') === false) {
                                error_log("Error creando cuota: " . $e->getMessage());
                            }
                        }
                    }
                }
                
                $mensaje = "✅ Año $año habilitado correctamente. Se crearon $cuotas_creadas cuotas mensuales.";
                
                // Notificar a todos los usuarios
                $usuarios_notificar = $db->query("SELECT id FROM usuarios WHERE estado = 'activo'")->fetchAll(PDO::FETCH_COLUMN);
                foreach ($usuarios_notificar as $usuario_id) {
                    $db->prepare("INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, enlace) VALUES (?, 'cuota', '💰 Año $año habilitado', 'Se ha habilitado el registro de cuotas para el año $año', 'cuotas.php')")
                       ->execute([$usuario_id]);
                }
            } else {
                $mensaje = "ℹ️ El año $año ya está habilitado.";
            }
        } catch (Exception $e) {
            $mensaje = "❌ Error habilitando año: " . $e->getMessage();
        }
    }
}

// Procesar registro de pago (solo tesorero/admin)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['registrar_pago']) && $puede_gestionar) {
    $cuota_id = $_POST['cuota_id'] ?? '';
    $monto_pagado = $_POST['monto_pagado'] ?? '';
    $observaciones = $_POST['observaciones'] ?? '';
    
    if (!empty($cuota_id) && is_numeric($monto_pagado)) {
        try {
            // Obtener información de la cuota
            $stmt = $db->prepare("SELECT cm.*, u.nombres, u.apellidos FROM cuotas_mensuales cm JOIN usuarios u ON cm.usuario_id = u.id WHERE cm.id = ?");
            $stmt->execute([$cuota_id]);
            $cuota = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($cuota) {
                $estado = ($monto_pagado >= $cuota['monto_esperado']) ? 'pagado' : 'parcial';
                
                $stmt = $db->prepare("UPDATE cuotas_mensuales SET monto_pagado = ?, estado = ?, fecha_pago = CURRENT_DATE, observaciones = ?, registrado_por = ? WHERE id = ?");
                $stmt->execute([$monto_pagado, $estado, $observaciones, $_SESSION['usuario_id'], $cuota_id]);
                
                $mensaje = "✅ Pago registrado para " . $cuota['nombres'] . " " . $cuota['apellidos'] . " - Mes " . $cuota['mes'] . "/" . $cuota['año'];
                
                // Notificar al usuario
                $db->prepare("INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, enlace) VALUES (?, 'cuota', '✅ Pago registrado', 'Se registró tu pago de cuota del mes " . $cuota['mes'] . "/" . $cuota['año'] . "', 'cuotas.php')")
                   ->execute([$cuota['usuario_id']]);
            }
        } catch (Exception $e) {
            $mensaje = "❌ Error registrando pago: " . $e->getMessage();
        }
    }
}

// Obtener años disponibles para habilitar
$anos_disponibles = [];
$ano_actual = date('Y');
for ($i = $ano_actual - 1; $i <= $ano_actual + 2; $i++) {
    $anos_disponibles[] = $i;
}

// Obtener años habilitados
$anos_habilitados = [];
try {
    $stmt = $db->query("SELECT * FROM cuotas_anuales ORDER BY año DESC");
    $anos_habilitados = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    // Tabla puede no existir aún
}

// Obtener año seleccionado (por defecto el primer año habilitado o año actual)
$año_seleccionado = $_GET['año'] ?? ($anos_habilitados[0]['año'] ?? $ano_actual);

// Obtener cuotas del año seleccionado
$cuotas_año = [];
$resumen_año = [
    'total_usuarios' => 0,
    'total_meses' => 0,
    'total_esperado' => 0,
    'total_pagado' => 0,
    'porcentaje_pagado' => 0
];

// Obtener mis cuotas (para usuarios normales)
$mis_cuotas = [];

try {
    // Solo cargar cuotas si el año está habilitado
    if (!empty($anos_habilitados) && in_array($año_seleccionado, array_column($anos_habilitados, 'año'))) {
        // Obtener cuotas del año seleccionado
        $stmt = $db->prepare("
            SELECT 
                cm.*,
                u.nombres,
                u.apellidos,
                u.email,
                u.tipo_miembro
            FROM cuotas_mensuales cm
            JOIN usuarios u ON cm.usuario_id = u.id
            WHERE cm.año = ?
            ORDER BY u.apellidos, u.nombres, cm.mes
        ");
        $stmt->execute([$año_seleccionado]);
        $cuotas_año = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Calcular resumen
        if (!empty($cuotas_año)) {
            $usuarios_unicos = array_unique(array_column($cuotas_año, 'usuario_id'));
            $resumen_año['total_usuarios'] = count($usuarios_unicos);
            $resumen_año['total_meses'] = count($cuotas_año);
            $resumen_año['total_esperado'] = array_sum(array_column($cuotas_año, 'monto_esperado'));
            $resumen_año['total_pagado'] = array_sum(array_column($cuotas_año, 'monto_pagado'));
            $resumen_año['porcentaje_pagado'] = $resumen_año['total_esperado'] > 0 ? 
                ($resumen_año['total_pagado'] / $resumen_año['total_esperado']) * 100 : 0;
        }
        
        // Obtener mis cuotas (para usuarios normales)
        $stmt = $db->prepare("
            SELECT 
                cm.*,
                u.nombres,
                u.apellidos,
                u.tipo_miembro
            FROM cuotas_mensuales cm
            JOIN usuarios u ON cm.usuario_id = u.id
            WHERE cm.usuario_id = ? AND cm.año = ?
            ORDER BY cm.mes
        ");
        $stmt->execute([$_SESSION['usuario_id'], $año_seleccionado]);
        $mis_cuotas = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
} catch (Exception $e) {
    // Si hay error, probablemente la tabla no existe aún
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
        .info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
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
        th { background: #f8f9fa; position: sticky; top: 0; }
        .estado-badge { padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; color: white; }
        .estado-pagado { background: #28a745; }
        .estado-parcial { background: #ffc107; color: #000; }
        .estado-pendiente { background: #dc3545; }
        .stat-card { text-align: center; padding: 20px; border-radius: 8px; color: white; }
        .stat-number { font-size: 32px; margin-bottom: 5px; font-weight: bold; }
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
        .tipo-badge { 
            padding: 2px 6px; 
            border-radius: 8px; 
            font-size: 10px; 
            font-weight: bold; 
            color: white;
        }
        .tipo-general { background: #007bff; }
        .tipo-estudiante { background: #28a745; }
        .cuota-mes { text-align: center; min-width: 80px; }
        .cuota-pagada { background: #d4edda; }
        .cuota-parcial { background: #fff3cd; }
        .cuota-pendiente { background: #f8d7da; }
        .scrollable-table { max-height: 600px; overflow-y: auto; }
        .mes-header { writing-mode: vertical-lr; transform: rotate(180deg); text-align: center; padding: 10px 5px; }
        .usuario-fila:hover { background: #f8f9fa; }
        .modal { 
            display: none; 
            position: fixed; 
            z-index: 1000; 
            left: 0; 
            top: 0; 
            width: 100%; 
            height: 100%; 
            background-color: rgba(0,0,0,0.5); 
        }
        .modal-content { 
            background-color: white; 
            margin: 10% auto; 
            padding: 20px; 
            border-radius: 10px; 
            width: 400px; 
            max-width: 90%; 
        }
        .modal-header { 
            display: flex; 
            justify-content: between; 
            align-items: center; 
            margin-bottom: 15px; 
        }
        .close { 
            color: #aaa; 
            font-size: 24px; 
            font-weight: bold; 
            cursor: pointer; 
        }
        .close:hover { color: black; }
    </style>
</head>
<body>
    <?php include 'includes/header.php'; ?>

    <div class="container">
        <?php if ($mensaje): ?>
            <div class="mensaje <?php echo strpos($mensaje, '✅') !== false ? 'success' : (strpos($mensaje, '❌') !== false ? 'error' : 'info'); ?>">
                <?php echo htmlspecialchars($mensaje); ?>
            </div>
        <?php endif; ?>

        <div class="nav">
            <a href="dashboard.php">📊 Dashboard</a>
            <a href="#resumen">💰 Resumen</a>
            <a href="#mis-cuotas">📋 Mis Cuotas</a>
            <?php if ($puede_gestionar): ?>
            <a href="#gestion">⚙️ Gestión Tesorería</a>
            <a href="#registro">📝 Registro de Pagos</a>
            <?php endif; ?>
        </div>

        <h1>💰 Sistema de Cuotas Anuales 
            <?php if ($es_tesorero): ?>
            <span class="role-badge role-tesorero">TESORERO</span>
            <?php elseif ($es_admin): ?>
            <span class="role-badge role-admin">ADMIN</span>
            <?php elseif ($es_presidente): ?>
            <span class="role-badge role-presidente">PRESIDENTE</span>
            <?php endif; ?>
        </h1>

        <!-- Selector de año -->
        <div class="card">
            <h3>📅 Años Habilitados</h3>
            <?php if (empty($anos_habilitados)): ?>
                <p>No hay años habilitados. Ve a la pestaña <strong>Gestión</strong> para habilitar un año.</p>
            <?php else: ?>
                <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                    <?php foreach ($anos_habilitados as $ano): ?>
                    <a href="?año=<?php echo $ano['año']; ?>" 
                       class="btn <?php echo $año_seleccionado == $ano['año'] ? 'btn-success' : 'btn-info'; ?>">
                       <?php echo $ano['año']; ?>
                    </a>
                    <?php endforeach; ?>
                </div>
                <p style="margin-top: 10px; color: #666;">Año actual seleccionado: <strong><?php echo $año_seleccionado; ?></strong></p>
            <?php endif; ?>
        </div>

        <!-- Pestañas principales -->
        <div class="tabs">
            <button class="tab active" onclick="openTab('resumen')">📊 Resumen</button>
            <button class="tab" onclick="openTab('mis-cuotas')">📋 Mis Cuotas</button>
            <?php if ($puede_gestionar): ?>
            <button class="tab" onclick="openTab('gestion')">⚙️ Gestión</button>
            <button class="tab" onclick="openTab('registro')">📝 Registro</button>
            <?php endif; ?>
        </div>

        <!-- Resumen general -->
        <div id="resumen" class="tab-content active">
            <h2>📊 Resumen <?php echo $año_seleccionado; ?></h2>
            
            <?php if (empty($anos_habilitados)): ?>
                <div class="card">
                    <p>No hay años habilitados para mostrar.</p>
                    <p>Ve a la pestaña <strong>Gestión</strong> y haz click en "Habilitar Año" para comenzar.</p>
                </div>
            <?php elseif (empty($cuotas_año)): ?>
                <div class="card">
                    <p>El año <?php echo $año_seleccionado; ?> está habilitado pero no hay cuotas creadas.</p>
                    <p>Si acabas de habilitar el año, recarga la página o ve a la pestaña de Gestión y haz click en "Habilitar Año" nuevamente.</p>
                </div>
            <?php else: ?>
                <div class="grid-4">
                    <div class="stat-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                        <div class="stat-number"><?php echo $resumen_año['total_usuarios']; ?></div>
                        <div>Socios Activos</div>
                    </div>
                    <div class="stat-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                        <div class="stat-number"><?php echo $resumen_año['total_meses']; ?></div>
                        <div>Cuotas Mensuales</div>
                    </div>
                    <div class="stat-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                        <div class="stat-number"><?php echo formato_dinero($resumen_año['total_esperado']); ?></div>
                        <div>Total Esperado</div>
                    </div>
                    <div class="stat-card" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">
                        <div class="stat-number"><?php echo number_format($resumen_año['porcentaje_pagado'], 1); ?>%</div>
                        <div>Recaudado</div>
                    </div>
                </div>

                <!-- Información de tarifas -->
                <div class="card">
                    <h3>💳 Tarifas Vigentes</h3>
                    <div class="grid-2">
                        <div style="text-align: center; padding: 20px; background: #e7f3ff; border-radius: 8px;">
                            <div style="font-size: 24px; font-weight: bold;">🎓 General</div>
                            <div style="font-size: 32px; color: #007bff; font-weight: bold;">$5.000</div>
                            <div>mensuales</div>
                        </div>
                        <div style="text-align: center; padding: 20px; background: #f0fff4; border-radius: 8px;">
                            <div style="font-size: 24px; font-weight: bold;">📚 Estudiante</div>
                            <div style="font-size: 32px; color: #28a745; font-weight: bold;">$3.000</div>
                            <div>mensuales</div>
                        </div>
                    </div>
                </div>
            <?php endif; ?>
        </div>

        <!-- Mis cuotas -->
        <div id="mis-cuotas" class="tab-content">
            <h2>📋 Mis Cuotas <?php echo $año_seleccionado; ?></h2>
            
            <?php if (empty($anos_habilitados)): ?>
                <div class="card">
                    <p>No hay años habilitados.</p>
                </div>
            <?php elseif (empty($mis_cuotas)): ?>
                <div class="card">
                    <p>No tienes cuotas registradas para el año <?php echo $año_seleccionado; ?>.</p>
                    <p>Si crees que esto es un error, contacta al tesorero del club.</p>
                </div>
            <?php else: ?>
                <div class="card">
                    <table>
                        <thead>
                            <tr>
                                <th>Mes</th>
                                <th>Tipo</th>
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
                                <td><strong><?php echo $meses_nombres[$cuota['mes']]; ?></strong></td>
                                <td>
                                    <span class="tipo-badge tipo-<?php echo $cuota['tipo_miembro']; ?>">
                                        <?php echo $cuota['tipo_miembro'] === 'estudiante' ? '📚 Estudiante' : '🎓 General'; ?>
                                    </span>
                                </td>
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

        <!-- Gestión (solo tesorero/admin) -->
        <?php if ($puede_gestionar): ?>
        <div id="gestion" class="tab-content">
            <h2>⚙️ Gestión de Cuotas Anuales</h2>
            
            <!-- Habilitar nuevo año -->
            <div class="card">
                <h3>🔄 Habilitar Nuevo Año</h3>
                <form method="POST" class="grid-2">
                    <div class="form-group">
                        <label for="año">Año a Habilitar *</label>
                        <select id="año" name="año" required>
                            <option value="">Seleccionar año</option>
                            <?php foreach ($anos_disponibles as $ano): ?>
                            <option value="<?php echo $ano; ?>" <?php echo in_array($ano, array_column($anos_habilitados, 'año')) ? 'disabled' : ''; ?>>
                                <?php echo $ano; ?><?php echo in_array($ano, array_column($anos_habilitados, 'año')) ? ' (Ya habilitado)' : ''; ?>
                            </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="form-group">
                        <label style="color: transparent;">.</label>
                        <button type="submit" name="habilitar_año" class="btn btn-success">✅ Habilitar Año</button>
                    </div>
                </form>
                <p style="font-size: 14px; color: #666; margin-top: 10px;">
                    💡 Al habilitar un año, se crearán automáticamente todas las cuotas mensuales para todos los socios activos.
                </p>
            </div>

            <!-- Años habilitados -->
            <?php if (!empty($anos_habilitados)): ?>
            <div class="card">
                <h3>📋 Años Habilitados</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Año</th>
                            <th>Estado</th>
                            <th>Fecha de Habilitación</th>
                            <th>Habilitado por</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($anos_habilitados as $ano): ?>
                        <tr>
                            <td><strong><?php echo $ano['año']; ?></strong></td>
                            <td>
                                <span class="estado-badge estado-<?php echo $ano['estado']; ?>">
                                    <?php echo ucfirst($ano['estado']); ?>
                                </span>
                            </td>
                            <td><?php echo date('d/m/Y H:i', strtotime($ano['fecha_creacion'])); ?></td>
                            <td><?php echo $ano['creado_por'] ? 'Usuario ID: ' . $ano['creado_por'] : 'Sistema'; ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
            <?php endif; ?>
        </div>

        <!-- Registro de pagos -->
        <div id="registro" class="tab-content">
            <h2>📝 Registro de Pagos - <?php echo $año_seleccionado; ?></h2>
            
            <?php if (empty($anos_habilitados)): ?>
                <div class="card">
                    <p>No hay años habilitados.</p>
                    <p>Habilita un año primero en la pestaña de Gestión.</p>
                </div>
            <?php elseif (empty($cuotas_año)): ?>
                <div class="card">
                    <p>No hay cuotas creadas para el año <?php echo $año_seleccionado; ?>.</p>
                    <p>Ve a la pestaña <strong>Gestión</strong> y haz click en "Habilitar Año" para crear las cuotas.</p>
                </div>
            <?php else: ?>
                <div class="card">
                    <h3>👥 Cuotas del Año <?php echo $año_seleccionado; ?></h3>
                    <p>Total de cuotas: <?php echo count($cuotas_año); ?> | 
                       Socios: <?php echo $resumen_año['total_usuarios']; ?> | 
                       Recaudado: <?php echo number_format($resumen_año['porcentaje_pagado'], 1); ?>%
                    </p>
                    
                    <div class="scrollable-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Usuario</th>
                                    <th>Tipo</th>
                                    <?php for ($mes = 1; $mes <= 12; $mes++): ?>
                                    <th class="cuota-mes"><?php echo substr($meses_nombres[$mes], 0, 3); ?></th>
                                    <?php endfor; ?>
                                    <th>Total</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php
                                $usuarios_agrupados = [];
                                foreach ($cuotas_año as $cuota) {
                                    $usuarios_agrupados[$cuota['usuario_id']][] = $cuota;
                                }
                                
                                foreach ($usuarios_agrupados as $usuario_id => $cuotas_usuario): 
                                    $total_usuario_esperado = 0;
                                    $total_usuario_pagado = 0;
                                    $cuotas_por_mes = [];
                                    
                                    foreach ($cuotas_usuario as $cuota) {
                                        $cuotas_por_mes[$cuota['mes']] = $cuota;
                                        $total_usuario_esperado += $cuota['monto_esperado'];
                                        $total_usuario_pagado += $cuota['monto_pagado'];
                                    }
                                ?>
                                <tr class="usuario-fila">
                                    <td>
                                        <strong><?php echo htmlspecialchars($cuotas_usuario[0]['nombres'] . ' ' . $cuotas_usuario[0]['apellidos']); ?></strong><br>
                                        <small><?php echo htmlspecialchars($cuotas_usuario[0]['email']); ?></small>
                                    </td>
                                    <td>
                                        <span class="tipo-badge tipo-<?php echo $cuotas_usuario[0]['tipo_miembro']; ?>">
                                            <?php echo $cuotas_usuario[0]['tipo_miembro'] === 'estudiante' ? '📚' : '🎓'; ?>
                                        </span>
                                    </td>
                                    <?php for ($mes = 1; $mes <= 12; $mes++): 
                                        $cuota_mes = $cuotas_por_mes[$mes] ?? null;
                                    ?>
                                    <td class="cuota-mes <?php echo $cuota_mes ? 'cuota-' . $cuota_mes['estado'] : ''; ?>">
                                        <?php if ($cuota_mes): ?>
                                            <div style="font-size: 11px;">
                                                <strong><?php echo formato_dinero($cuota_mes['monto_pagado']); ?></strong><br>
                                                <small>/<?php echo formato_dinero($cuota_mes['monto_esperado']); ?></small>
                                            </div>
                                            <span class="estado-badge estado-<?php echo $cuota_mes['estado']; ?>" style="font-size: 9px; padding: 2px 4px;">
                                                <?php echo substr(ucfirst($cuota_mes['estado']), 0, 1); ?>
                                            </span>
                                        <?php else: ?>
                                            <span style="color: #ccc;">--</span>
                                        <?php endif; ?>
                                    </td>
                                    <?php endfor; ?>
                                    <td>
                                        <strong><?php echo formato_dinero($total_usuario_pagado); ?></strong><br>
                                        <small>/<?php echo formato_dinero($total_usuario_esperado); ?></small>
                                    </td>
                                    <td>
                                        <button class="btn btn-sm btn-info" onclick="registrarPago(<?php echo $usuario_id; ?>, '<?php echo htmlspecialchars($cuotas_usuario[0]['nombres'] . ' ' . $cuotas_usuario[0]['apellidos']); ?>')">
                                            💰 Registrar Pago
                                        </button>
                                    </td>
                                </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            <?php endif; ?>
        </div>
        <?php endif; ?>
    </div>

    <!-- Modal para registrar pago -->
    <div id="modalPago" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>💰 Registrar Pago</h3>
                <span class="close" onclick="cerrarModal('modalPago')">&times;</span>
            </div>
            <form method="POST" id="formPago">
                <input type="hidden" name="usuario_id" id="usuario_id_pago">
                <div class="form-group">
                    <label>Usuario:</label>
                    <p id="nombre_usuario_pago" style="font-weight: bold; margin: 5px 0;"></p>
                </div>
                <div class="form-group">
                    <label for="cuota_id">Cuota a Pagar:</label>
                    <select name="cuota_id" id="cuota_id" required>
                        <option value="">Seleccionar cuota</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="monto_pagado">Monto Pagado ($):</label>
                    <input type="number" name="monto_pagado" id="monto_pagado" required min="0" step="100">
                </div>
                <div class="form-group">
                    <label for="observaciones">Observaciones:</label>
                    <textarea name="observaciones" id="observaciones" rows="3" placeholder="Forma de pago, referencia, etc."></textarea>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button type="submit" name="registrar_pago" class="btn btn-success">💾 Registrar Pago</button>
                    <button type="button" class="btn btn-danger" onclick="cerrarModal('modalPago')">❌ Cancelar</button>
                </div>
            </form>
        </div>
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

        // Funciones para el modal de pago
        function registrarPago(usuarioId, nombreUsuario) {
            document.getElementById('usuario_id_pago').value = usuarioId;
            document.getElementById('nombre_usuario_pago').textContent = nombreUsuario;
            
            // Cargar cuotas pendientes del usuario
            cargarCuotasPendientes(usuarioId);
            
            document.getElementById('modalPago').style.display = 'block';
        }

        function cargarCuotasPendientes(usuarioId) {
            const añoSeleccionado = <?php echo $año_seleccionado; ?>;
            const selectCuotas = document.getElementById('cuota_id');
            selectCuotas.innerHTML = '<option value="">Cargando cuotas...</option>';
            
            // En una implementación real, aquí harías una llamada AJAX al servidor
            // Por ahora, simulamos con las cuotas que ya tenemos cargadas
            setTimeout(() => {
                selectCuotas.innerHTML = '<option value="">Seleccionar cuota</option>';
                
                <?php foreach ($cuotas_año as $cuota): ?>
                <?php if ($cuota['estado'] !== 'pagado'): ?>
                if (<?php echo $cuota['usuario_id']; ?> === usuarioId) {
                    const option = document.createElement('option');
                    option.value = <?php echo $cuota['id']; ?>;
                    option.textContent = '<?php echo $meses_nombres[$cuota["mes"]]; ?> - $<?php echo $cuota["monto_esperado"]; ?> (<?php echo ucfirst($cuota["estado"]); ?>)';
                    option.setAttribute('data-monto', <?php echo $cuota['monto_esperado']; ?>);
                    selectCuotas.appendChild(option);
                }
                <?php endif; ?>
                <?php endforeach; ?>
                
                if (selectCuotas.options.length === 1) {
                    selectCuotas.innerHTML = '<option value="">No hay cuotas pendientes</option>';
                }
            }, 500);
        }

        function cerrarModal(modalId) {
            document.getElementById(modalId).style.display = 'none';
        }

        // Cerrar modal al hacer click fuera
        window.onclick = function(event) {
            if (event.target.classList.contains('modal')) {
                event.target.style.display = 'none';
            }
        }

        // Auto-completar monto cuando se selecciona una cuota
        document.getElementById('cuota_id').addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            if (selectedOption.value && selectedOption.getAttribute('data-monto')) {
                document.getElementById('monto_pagado').value = selectedOption.getAttribute('data-monto');
            }
        });
    </script>
</body>
</html>
