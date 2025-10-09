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
        .error { color: #FFB6C1; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏔️ Club de Montana Collipulli</h1>
        
        <?php
        // Probar conexión a BD
        require_once 'config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        
        if ($db) {
            echo '<p class="success">✅ Conexión a BD exitosa</p>';
            
            // Verificar tablas
            try {
                $stmt = $db->query("SHOW TABLES");
                $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
                
                if (count($tables) > 0) {
                    echo '<p class="success">✅ Tablas en BD: ' . count($tables) . '</p>';
                } else {
                    echo '<p class="error">⚠️ No hay tablas. Ejecuta el SQL en Adminer.</p>';
                }
            } catch (Exception $e) {
                echo '<p class="error">❌ Error al ver tablas: ' . $e->getMessage() . '</p>';
            }
            
        } else {
            echo '<p class="error">❌ Error de conexión a BD</p>';
        }
        ?>
        
        <p><strong>PHP Version:</strong> <?php echo phpversion(); ?></p>
        
        <div style="margin-top: 30px;">
            <h3>🚀 Sistema Base Listo</h3>
            <ul>
                <li><a href="login.php" style="color: #ffd700;">Sistema de Login</a></li>
                <li><a href="adminer.php" style="color: #ffd700;">Adminer (Gestionar BD)</a></li>
                <li><a href="api/test.php" style="color: #ffd700;">API Test</a></li>
            </ul>
        </div>
    </div>
</body>
</html>
