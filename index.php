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
            background: #f5f5f5;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #2c5aa0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏔️ Club de Montana - Intranet</h1>
        <p>¡Bienvenido a la intranet del club!</p>
        <div id="status">
            <p><strong>Estado del servidor:</strong> ✅ PHP funcionando correctamente</p>
            <p><strong>Versión PHP:</strong> <?php echo phpversion(); ?></p>
        </div>
        
        <div style="margin-top: 30px;">
            <h3>Próximos pasos:</h3>
            <ul>
                <li><a href="login.php">Sistema de Login</a></li>
                <li>Gestión de Miembros</li>
                <li>Calendario de Eventos</li>
                <li>Sistema de Reservas</li>
            </ul>
        </div>
    </div>
</body>
</html>
