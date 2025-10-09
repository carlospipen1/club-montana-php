<?php
session_start();
header('Content-Type: text/html; charset=utf-8');

// Verificar autenticación y permisos
if (!isset($_SESSION['usuario_id'])) {
    header('Location: login.php');
    exit;
}

require_once 'config/database.php';
$database = new Database();
$db = $database->getConnection();

// Procesar acciones
$mensaje = '';
$password_generada = '';

// Función para generar contraseña aleatoria
function generarPassword($longitud = 8) {
    $caracteres = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    $password = '';
    for ($i = 0; $i < $longitud; $i++) {
        $password .= $caracteres[rand(0, strlen($caracteres) - 1)];
    }
    return $password;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['agregar_usuario'])) {
        // Agregar nuevo usuario
        $nombres = $_POST['nombres'] ?? '';
        $apellidos = $_POST['apellidos'] ?? '';
        $email = $_POST['email'] ?? '';
        $rut = $_POST['rut'] ?? '';
        $rol = $_POST['rol'] ?? 'miembro';
        $telefono = $_POST['telefono'] ?? '';
        
        // Generar contraseña aleatoria
        $password = generarPassword(8);
        $password_generada = $password; // Guardar para mostrar
        
        if (!empty($nombres) && !empty($apellidos) && !empty($email)) {
            try {
                $stmt = $db->prepare("INSERT INTO usuarios (nombres, apellidos, email, rut, telefono, password_hash, rol) VALUES (?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$nombres, $apellidos, $email, $rut, $telefono, password_hash($password, PASSWORD_DEFAULT), $rol]);
                $mensaje = "✅ Usuario agregado correctamente";
                
                // Notificar al admin sobre nuevo usuario
                if ($_SESSION['usuario_rol'] === 'admin') {
                    $db->prepare("INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, enlace) VALUES (?, 'sistema', '👥 Nuevo socio registrado', 'Se ha agregado a $nombres $apellidos al sistema', 'socios.php')")
                       ->execute([$_SESSION['usuario_id']]);
                }
                
            } catch (Exception $e) {
                if (strpos($e->getMessage(), 'UNIQUE constraint failed') !== false) {
                    $mensaje = "❌ Error: El email o RUT ya existe en el sistema";
                } else {
                    $mensaje = "❌ Error al agregar usuario: " . $e->getMessage();
                }
                $password_generada = ''; // Limpiar password en caso de error
            }
        } else {
            $mensaje = "❌ Por favor completa todos los campos obligatorios";
        }
    }
}

