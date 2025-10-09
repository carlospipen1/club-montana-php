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
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['agregar_usuario'])) {
        // Agregar nuevo usuario
        $nombres = $_POST['nombres'] ?? '';
        $apellidos = $_POST['apellidos'] ?? '';
        $email = $_POST['email'] ?? '';
        $rut = $_POST['rut'] ?? '';
        $rol = $_POST['rol'] ?? 'miembro';
        $password = 'clube2024'; // Contraseña temporal
        
        if (!empty($nombres) && !empty($apellidos) && !empty($email)) {
            try {
                $stmt = $db->prepare("INSERT INTO usuarios (nombres, apellidos, email, rut, password_hash, rol) VALUES (?, ?, ?, ?, ?, ?)");
                $stmt->execute([$nombres, $apellidos, $email, $rut, password_hash($password, PASSWORD_DEFAULT), $rol]);
                $mensaje = "✅ Usuario agregado correctamente. Contraseña temporal: $password";
            } catch (Exception $e) {
                $mensaje = "❌ Error al agregar usuario: " . $e->getMessage();
            }
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
        .header { background: #1e3d6f; color: white; padding: 20px; }
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
        input, select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box; }
        .mensaje { padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .nav { background: #e9ecef; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .nav a { margin-right: 15px; color: #2c5aa0; text-decoration: none; }
    </style>
</head>
<body>
    <div class="header">
        <h1>👥 Gestión de Socios - Club de Montana</h1>
        <div>
            <a href="dashboard.php" style="color: white;">← Volver al Dashboard</a>
            <span style="margin: 0 15px;">|</span>
            <a href="logout.php" style="color: white;">Cerrar Sesión</a>
        </div>
    </div>

    <div class="container">
        <?php if ($mensaje): ?>
            <div class="mensaje <?php echo strpos($mensaje, '✅') !== false ? 'success' : 'error'; ?>">
                <?php echo htmlspecialchars($mensaje); ?>
            </div>
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
                        <label for="nombres">Nombres *</label>
                        <input type="text" id="nombres" name="nombres" required>
                    </div>
                    <div class="form-group">
                        <label for="apellidos">Apellidos *</label>
                        <input type="text" id="apellidos" name="apellidos" required>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div class="form-group">
                        <label for="email">Email *</label>
                        <input type="email" id="email" name="email" required>
                    </div>
                    <div class="form-group">
                        <label for="rut">RUT</label>
                        <input type="text" id="rut" name="rut" placeholder="12.345.678-9">
                    </div>
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

                <button type="submit" name="agregar_usuario" class="btn btn-success">➕ Agregar Socio</button>
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
                            <th>RUT</th>
                            <th>Rol</th>
                            <th>Estado</th>
                            <th>Fecha Ingreso</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($usuarios as $usuario): ?>
                        <tr>
                            <td><?php echo htmlspecialchars($usuario['nombres'] . ' ' . $usuario['apellidos']); ?></td>
                            <td><?php echo htmlspecialchars($usuario['email']); ?></td>
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
