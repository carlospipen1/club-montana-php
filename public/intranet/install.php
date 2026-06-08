<?php
header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head>
    <title>Instalación - Club Montana</title>
    <style>
        body { font-family: Arial; margin: 40px; background: #1e3d6f; color: white; }
        .container { max-width: 800px; margin: 0 auto; background: #2c5aa0; padding: 30px; border-radius: 10px; }
        .success { color: #90EE90; }
        .error { color: #FFB6C1; }
        button { background: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏔️ Instalación Sistema Club Montana</h1>
        
        <?php
        require_once 'config/database.php';
        
        $database = new Database();
        $db = $database->getConnection();
        
        if ($db) {
            echo '<p class="success">✅ Conexión SQLite exitosa</p>';
            
            if (isset($_POST['install'])) {
                try {
                    $database->installDatabase();
                    echo '<p class="success">✅ Base de datos instalada correctamente</p>';
                    echo '<p><a href="index.php" style="color: #ffd700;">← Ir al sistema</a></p>';
                } catch (Exception $e) {
                    echo '<p class="error">❌ Error en instalación: ' . $e->getMessage() . '</p>';
                }
            } else {
                echo '<form method="POST">';
                echo '<p>La base de datos está lista para ser instalada.</p>';
                echo '<button type="submit" name="install">🔧 Instalar Base de Datos</button>';
                echo '</form>';
            }
            
        } else {
            echo '<p class="error">❌ Error de conexión a la base de datos</p>';
        }
        ?>
        
        <hr>
        <p><strong>PHP Version:</strong> <?php echo phpversion(); ?></p>
        <p><strong>Sistema de BD:</strong> SQLite (Compatible con Railway)</p>
    </div>
</body>
</html>
