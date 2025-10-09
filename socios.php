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
    // Agregar nuevo usuario
    if (isset($_POST['agregar_usuario'])) {
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
    
    // Cambiar rol de usuario (solo admin)
    if (isset($_POST['cambiar_rol']) && $_SESSION['usuario_rol'] === 'admin') {
        $usuario_id = $_POST['usuario_id'] ?? '';
        $nuevo_rol = $_POST['nuevo_rol'] ?? '';
        
        if (!empty($usuario_id) && !empty($nuevo_rol)) {
            try {
                // Obtener información del usuario antes del cambio
                $stmt = $db->prepare("SELECT nombres, apellidos, rol FROM usuarios WHERE id = ?");
                $stmt->execute([$usuario_id]);
                $usuario = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($usuario) {
                    $rol_anterior = $usuario['rol'];
                    
                    // Actualizar rol
                    $stmt = $db->prepare("UPDATE usuarios SET rol = ? WHERE id = ?");
                    $stmt->execute([$nuevo_rol, $usuario_id]);
                    
                    $mensaje = "✅ Rol de {$usuario['nombres']} {$usuario['apellidos']} cambiado de '$rol_anterior' a '$nuevo_rol'";
                    
                    // Notificar al administrador
                    $db->prepare("INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, enlace) VALUES (?, 'sistema', '⚙️ Rol de usuario actualizado', 'Se cambió el rol de {$usuario['nombres']} {$usuario['apellidos']} de $rol_anterior a $nuevo_rol', 'socios.php')")
                       ->execute([$_SESSION['usuario_id']]);
                    
                    // Notificar al usuario afectado (si no es a sí mismo)
                    if ($usuario_id != $_SESSION['usuario_id']) {
                        $db->prepare("INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, enlace) VALUES (?, 'sistema', '🎭 Tu rol ha cambiado', 'Tu rol en el sistema ha sido cambiado a: $nuevo_rol', 'perfil.php')")
                           ->execute([$usuario_id]);
                    }
                }
            } catch (Exception $e) {
                $mensaje = "❌ Error al cambiar rol: " . $e->getMessage();
            }
        }
    }
    
    // Cambiar estado de usuario (solo admin)
    if (isset($_POST['cambiar_estado']) && $_SESSION['usuario_rol'] === 'admin') {
        $usuario_id = $_POST['usuario_id'] ?? '';
        $nuevo_estado = $_POST['nuevo_estado'] ?? '';
        
        if (!empty($usuario_id) && !empty($nuevo_estado)) {
            try {
                // Obtener información del usuario antes del cambio
                $stmt = $db->prepare("SELECT nombres, apellidos, estado FROM usuarios WHERE id = ?");
                $stmt->execute([$usuario_id]);
                $usuario = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($usuario) {
                    $estado_anterior = $usuario['estado'];
                    
                    // No permitir desactivarse a sí mismo
                    if ($usuario_id == $_SESSION['usuario_id'] && $nuevo_estado == 'inactivo') {
                        $mensaje = "❌ No puedes desactivar tu propia cuenta";
                    } else {
                        // Actualizar estado
                        $stmt = $db->prepare("UPDATE usuarios SET estado = ? WHERE id = ?");
                        $stmt->execute([$nuevo_estado, $usuario_id]);
                        
                        $mensaje = "✅ Estado de {$usuario['nombres']} {$usuario['apellidos']} cambiado de '$estado_anterior' a '$nuevo_estado'";
                        
                        // Notificar al administrador
                        $db->prepare("INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, enlace) VALUES (?, 'sistema', '🔔 Estado de usuario actualizado', 'Se cambió el estado de {$usuario['nombres']} {$usuario['apellidos']} de $estado_anterior a $nuevo_estado', 'socios.php')")
                           ->execute([$_SESSION['usuario_id']]);
                    }
                }
            } catch (Exception $e) {
                $mensaje = "❌ Error al cambiar estado: " . $e->getMessage();
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

// Definir roles disponibles
$roles_disponibles = [
    'miembro' => 'Miembro',
    'encargado_equipo' => 'Encargado de Equipo', 
    'comision_tecnica' => 'Comisión Técnica',
    'secretario' => 'Secretario',
    'presidente' => 'Presidente',
    'admin' => 'Administrador'
];
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestión de Socios - Club de Montana</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; background: #f5f5f5; }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .card { background: white; padding: 25px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: bold; }
        .btn { display: inline-block; padding: 8px 15px; background: #2c5aa0; color: white; text-decoration: none; border-radius: 5px; border: none; cursor: pointer; font-size: 12px; }
        .btn-sm { padding: 5px 10px; font-size: 11px; }
        .btn-success { background: #28a745; }
        .btn-warning { background: #ffc107; color: black; }
        .btn-danger { background: #dc3545; }
        .btn-info { background: #17a2b8; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        .required::after { content: " *"; color: #dc3545; }
        input, select { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box; font-size: 14px; }
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
        .admin-actions { display: flex; gap: 5px; flex-wrap: wrap; }
        .role-badge { 
            padding: 4px 8px; 
            border-radius: 12px; 
            font-size: 11px; 
            font-weight: bold; 
            color: white;
            cursor: pointer;
        }
        .modal { 
            display: none; 
            position: fixed; 
            z-index: 1000; 
            left: 0; 
            top: 0; 
            width: 100%; 
            height: 100%; 
            background-color: rgba(0,0,0,0.5); 
        }
        .modal-content { 
            background-color: white; 
            margin: 10% auto; 
            padding: 20px; 
            border-radius: 10px; 
            width: 400px; 
            max-width: 90%; 
        }
        .modal-header { 
            display: flex; 
            justify-content: between; 
            align-items: center; 
            margin-bottom: 15px; 
        }
        .close { 
            color: #aaa; 
            font-size: 24px; 
            font-weight: bold; 
            cursor: pointer; 
        }
        .close:hover { color: black; }
        .user-highlight { background-color: #f0f8ff; }
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
            <a href="#lista">📋 Lista de Socios (<?php echo count($usuarios); ?>)</a>
            <?php if ($_SESSION['usuario_rol'] === 'admin'): ?>
            <a href="#admin-tools">⚙️ Herramientas de Administración</a>
            <?php endif; ?>
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
                            <?php foreach ($roles_disponibles as $valor => $etiqueta): ?>
                                <option value="<?php echo $valor; ?>"><?php echo $etiqueta; ?></option>
                            <?php endforeach; ?>
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
            <h2>📋 Lista de Socios</h2>
            
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
                            <?php if ($_SESSION['usuario_rol'] === 'admin'): ?>
                            <th>Acciones</th>
                            <?php endif; ?>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($usuarios as $usuario): ?>
                        <tr class="<?php echo $usuario['id'] == $_SESSION['usuario_id'] ? 'user-highlight' : ''; ?>">
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
                                <span class="role-badge" style="background: 
                                    <?php echo match($usuario['rol']) {
                                        'admin' => '#dc3545',
                                        'presidente' => '#fd7e14', 
                                        'secretario' => '#20c997',
                                        'encargado_equipo' => '#6f42c1',
                                        'comision_tecnica' => '#0dcaf0',
                                        default => '#6c757d'
                                    }; ?>;"
                                    <?php if ($_SESSION['usuario_rol'] === 'admin' && $usuario['id'] != $_SESSION['usuario_id']): ?>
                                    onclick="abrirModalCambioRol(<?php echo $usuario['id']; ?>, '<?php echo $usuario['nombres'] . ' ' . $usuario['apellidos']; ?>', '<?php echo $usuario['rol']; ?>')"
                                    title="Click para cambiar rol"
                                    <?php endif; ?>
                                    >
                                    <?php echo htmlspecialchars($usuario['rol']); ?>
                                </span>
                            </td>
                            <td>
                                <span style="color: <?php echo $usuario['estado'] === 'activo' ? 'green' : 'red'; ?>;"
                                    <?php if ($_SESSION['usuario_rol'] === 'admin' && $usuario['id'] != $_SESSION['usuario_id']): ?>
                                    onclick="abrirModalCambioEstado(<?php echo $usuario['id']; ?>, '<?php echo $usuario['nombres'] . ' ' . $usuario['apellidos']; ?>', '<?php echo $usuario['estado']; ?>')"
                                    title="Click para cambiar estado"
                                    style="cursor: pointer;"
                                    <?php endif; ?>
                                    >
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
                            <?php if ($_SESSION['usuario_rol'] === 'admin'): ?>
                            <td>
                                <div class="admin-actions">
                                    <button class="btn btn-sm btn-info" 
                                            onclick="abrirModalCambioRol(<?php echo $usuario['id']; ?>, '<?php echo $usuario['nombres'] . ' ' . $usuario['apellidos']; ?>', '<?php echo $usuario['rol']; ?>')">
                                        🎭 Rol
                                    </button>
                                    <?php if ($usuario['id'] != $_SESSION['usuario_id']): ?>
                                    <button class="btn btn-sm btn-warning" 
                                            onclick="abrirModalCambioEstado(<?php echo $usuario['id']; ?>, '<?php echo $usuario['nombres'] . ' ' . $usuario['apellidos']; ?>', '<?php echo $usuario['estado']; ?>')">
                                        🔄 Estado
                                    </button>
                                    <?php endif; ?>
                                </div>
                            </td>
                            <?php endif; ?>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>

        <!-- Herramientas de administración -->
        <?php if ($_SESSION['usuario_rol'] === 'admin'): ?>
        <div class="card" id="admin-tools">
            <h2>⚙️ Herramientas de Administración</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                <div style="background: #e7f3ff; padding: 20px; border-radius: 8px;">
                    <h3>📊 Estadísticas de Usuarios</h3>
                    <?php
                    try {
                        $total_usuarios = count($usuarios);
                        $activos = array_filter($usuarios, fn($u) => $u['estado'] === 'activo');
                        $inactivos = array_filter($usuarios, fn($u) => $u['estado'] === 'inactivo');
                        
                        $roles_count = [];
                        foreach ($usuarios as $usuario) {
                            $rol = $usuario['rol'];
                            $roles_count[$rol] = ($roles_count[$rol] ?? 0) + 1;
                        }
                    ?>
                    <p><strong>Total:</strong> <?php echo $total_usuarios; ?> usuarios</p>
                    <p><strong>Activos:</strong> <?php echo count($activos); ?></p>
                    <p><strong>Inactivos:</strong> <?php echo count($inactivos); ?></p>
                    <div style="margin-top: 15px;">
                        <strong>Distribución por Roles:</strong>
                        <ul style="margin: 5px 0 0 0; font-size: 14px;">
                            <?php foreach ($roles_count as $rol => $count): ?>
                            <li><?php echo $roles_disponibles[$rol] ?? $rol; ?>: <?php echo $count; ?></li>
                            <?php endforeach; ?>
                        </ul>
                    </div>
                    <?php } catch (Exception $e) { ?>
                    <p>Error al cargar estadísticas</p>
                    <?php } ?>
                </div>
                
                <div style="background: #fff3cd; padding: 20px; border-radius: 8px;">
                    <h3>🔧 Acciones Rápidas</h3>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <a href="config_pruebas.php" class="btn">🧪 Configurar Usuarios de Prueba</a>
                        <button class="btn btn-info" onclick="exportarUsuarios()">📤 Exportar Lista de Usuarios</button>
                    </div>
                </div>
            </div>
        </div>
        <?php endif; ?>
    </div>

    <!-- Modal para cambiar rol -->
    <div id="modalRol" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>🎭 Cambiar Rol de Usuario</h3>
                <span class="close" onclick="cerrarModal('modalRol')">&times;</span>
            </div>
            <form method="POST" id="formCambioRol">
                <input type="hidden" name="usuario_id" id="usuario_id_rol">
                <div class="form-group">
                    <label>Usuario:</label>
                    <p id="nombre_usuario_rol" style="font-weight: bold; margin: 5px 0;"></p>
                </div>
                <div class="form-group">
                    <label for="nuevo_rol">Nuevo Rol:</label>
                    <select name="nuevo_rol" id="nuevo_rol" required>
                        <?php foreach ($roles_disponibles as $valor => $etiqueta): ?>
                            <option value="<?php echo $valor; ?>"><?php echo $etiqueta; ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button type="submit" name="cambiar_rol" class="btn btn-success">💾 Cambiar Rol</button>
                    <button type="button" class="btn btn-danger" onclick="cerrarModal('modalRol')">❌ Cancelar</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Modal para cambiar estado -->
    <div id="modalEstado" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>🔄 Cambiar Estado de Usuario</h3>
                <span class="close" onclick="cerrarModal('modalEstado')">&times;</span>
            </div>
            <form method="POST" id="formCambioEstado">
                <input type="hidden" name="usuario_id" id="usuario_id_estado">
                <div class="form-group">
                    <label>Usuario:</label>
                    <p id="nombre_usuario_estado" style="font-weight: bold; margin: 5px 0;"></p>
                </div>
                <div class="form-group">
                    <label for="nuevo_estado">Nuevo Estado:</label>
                    <select name="nuevo_estado" id="nuevo_estado" required>
                        <option value="activo">Activo</option>
                        <option value="inactivo">Inactivo</option>
                    </select>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button type="submit" name="cambiar_estado" class="btn btn-success">💾 Cambiar Estado</button>
                    <button type="button" class="btn btn-danger" onclick="cerrarModal('modalEstado')">❌ Cancelar</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        // Funciones para los modales
        function abrirModalCambioRol(usuarioId, nombreUsuario, rolActual) {
            document.getElementById('usuario_id_rol').value = usuarioId;
            document.getElementById('nombre_usuario_rol').textContent = nombreUsuario + ' (Rol actual: ' + rolActual + ')';
            document.getElementById('nuevo_rol').value = rolActual;
            document.getElementById('modalRol').style.display = 'block';
        }

        function abrirModalCambioEstado(usuarioId, nombreUsuario, estadoActual) {
            document.getElementById('usuario_id_estado').value = usuarioId;
            document.getElementById('nombre_usuario_estado').textContent = nombreUsuario + ' (Estado actual: ' + estadoActual + ')';
            document.getElementById('nuevo_estado').value = estadoActual;
            document.getElementById('modalEstado').style.display = 'block';
        }

        function cerrarModal(modalId) {
            document.getElementById(modalId).style.display = 'none';
        }

        // Cerrar modal al hacer click fuera
        window.onclick = function(event) {
            if (event.target.classList.contains('modal')) {
                event.target.style.display = 'none';
            }
        }

        // Exportar usuarios (función de ejemplo)
        function exportarUsuarios() {
            alert('📤 Función de exportación en desarrollo. Por ahora puedes copiar la tabla manualmente.');
        }

        // Copiar contraseña
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
</body>
</html>
