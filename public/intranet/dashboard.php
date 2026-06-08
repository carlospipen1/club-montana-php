<?php
session_start();
header('Content-Type: text/html; charset=utf-8');

// Verificar si el usuario está logueado
if (!isset($_SESSION['usuario_id'])) {
    header('Location: login.php');
    exit;
}

require_once 'config/database.php';
$database = new Database();
$db = $database->getConnection();
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Inicio - Club de Montana</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 0;
            background: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        .welcome {
            background: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .modules {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        .module-card {
            background: white;
            padding: 25px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border-left: 4px solid #2c5aa0;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .module-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(0,0,0,0.15);
        }
        .module-card h3 {
            color: #2c5aa0;
            margin-top: 0;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .btn {
            display: inline-block;
            background: #2c5aa0;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 10px;
            transition: background 0.2s;
        }
        .btn:hover {
            background: #1e3d6f;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .stat-card {
            text-align: center;
            padding: 20px;
            border-radius: 8px;
            color: white;
            font-weight: bold;
        }
        .stat-number {
            font-size: 32px;
            margin-bottom: 5px;
        }
        .quick-actions {
            background: white;
            padding: 25px;
            border-radius: 10px;
            margin-top: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .action-buttons {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            margin-top: 15px;
        }
        .action-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: #2c5aa0;
            color: white;
            padding: 12px 20px;
            text-decoration: none;
            border-radius: 8px;
            transition: all 0.2s;
        }
        .action-btn:hover {
            background: #1e3d6f;
            transform: translateY(-1px);
        }
    </style>
</head>
<body>
    <?php include 'includes/header.php'; ?>

    <div class="container">
        <div class="welcome">
            <h2>Bienvenido, <?php echo htmlspecialchars($_SESSION['usuario_nombre']); ?>! 👋</h2>
            <p>Gestiona todas las actividades del Club de Montana desde un solo lugar.</p>
            
            <!-- Estadísticas rápidas -->
            <div class="stats-grid">
                <div class="stat-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    <div class="stat-number">
                        <?php
                        try {
                            $stmt = $db->query("SELECT COUNT(*) FROM usuarios WHERE estado = 'activo'");
                            echo $stmt->fetchColumn();
                        } catch (Exception $e) {
                            echo "0";
                        }
                        ?>
                    </div>
                    <div>Socios Activos</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                    <div class="stat-number">
                        <?php
                        try {
                            $stmt = $db->query("SELECT COUNT(*) FROM equipos WHERE estado = 'disponible'");
                            echo $stmt->fetchColumn();
                        } catch (Exception $e) {
                            echo "0";
                        }
                        ?>
                    </div>
                    <div>Equipos Disponibles</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                    <div class="stat-number">
                        <?php
                        try {
                            $stmt = $db->query("SELECT COUNT(*) FROM salidas WHERE estado = 'planificada'");
                            echo $stmt->fetchColumn();
                        } catch (Exception $e) {
                            echo "0";
                        }
                        ?>
                    </div>
                    <div>Salidas Planificadas</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">
                    <div class="stat-number">
                        <?php
                        try {
                            $stmt = $db->prepare("SELECT COUNT(*) FROM notificaciones WHERE usuario_id = ? AND leida = 0");
                            $stmt->execute([$_SESSION['usuario_id']]);
                            echo $stmt->fetchColumn();
                        } catch (Exception $e) {
                            echo "0";
                        }
                        ?>
                    </div>
                    <div>Notificaciones</div>
                </div>
            </div>
        </div>

        <!-- Módulos principales -->
        <div class="modules">
            <div class="module-card">
                <h3>👥 Gestión de Socios</h3>
                <p>Administra la información de los miembros del club, roles y contactos de emergencia.</p>
                <a href="socios.php" class="btn">Ir a Gestion de Socios</a>
            </div>

            <div class="module-card">
                <h3>🎒 Gestión de Equipo</h3>
                <p>Control de inventario, préstamos y estados de disponibilidad del equipo del club.</p>
                <a href="equipos.php" class="btn">Ir a Gestión de Equipo</a>
            </div>

            <div class="module-card">
                <h3>🏔️ Salidas y Eventos</h3>
                <p>Organiza y gestiona las salidas del club, inscripciones y control de asistencia.</p>
                <a href="salidas.php" class="btn">Ir a Salidas y Eventos</a>
            </div>

            <div class="module-card">
                <h3>💰 Sistema de Cuotas</h3>
                <p>Control de pagos mensuales, estados de cuenta y recordatorios automáticos.</p>
                <a href="cuotas.php" class="btn">Ir a Sistema de Cuotas</a>
            </div>

            <?php if ($_SESSION['usuario_rol'] === 'admin' || $_SESSION['usuario_rol'] === 'presidente'): ?>
            <div class="module-card">
                <h3>⚙️ Administración</h3>
                <p>Configuración del sistema, usuarios avanzados y reportes del club.</p>
                <a href="admin.php" class="btn">Ir a Administración</a>
            </div>
            <?php endif; ?>

            <div class="module-card">
                <h3>📊 Mi Actividad</h3>
                <p>Consulta tu historial personal, préstamos y participación en actividades.</p>
                <a href="mi_actividad.php" class="btn">Ir a Mi Actividad</a>
            </div>
        </div>

        <!-- Acciones rápidas según el rol -->
        <div class="quick-actions">
            <h3>🚀 Acciones Rápidas</h3>
            <div class="action-buttons">
                <a href="perfil.php" class="action-btn">
                    👤 Mi Perfil
                </a>
                <a href="notificaciones.php" class="action-btn">
                    🔔 Notificaciones
                </a>
                
                <?php if ($_SESSION['usuario_rol'] === 'encargado_equipo' || $_SESSION['usuario_rol'] === 'admin'): ?>
                <a href="gestion_prestamos.php" class="action-btn">
                    ⚙️ Gestionar Préstamos
                </a>
                <?php endif; ?>
                
                <?php if ($_SESSION['usuario_rol'] === 'admin' || $_SESSION['usuario_rol'] === 'presidente' || $_SESSION['usuario_rol'] === 'secretario'): ?>
                <a href="socios.php" class="action-btn">
                    ➕ Agregar Socio
                </a>
                <?php endif; ?>
                
                <a href="equipos.php" class="action-btn">
                    🎒 Solicitar Equipo
                </a>
                
                <?php if ($_SESSION['usuario_rol'] === 'encargado_equipo' || $_SESSION['usuario_rol'] === 'admin'): ?>
                <a href="equipos.php#agregar" class="action-btn">
                    📦 Agregar Equipo
                </a>
                <?php endif; ?>
            </div>
        </div>

        <!-- Información del sistema -->
        <div style="margin-top: 30px; text-align: center; color: #666; font-size: 14px;">
            <p>Sistema de Gestión Club de Montana Collipulli | 
               <strong>Usuario:</strong> <?php echo htmlspecialchars($_SESSION['usuario_nombre']); ?> | 
               <strong>Rol:</strong> <?php echo htmlspecialchars($_SESSION['usuario_rol']); ?> |
               <strong>Último acceso:</strong> <?php echo date('d/m/Y H:i'); ?>
            </p>
        </div>
    </div>
</body>
</html>

