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

// Obtener datos del usuario actual
$usuario_actual = [];
try {
    $stmt = $db->prepare("SELECT * FROM usuarios WHERE id = ?");
    $stmt->execute([$_SESSION['usuario_id']]);
    $usuario_actual = $stmt->fetch(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    $error = "Error al cargar perfil: " . $e->getMessage();
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

                <?php if (!empty($usuario_actual['contacto_emergencia_nombre'])): ?>
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                    <h3>🆘 Contacto de Emergencia</h3>
                    <div class="info-grid">
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
                </div>
                <?php endif; ?>
            </div>
        <?php else: ?>
            <div class="card">
                <p style="color: red;">Error al cargar el perfil.</p>
            </div>
        <?php endif; ?>
    </div>
</body>
</html>
