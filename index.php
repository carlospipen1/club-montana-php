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
        body { 
            font-family: Arial, sans-serif; 
            margin: 40px;
            background: #1e3d6f;
            color: white;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: #2c5aa0;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        .status-box {
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏔️ Club de Montana - Intranet</h1>
        <p>¡Sistema funcionando correctamente en PHP!</p>
        
        <div class="status-box">
            <h3>✅ Información del Servidor:</h3>
            <p><strong>PHP Version:</strong> <?php echo phpversion(); ?></p>
            <p><strong>Servidor:</strong> <?php echo $_SERVER['SERVER_SOFTWARE'] ?? 'Railway/PHP'; ?></p>
            <p><strong>Tiempo:</strong> <?php echo date('Y-m-d H:i:s'); ?></p>
        </div>
        
        <div style="margin-top: 30px;">
            <h3>🚀 Próximos pasos:</h3>
            <ul>
                <li><a href="login.php" style="color: #ffd700;">Sistema de Login</a></li>
                <li>Gestión de Miembros</li>
                <li>Calendario de Eventos</li>
                <li>Sistema de Reservas</li>
            </ul>
        </div>
    </div>
</body>
</html>