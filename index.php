<?php
header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Club de Montana - Intranet</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #1e3d6f; color: white; }
        .container { max-width: 800px; margin: 0 auto; background: #2c5aa0; padding: 30px; border-radius: 10px; }
        .success { color: #90EE90; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏔️ Club de Montana Collipulli</h1>
        
        <?php
        require_once 'config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        
        if ($db) {
            echo '<p class="success">✅ Sistema funcionando con SQLite</p>';
            
            // Verificar tablas
            try {
                $stmt = $db->query("SELECT name FROM sqlite_master WHERE type='table'");
                $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
                
                echo '<p>📊 Tablas en sistema: ' . count($tables) . '</p>';
                
            } catch (Exception $e) {
                echo '<p>⚠️ Base de datos no instalada. <a href="install.php" style="color: #ffd700;">Instalar ahora</a></p>';
            }
        }
        ?>
        
        <div style="margin-top: 30px;">
            <h3>🚀 Módulos del Sistema:</h3>
            <ul>
                <li><a href="login.php" style="color: #ffd700;">Sistema de Login</a></li>
                <li><a href="install.php" style="color: #ffd700;">Instalador BD</a></li>
                <li>Gestión de Miembros</li>
                <li>Calendario de Eventos</li>
                <li>Sistema de Reservas</li>
            </ul>
        </div>
        
        <p><strong>PHP Version:</strong> <?php echo phpversion(); ?></p>
        <p><strong>Base de datos:</strong> SQLite ✅ Compatible</p>
    </div>
</body>
</html>
