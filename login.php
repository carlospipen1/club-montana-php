<?php
session_start();
header('Content-Type: text/html; charset=utf-8');

// Procesar login si se envió el formulario
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = $_POST['email'] ?? '';
    $password = $_POST['password'] ?? '';
    
    if (!empty($email) && !empty($password)) {
        require_once 'config/database.php';
        
        $database = new Database();
        $db = $database->getConnection();
        
        if ($db) {
            try {
                // Buscar usuario por email
                $stmt = $db->prepare("SELECT * FROM usuarios WHERE email = ? AND estado = 'activo'");
                $stmt->execute([$email]);
                $usuario = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($usuario && password_verify($password, $usuario['password_hash'])) {
                    // Login exitoso
                    $_SESSION['usuario_id'] = $usuario['id'];
                    $_SESSION['usuario_email'] = $usuario['email'];
                    $_SESSION['usuario_nombre'] = $usuario['nombres'] . ' ' . $usuario['apellidos'];
                    $_SESSION['usuario_rol'] = $usuario['rol'];
                    $_SESSION['usuario_tipo'] = $usuario['tipo_miembro']; // Nuevo campo
                    
                    // Redirigir al dashboard
                    header('Location: dashboard.php');
                    exit;
                } else {
                    $error = "Credenciales incorrectas";
                }
            } catch (Exception $e) {
                $error = "Error en la base de datos: " . $e->getMessage();
            }
        } else {
            $error = "Error de conexión a la base de datos";
        }
    } else {
        $error = "Por favor completa todos los campos";
    }
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Login - Club de Montana</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            background: #1e3d6f;
            margin: 0;
            padding: 20px;
        }
        .login-container {
            max-width: 400px;
            margin: 100px auto;
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        .error {
            background: #ffebee;
            color: #c62828;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 20px;
            border-left: 4px solid #c62828;
        }
        input {
            width: 100%;
            padding: 12px;
            margin: 10px 0;
            border: 1px solid #ddd;
            border-radius: 5px;
            box-sizing: border-box;
        }
        button {
            width: 100%;
            padding: 12px;
            background: #2c5aa0;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
        }
        button:hover {
            background: #1e3d6f;
        }
        .info {
            background: #e3f2fd;
            color: #1565c0;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 20px;
            border-left: 4px solid #1565c0;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <h2>🔐 Acceso a la Intranet</h2>
        
        <?php if (isset($error)): ?>
            <div class="error"><?php echo htmlspecialchars($error); ?></div>
        <?php endif; ?>
        
        <div class="info">
            <strong>Usuarios de prueba:</strong><br>
            Admin: admin@clubmontana.cl / admin123<br>
            Tesorero: tesorero@clubmontana.cl / tesorero123<br>
            Estudiante: estudiante@clubmontana.cl / estudiante123
        </div>
        
        <form method="POST" action="">
            <input type="email" name="email" placeholder="Email" required value="<?php echo htmlspecialchars($_POST['email'] ?? ''); ?>">
            <input type="password" name="password" placeholder="Contraseña" required>
            <button type="submit">Ingresar al Sistema</button>
        </form>
        
        <div style="text-align: center; margin-top: 20px;">
            <a href="index.php" style="color: #2c5aa0;">← Volver al inicio</a>
        </div>
    </div>
</body>
</html>
