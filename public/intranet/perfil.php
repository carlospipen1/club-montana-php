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
$mensaje_tipo = ''; // success, error, warning
$usuario_actual = [];

// Obtener datos del usuario actual
try {
    $stmt = $db->prepare("SELECT * FROM usuarios WHERE id = ?");
    $stmt->execute([$_SESSION['usuario_id']]);
    $usuario_actual = $stmt->fetch(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    $mensaje = "Error al cargar perfil: " . $e->getMessage();
    $mensaje_tipo = 'error';
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
        $mensaje_tipo = 'success';
        
        // Recargar datos del usuario
        $stmt = $db->prepare("SELECT * FROM usuarios WHERE id = ?");
        $stmt->execute([$_SESSION['usuario_id']]);
        $usuario_actual = $stmt->fetch(PDO::FETCH_ASSOC);
        
    } catch (Exception $e) {
        $mensaje = "❌ Error al actualizar contacto: " . $e->getMessage();
        $mensaje_tipo = 'error';
    }
}

// Procesar cambio de contraseña
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['cambiar_password'])) {
    $password_actual = $_POST['password_actual'] ?? '';
    $nueva_password = $_POST['nueva_password'] ?? '';
    $confirmar_password = $_POST['confirmar_password'] ?? '';
    
    // Validaciones
    if (empty($password_actual) || empty($nueva_password) || empty($confirmar_password)) {
        $mensaje = "❌ Todos los campos de contraseña son obligatorios";
        $mensaje_tipo = 'error';
    } elseif ($nueva_password !== $confirmar_password) {
        $mensaje = "❌ Las nuevas contraseñas no coinciden";
        $mensaje_tipo = 'error';
    } elseif (strlen($nueva_password) < 6) {
        $mensaje = "❌ La nueva contraseña debe tener al menos 6 caracteres";
        $mensaje_tipo = 'error';
    } else {
        try {
            // Verificar contraseña actual
            if (!password_verify($password_actual, $usuario_actual['password_hash'])) {
                $mensaje = "❌ La contraseña actual es incorrecta";
                $mensaje_tipo = 'error';
            } else {
                // Actualizar contraseña
                $nueva_password_hash = password_hash($nueva_password, PASSWORD_DEFAULT);
                $stmt = $db->prepare("UPDATE usuarios SET password_hash = ? WHERE id = ?");
                $stmt->execute([$nueva_password_hash, $_SESSION['usuario_id']]);
                
                $mensaje = "✅ Contraseña actualizada correctamente";
                $mensaje_tipo = 'success';
                
                // Notificar al usuario
                $db->prepare("INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, enlace) VALUES (?, 'sistema', '🔒 Contraseña actualizada', 'Tu contraseña ha sido cambiada exitosamente', 'perfil.php')")
                   ->execute([$_SESSION['usuario_id']]);
            }
        } catch (Exception $e) {
            $mensaje = "❌ Error al cambiar contraseña: " . $e->getMessage();
            $mensaje_tipo = 'error';
        }
    }
}