// Obtener lista de usuarios
$usuarios = [];
try {
    $stmt = $db->query("SELECT * FROM usuarios ORDER BY nombres, apellidos");
    $usuarios = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    $mensaje = "Error al cargar usuarios: " . $e->getMessage();
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestión de Socios - Club de Montana</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .card { background: white; padding: 25px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: bold; }
        .btn { display: inline-block; padding: 10px 20px; background: #2c5aa0; color: white; text-decoration: none; border-radius: 5px; border: none; cursor: pointer; }
        .btn-success { background: #28a745; }
        .btn-danger { background: #dc3545; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        .required::after { content: " *"; color: #dc3545; }
        input, select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box; }
        .mensaje { padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
        .nav { background: #e9ecef; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .nav a { margin-right: 15px; color: #2c5aa0; text-decoration: none; }
        .password-display { 
            background: #e8f5e8; 
            padding: 15px; 
            border-radius: 5px; 
            margin: 15px 0;
            border-left: 4px solid #28a745;
        }
        .copy-btn { 
            background: #17a2b8; 
            color: white; 
            border: none; 
            padding: 5px 10px; 
            border-radius: 3px; 
            cursor: pointer;
            margin-left: 10px;
        }
    </style>
</head>
<body>
    <?php include 'includes/header.php'; ?>

    <div class="container">
        <?php if ($mensaje): ?>
            <div class="mensaje <?php 
                if (strpos($mensaje, '✅') !== false) echo 'success';
                elseif (strpos($mensaje, '❌') !== false) echo 'error';
                else echo 'info';
            ?>">
                <?php echo htmlspecialchars($mensaje); ?>
            </div>
        <?php endif; ?>

        <?php if ($password_generada && strpos($mensaje, '✅') !== false): ?>
            <div class="password-display">
                <h4>🔑 Contraseña Generada para el Nuevo Usuario</h4>
                <p style="font-size: 18px; font-weight: bold; margin: 10px 0;">
                    <code id="passwordText"><?php echo htmlspecialchars($password_generada); ?></code>
                    <button class="copy-btn" onclick="copiarPassword()">📋 Copiar</button>
                </p>
                <p style="font-size: 14px; color: #666; margin: 0;">
                    <strong>⚠️ Importante:</strong> Esta contraseña se muestra solo una vez. 
                    Debes comunicarla al nuevo usuario de forma segura.
                </p>
            </div>
            
            <script>
                function copiarPassword() {
                    const passwordText = document.getElementById('passwordText');
                    const textArea = document.createElement('textarea');
                    textArea.value = passwordText.textContent;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    
                    const btn = event.target;
                    const originalText = btn.textContent;
                    btn.textContent = '✅ Copiada!';
                    setTimeout(() => {
                        btn.textContent = originalText;
                    }, 2000);
                }
            </script>
        <?php endif; ?>

        <div class="nav">
            <a href="#agregar">➕ Agregar Socio</a>
            <a href="#lista">📋 Lista de Socios</a>
        </div>

        <!-- Formulario para agregar usuario -->
        <div class="card" id="agregar">
            <h2>➕ Agregar Nuevo Socio</h2>
            <form method="POST">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div class="form-group">
                        <label for="nombres" class="required">Nombres</label>
                        <input type="text" id="nombres" name="nombres" required>
                    </div>
                    <div class="form-group">
                        <label for="apellidos" class="required">Apellidos</label>
                        <input type="text" id="apellidos" name="apellidos" required>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div class="form-group">
                        <label for="email" class="required">Email</label>
                        <input type="email" id="email" name="email" required placeholder="usuario@ejemplo.com">
                    </div>
                    <div class="form-group">
                        <label for="rut">RUT</label>
                        <input type="text" id="rut" name="rut" placeholder="12.345.678-9">
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div class="form-group">
                        <label for="telefono">Teléfono</label>
                        <input type="tel" id="telefono" name="telefono" placeholder="+56 9 1234 5678">
                    </div>
                    <div class="form-group">
                        <label for="rol">Rol</label>
                        <select id="rol" name="rol">
                            <option value="miembro">Miembro</option>
                            <option value="encargado_equipo">Encargado de Equipo</option>
                            <option value="comision_tecnica">Comisión Técnica</option>
                            <option value="secretario">Secretario</option>
                            <option value="presidente">Presidente</option>
                            <option value="admin">Administrador</option>
                        </select>
                    </div>
                </div>

                <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ffc107;">
                    <strong>🔒 Información de Acceso:</strong>
                    <p style="margin: 5px 0 0 0; font-size: 14px;">
                        Se generará automáticamente una contraseña segura de 8 caracteres 
                        (letras y números) que se mostrará después de crear el usuario.
                    </p>
                </div>

                <button type="submit" name="agregar_usuario" class="btn btn-success">➕ Crear Usuario</button>
            </form>
        </div>

        <!-- Lista de usuarios -->
        <div class="card" id="lista">
            <h2>📋 Lista de Socios (<?php echo count($usuarios); ?>)</h2>
            
            <?php if (empty($usuarios)): ?>
                <p>No hay socios registrados.</p>
            <?php else: ?>
                <table>
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Email</th>
                            <th>Teléfono</th>
                            <th>RUT</th>
                            <th>Rol</th>
                            <th>Estado</th>
                            <th>Contacto Emergencia</th>
                            <th>Fecha Ingreso</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($usuarios as $usuario): ?>
                        <tr>
                            <td>
                                <strong><?php echo htmlspecialchars($usuario['nombres'] . ' ' . $usuario['apellidos']); ?></strong>
                                <?php if ($usuario['id'] == $_SESSION['usuario_id']): ?>
                                    <br><small style="color: #2c5aa0;">(Tú)</small>
                                <?php endif; ?>
                            </td>
                            <td><?php echo htmlspecialchars($usuario['email']); ?></td>
                            <td><?php echo htmlspecialchars($usuario['telefono'] ?? 'N/A'); ?></td>
                            <td><?php echo htmlspecialchars($usuario['rut'] ?? 'N/A'); ?></td>
                            <td>
                                <span style="padding: 4px 8px; border-radius: 3px; background: 
                                    <?php echo match($usuario['rol']) {
                                        'admin' => '#dc3545',
                                        'presidente' => '#fd7e14', 
                                        'secretario' => '#20c997',
                                        'encargado_equipo' => '#6f42c1',
                                        'comision_tecnica' => '#0dcaf0',
                                        default => '#6c757d'
                                    }; ?>; color: white; font-size: 12px;">
                                    <?php echo htmlspecialchars($usuario['rol']); ?>
                                </span>
                            </td>
                            <td>
                                <span style="color: <?php echo $usuario['estado'] === 'activo' ? 'green' : 'red'; ?>;">
                                    ● <?php echo htmlspecialchars($usuario['estado']); ?>
                                </span>
                            </td>
                            <td>
                                <?php if (!empty($usuario['contacto_emergencia_nombre'])): ?>
                                    <?php echo htmlspecialchars($usuario['contacto_emergencia_nombre']); ?><br>
                                    <small><?php echo htmlspecialchars($usuario['contacto_emergencia_telefono']); ?></small>
                                <?php else: ?>
                                    <span style="color: #666;">No registrado</span>
                                <?php endif; ?>
                            </td>
                            <td><?php echo htmlspecialchars($usuario['fecha_ingreso'] ?? 'N/A'); ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>
    </div>
</body>
</html>
