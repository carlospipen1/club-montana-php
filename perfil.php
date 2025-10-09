<?php
session_start();
header('Content-Type: text/html; charset=utf-8');

if (!isset($_SESSION['usuario_id'])) {
    header('Location: login.php');
    exit;
}

require_once 'config/database.php';
$database = new Database();
$db = $database->getConnection();

$mensaje = '';
$usuario_actual = [];

// Obtener datos del usuario actual
try {
    $stmt = $db->prepare("SELECT * FROM usuarios WHERE id = ?");
    $stmt->execute([$_SESSION['usuario_id']]);
    $usuario_actual = $stmt->fetch(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    $error = "Error al cargar perfil: " . $e->getMessage();
}

// Procesar actualización de contacto de emergencia
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['actualizar_contacto'])) {
    $contacto_nombre = $_POST['contacto_nombre'] ?? '';
    $contacto_telefono = $_POST['contacto_telefono'] ?? '';
    $contacto_relacion = $_POST['contacto_relacion'] ?? '';
    
    try {
        $stmt = $db->prepare("UPDATE usuarios SET contacto_emergencia_nombre = ?, contacto_emergencia_telefono = ?, contacto_emergencia_relacion = ? WHERE id = ?");
        $stmt->execute([$contacto_nombre, $contacto_telefono, $contacto_relacion, $_SESSION['usuario_id']]);
        $mensaje = "✅ Contacto de emergencia actualizado correctamente";
        
        // Recargar datos del usuario
        $stmt = $db->prepare("SELECT * FROM usuarios WHERE id = ?");
        $stmt->execute([$_SESSION['usuario_id']]);
        $usuario_actual = $stmt->fetch(PDO::FETCH_ASSOC);
        
    } catch (Exception $e) {
        $mensaje = "❌ Error al actualizar contacto: " . $e->getMessage();
    }
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mi Perfil - Club de Montana</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; background: #f5f5f5; }
        .header { background: #1e3d6f; color: white; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .card { background: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .profile-header { text-align: center; margin-bottom: 30px; }
        .avatar { font-size: 80px; margin-bottom: 10px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .info-item { margin-bottom: 15px; }
        .label { font-weight: bold; color: #666; }
        .value { color: #333; }
        .btn { display: inline-block; padding: 10px 20px; background: #2c5aa0; color: white; text-decoration: none; border-radius: 5px; border: none; cursor: pointer; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input, select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box; }
        .mensaje { padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .contacto-section { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
    </style>
</head>
<body>
    <div class="header">
        <h1>👤 Mi Perfil - Club de Montana</h1>
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

        <?php if (!empty($usuario_actual)): ?>
            <div class="card">
                <div class="profile-header">
                    <div class="avatar">👤</div>
                    <h2><?php echo htmlspecialchars($usuario_actual['nombres'] . ' ' . $usuario_actual['apellidos']); ?></h2>
                    <p style="color: #666;"><?php echo htmlspecialchars($usuario_actual['email']); ?></p>
                </div>

                <div class="info-grid">
                    <div class="info-item">
                        <div class="label">RUT</div>
                        <div class="value"><?php echo htmlspecialchars($usuario_actual['rut'] ?? 'No registrado'); ?></div>
                    </div>
                    <div class="info-item">
                        <div class="label">Teléfono</div>
                        <div class="value"><?php echo htmlspecialchars($usuario_actual['telefono'] ?? 'No registrado'); ?></div>
                    </div>
                    <div class="info-item">
                        <div class="label">Rol en el Club</div>
                        <div class="value"><?php echo htmlspecialchars($usuario_actual['rol']); ?></div>
                    </div>
                    <div class="info-item">
                        <div class="label">Estado</div>
                        <div class="value" style="color: <?php echo $usuario_actual['estado'] === 'activo' ? 'green' : 'red'; ?>;">
                            ● <?php echo htmlspecialchars($usuario_actual['estado']); ?>
                        </div>
                    </div>
                    <div class="info-item">
                        <div class="label">Fecha de Ingreso</div>
                        <div class="value"><?php echo htmlspecialchars($usuario_actual['fecha_ingreso'] ?? 'No registrada'); ?></div>
                    </div>
                    <div class="info-item">
                        <div class="label">Miembro desde</div>
                        <div class="value"><?php echo htmlspecialchars($usuario_actual['fecha_creacion'] ?? 'No registrada'); ?></div>
                    </div>
                </div>

                <!-- Sección de Contacto de Emergencia -->
                <div class="contacto-section">
                    <h3>🆘 Contacto de Emergencia</h3>
                    
                    <?php if (!empty($usuario_actual['contacto_emergencia_nombre'])): ?>
                    <div class="info-grid" style="margin-bottom: 20px;">
                        <div class="info-item">
                            <div class="label">Nombre</div>
                            <div class="value"><?php echo htmlspecialchars($usuario_actual['contacto_emergencia_nombre']); ?></div>
                        </div>
                        <div class="info-item">
                            <div class="label">Teléfono</div>
                            <div class="value"><?php echo htmlspecialchars($usuario_actual['contacto_emergencia_telefono']); ?></div>
                        </div>
                        <div class="info-item">
                            <div class="label">Relación</div>
                            <div class="value"><?php echo htmlspecialchars($usuario_actual['contacto_emergencia_relacion']); ?></div>
                        </div>
                    </div>
                    <?php else: ?>
                    <p style="color: #666; margin-bottom: 20px;">No has registrado un contacto de emergencia.</p>
                    <?php endif; ?>

                    <!-- Formulario para agregar/editar contacto -->
                    <h4><?php echo empty($usuario_actual['contacto_emergencia_nombre']) ? 'Agregar' : 'Editar'; ?> Contacto de Emergencia</h4>
                    <form method="POST">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div class="form-group">
                                <label for="contacto_nombre">Nombre del Contacto *</label>
                                <input type="text" id="contacto_nombre" name="contacto_nombre" 
                                       value="<?php echo htmlspecialchars($usuario_actual['contacto_emergencia_nombre'] ?? ''); ?>" required>
                            </div>
                            <div class="form-group">
                                <label for="contacto_telefono">Teléfono *</label>
                                <input type="tel" id="contacto_telefono" name="contacto_telefono" 
                                       value="<?php echo htmlspecialchars($usuario_actual['contacto_emergencia_telefono'] ?? ''); ?>" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="contacto_relacion">Relación/Parentesco *</label>
                            <select id="contacto_relacion" name="contacto_relacion" required>
                                <option value="">Seleccionar relación</option>
                                <option value="Padre/Madre" <?php echo ($usuario_actual['contacto_emergencia_relacion'] ?? '') === 'Padre/Madre' ? 'selected' : ''; ?>>Padre/Madre</option>
                                <option value="Esposo/Esposa" <?php echo ($usuario_actual['contacto_emergencia_relacion'] ?? '') === 'Esposo/Esposa' ? 'selected' : ''; ?>>Esposo/Esposa</option>
                                <option value="Hijo/Hija" <?php echo ($usuario_actual['contacto_emergencia_relacion'] ?? '') === 'Hijo/Hija' ? 'selected' : ''; ?>>Hijo/Hija</option>
                                <option value="Hermano/Hermana" <?php echo ($usuario_actual['contacto_emergencia_relacion'] ?? '') === 'Hermano/Hermana' ? 'selected' : ''; ?>>Hermano/Hermana</option>
                                <option value="Amigo/Amiga" <?php echo ($usuario_actual['contacto_emergencia_relacion'] ?? '') === 'Amigo/Amiga' ? 'selected' : ''; ?>>Amigo/Amiga</option>
                                <option value="Otro" <?php echo ($usuario_actual['contacto_emergencia_relacion'] ?? '') === 'Otro' ? 'selected' : ''; ?>>Otro</option>
                            </select>
                        </div>
                        <button type="submit" name="actualizar_contacto" class="btn">💾 Guardar Contacto de Emergencia</button>
                    </form>
                </div>
            </div>
        <?php else: ?>
            <div class="card">
                <p style="color: red;">Error al cargar el perfil.</p>
            </div>
        <?php endif; ?>
    </div>
</body>
</html>