// Tipos de miembro
$tipos_miembro = [
    'general' => '🎓 Miembro General',
    'estudiante' => '📚 Estudiante'
];
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
        .btn-success { background: #28a745; }
        .btn-danger { background: #dc3545; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input, select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box; }
        .mensaje { padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .warning { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
        .contacto-section, .password-section { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
        .tab-container { margin-bottom: 20px; }
        .tabs { display: flex; border-bottom: 2px solid #2c5aa0; margin-bottom: 20px; }
        .tab { padding: 12px 20px; background: #f8f9fa; border: none; border-bottom: 2px solid transparent; cursor: pointer; font-size: 14px; }
        .tab.active { background: white; border-bottom: 2px solid #2c5aa0; font-weight: bold; color: #2c5aa0; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .tipo-badge {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            color: white;
        }
        .tipo-general { background: #007bff; }
        .tipo-estudiante { background: #28a745; }
        .cuota-info {
            background: #e7f3ff;
            padding: 15px;
            border-radius: 5px;
            margin: 10px 0;
            border-left: 4px solid #007bff;
        }
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
            <div class="mensaje <?php echo $mensaje_tipo; ?>">
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

                <!-- Pestañas -->
                <div class="tab-container">
                    <div class="tabs">
                        <button class="tab active" onclick="openTab('info')">📋 Información Personal</button>
                        <button class="tab" onclick="openTab('contacto')">🆘 Contacto Emergencia</button>
                        <button class="tab" onclick="openTab('password')">🔒 Cambiar Contraseña</button>
                    </div>

                    <!-- Pestaña: Información Personal -->
                    <div id="info" class="tab-content active">
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
                                <div class="label">Tipo de Miembro</div>
                                <div class="value">
                                    <span class="tipo-badge tipo-<?php echo $usuario_actual['tipo_miembro']; ?>">
                                        <?php 
                                        if ($usuario_actual['tipo_miembro'] === 'estudiante') {
                                            echo '📚 Estudiante';
                                        } else {
                                            echo '🎓 Miembro General';
                                        }
                                        ?>
                                    </span>
                                </div>
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

                        <!-- Información de cuotas según tipo de miembro -->
                        <div class="cuota-info">
                            <h4>💰 Información de Cuotas</h4>
                            <p>
                                <?php if ($usuario_actual['tipo_miembro'] === 'estudiante'): ?>
                                    <strong>Tarifa Estudiantil:</strong> $3.000 CLP mensuales<br>
                                    <small>Como estudiante, tienes un descuento especial en las cuotas del club.</small>
                                <?php else: ?>
                                    <strong>Tarifa General:</strong> $5.000 CLP mensuales<br>
                                    <small>Tarifa estándar para miembros generales del club.</small>
                                <?php endif; ?>
                            </p>
                            <p style="margin-top: 10px; font-size: 14px; color: #666;">
                                💡 <em>El tipo de miembro puede ser actualizado por un administrador si cambia tu situación.</em>
                            </p>
                        </div>
                    </div>

                    <!-- Pestaña: Contacto de Emergencia -->
                    <div id="contacto" class="tab-content">
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

                    <!-- Pestaña: Cambiar Contraseña -->
                    <div id="password" class="tab-content">
                        <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
                            <strong>🔒 Seguridad de la Cuenta</strong>
                            <p style="margin: 5px 0 0 0; font-size: 14px;">
                                Cambia tu contraseña regularmente para mantener tu cuenta segura.
                            </p>
                        </div>

                        <form method="POST">
                            <div class="form-group password-toggle">
                                <label for="password_actual">Contraseña Actual *</label>
                                <input type="password" id="password_actual" name="password_actual" required>
                                <button type="button" class="toggle-password" onclick="togglePassword('password_actual')">👁️</button>
                            </div>

                            <div class="form-group password-toggle">
                                <label for="nueva_password">Nueva Contraseña *</label>
                                <input type="password" id="nueva_password" name="nueva_password" required 
                                       oninput="checkPasswordStrength(this.value)">
                                <button type="button" class="toggle-password" onclick="togglePassword('nueva_password')">👁️</button>
                                <div id="password-strength" class="password-strength"></div>
                            </div>

                            <div class="form-group password-toggle">
                                <label for="confirmar_password">Confirmar Nueva Contraseña *</label>
                                <input type="password" id="confirmar_password" name="confirmar_password" required>
                                <button type="button" class="toggle-password" onclick="togglePassword('confirmar_password')">👁️</button>
                            </div>

                            <div style="background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 15px 0;">
                                <strong>💡 Recomendaciones de Seguridad:</strong>
                                <ul style="margin: 5px 0 0 0; font-size: 14px;">
                                    <li>Mínimo 6 caracteres</li>
                                    <li>Combina letras, números y símbolos</li>
                                    <li>No uses información personal fácil de adivinar</li>
                                    <li>Usa una contraseña única para esta cuenta</li>
                                </ul>
                            </div>

                            <button type="submit" name="cambiar_password" class="btn btn-success">🔒 Cambiar Contraseña</button>
                        </form>
                    </div>
                </div>
            </div>
        <?php else: ?>
            <div class="card">
                <p style="color: red;">Error al cargar el perfil.</p>
            </div>
        <?php endif; ?>
    </div>

    <script>
        // Sistema de pestañas
        function openTab(tabName) {
            // Ocultar todos los contenidos de pestañas
            const tabContents = document.getElementsByClassName('tab-content');
            for (let i = 0; i < tabContents.length; i++) {
                tabContents[i].classList.remove('active');
            }

            // Desactivar todos los botones de pestañas
            const tabs = document.getElementsByClassName('tab');
            for (let i = 0; i < tabs.length; i++) {
                tabs[i].classList.remove('active');
            }

            // Mostrar la pestaña específica y activar el botón
            document.getElementById(tabName).classList.add('active');
            event.currentTarget.classList.add('active');
        }

        // Mostrar/ocultar contraseña
        function togglePassword(inputId) {
            const input = document.getElementById(inputId);
            const button = event.target;
            
            if (input.type === 'password') {
                input.type = 'text';
                button.textContent = '🙈';
            } else {
                input.type = 'password';
                button.textContent = '👁️';
            }
        }

        // Verificar fortaleza de contraseña
        function checkPasswordStrength(password) {
            const strengthElement = document.getElementById('password-strength');
            let strength = '';
            let strengthClass = '';

            if (password.length === 0) {
                strength = '';
            } else if (password.length < 6) {
                strength = 'Débil - Mínimo 6 caracteres';
                strengthClass = 'strength-weak';
            } else if (password.length < 8) {
                strength = 'Media';
                strengthClass = 'strength-medium';
            } else {
                // Verificar complejidad
                const hasUpperCase = /[A-Z]/.test(password);
                const hasLowerCase = /[a-z]/.test(password);
                const hasNumbers = /\d/.test(password);
                const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

                const complexity = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecial].filter(Boolean).length;

                if (complexity >= 3) {
                    strength = 'Fuerte';
                    strengthClass = 'strength-strong';
                } else if (complexity >= 2) {
                    strength = 'Media';
                    strengthClass = 'strength-medium';
                } else {
                    strength = 'Débil - Usa mayúsculas, números y símbolos';
                    strengthClass = 'strength-weak';
                }
            }

            strengthElement.textContent = strength;
            strengthElement.className = 'password-strength ' + strengthClass;
        }

        // Validación de formulario de contraseña
        document.querySelector('form[name="cambiar_password"]').addEventListener('submit', function(e) {
            const nuevaPassword = document.getElementById('nueva_password').value;
            const confirmarPassword = document.getElementById('confirmar_password').value;

            if (nuevaPassword !== confirmarPassword) {
                e.preventDefault();
                alert('Las contraseñas no coinciden');
                return false;
            }

            if (nuevaPassword.length < 6) {
                e.preventDefault();
                alert('La contraseña debe tener al menos 6 caracteres');
                return false;
            }
        });
    </script>
</body>
</html>
