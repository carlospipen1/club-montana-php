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
    <title>Dashboard - Club de Montana</title>
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
        }
        .module-card h3 {
            color: #2c5aa0;
            margin-top: 0;
        }
        .btn {
            display: inline-block;
            background: #2c5aa0;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 10px;
        }
        .btn:hover {
            background: #1e3d6f;
        }
    </style>
</head>
<body>
    <?php include 'includes/header.php'; ?>

    <div class="container">
        <div class="welcome">
            <h2>Bienvenido al Sistema de Gestión</h2>
            <p>Selecciona un módulo para comenzar:</p>
        </div>

        <div class="modules">
            <div class="module-card">
                <h3>👥 Gestión de Socios</h3>
                <p>Administra la información de los miembros del club.</p>
                <a href="socios.php" class="btn">Acceder</a>
            </div>

            <div class="module-card">
                <h3>🎒 Gestión de Equipo</h3>
                <p>Control de inventario y préstamos de equipo.</p>
                <a href="equipos.php" class="btn">Acceder</a>
            </div>

            <div class="module-card">
                <h3>🏔️ Salidas y Eventos</h3>
                <p>Organiza y gestiona las salidas del club.</p>
                <a href="salidas.php" class="btn">Acceder</a>
            </div>

            <div class="module-card">
                <h3>💰 Sistema de Cuotas</h3>
                <p>Control de pagos y estados de cuenta.</p>
                <a href="cuotas.php" class="btn">Acceder</a>
            </div>

            <?php if ($_SESSION['usuario_rol'] === 'admin' || $_SESSION['usuario_rol'] === 'presidente'): ?>
            <div class="module-card">
                <h3>⚙️ Administración</h3>
                <p>Configuración del sistema y usuarios.</p>
                <a href="admin.php" class="btn">Acceder</a>
            </div>
            <?php endif; ?>

            <div class="module-card">
                <h3>📊 Mi Actividad</h3>
                <p>Consulta tu historial y actividades.</p>
                <a href="mi_actividad.php" class="btn">Acceder</a>
            </div>
        </div>

        <!-- Estadísticas rápidas -->
        <div style="margin-top: 30px;">
            <div class="welcome">
                <h3>📈 Resumen Rápido</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 20px;">
                    <div style="text-align: center; padding: 15px; background: #e3f2fd; border-radius: 8px;">
                        <div style="font-size: 24px; font-weight: bold; color: #2c5aa0;">
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
                    <div style="text-align: center; padding: 15px; background: #e8f5e8; border-radius: 8px;">
                        <div style="font-size: 24px; font-weight: bold; color: #28a745;">
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
                    <div style="text-align: center; padding: 15px; background: #fff3cd; border-radius: 8px;">
                        <div style="font-size: 24px; font-weight: bold; color: #ffc107;">
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
                </div>
            </div>
        </div>
    </div>
</body>
</html>
