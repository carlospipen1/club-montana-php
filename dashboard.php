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
        .header {
            background: #1e3d6f;
            color: white;
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
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
        .logout {
            color: white;
            text-decoration: none;
        }
        .logout:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏔️ Club de Montana Collipulli</h1>
        <div>
            <span>Hola, <?php echo htmlspecialchars($_SESSION['usuario_nombre']); ?></span>
            <span style="margin: 0 15px;">|</span>
            <span>Rol: <?php echo htmlspecialchars($_SESSION['usuario_rol']); ?></span>
            <span style="margin: 0 15px;">|</span>
            <a href="logout.php" class="logout">Cerrar Sesión</a>
        </div>
    </div>

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

            <?php if ($_SESSION['usuario_rol'] === 'admin'): ?>
            <div class="module-card">
                <h3>⚙️ Administración</h3>
                <p>Configuración del sistema y usuarios.</p>
                <a href="admin.php" class="btn">Acceder</a>
            </div>
            <?php endif; ?>
        </div>
    </div>
</body>
</html>
