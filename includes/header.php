<?php
// Header consistente para todas las páginas
if (!isset($_SESSION)) {
    session_start();
}

// Cargar notificaciones si el usuario está logueado
$num_notificaciones = 0;
if (isset($_SESSION['usuario_id'])) {
    try {
        require_once 'config/database.php';
        $database = new Database();
        $db = $database->getConnection();
        
        if ($db) {
            // Asegurar que la tabla existe
            $db->exec("CREATE TABLE IF NOT EXISTS notificaciones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuario_id INTEGER NOT NULL,
                tipo TEXT NOT NULL,
                titulo TEXT NOT NULL,
                mensaje TEXT NOT NULL,
                enlace TEXT,
                leida BOOLEAN DEFAULT 0,
                fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
            )");
            
            // Contar notificaciones no leídas
            $stmt = $db->prepare("SELECT COUNT(*) FROM notificaciones WHERE usuario_id = ? AND leida = 0");
            $stmt->execute([$_SESSION['usuario_id']]);
            $num_notificaciones = $stmt->fetchColumn();
        }
    } catch (Exception $e) {
        // Silenciar errores para no romper el header
        error_log("Error en header: " . $e->getMessage());
    }
}
?>
<header style="
    background: #1e3d6f; 
    color: white; 
    padding: 15px 20px; 
    display: flex; 
    justify-content: space-between; 
    align-items: center;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    position: sticky;
    top: 0;
    z-index: 1000;
">
    <!-- Logo -->
    <div>
        <a href="dashboard.php" style="text-decoration: none; color: white; display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 24px;">🏔️</span>
            <h1 style="margin: 0; font-size: 20px; font-weight: bold;">Club Montana</h1>
        </a>
    </div>

    <!-- Información del usuario -->
    <div style="display: flex; align-items: center; gap: 20px;">
        <?php if (isset($_SESSION['usuario_id'])): ?>
            
            <!-- NOTIFICACIONES SIMPLIFICADAS -->
            <div style="position: relative;">
                <a href="notificaciones.php" style="color: white; text-decoration: none; font-size: 18px; position: relative;">
                    🔔
                    <?php if ($num_notificaciones > 0): ?>
                    <span style="
                        position: absolute; 
                        top: -5px; 
                        right: -5px; 
                        background: #ff4757; 
                        color: white; 
                        border-radius: 50%; 
                        width: 18px; 
                        height: 18px; 
                        font-size: 11px; 
                        display: flex; 
                        align-items: center; 
                        justify-content: center;
                        font-weight: bold;
                    "><?php echo $num_notificaciones; ?></span>
                    <?php endif; ?>
                </a>
            </div>

            <!-- Información del usuario -->
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="
                    width: 40px; 
                    height: 40px; 
                    background: #2c5aa0; 
                    border-radius: 50%; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center;
                    font-weight: bold;
                    border: 2px solid white;
                ">
                    <?php 
                    $nombres = $_SESSION['usuario_nombre'] ?? '';
                    $iniciales = 'U';
                    if (!empty($nombres)) {
                        $partes = explode(' ', $nombres);
                        $iniciales = strtoupper(substr($partes[0], 0, 1) . (isset($partes[1]) ? substr($partes[1], 0, 1) : substr($partes[0], 1, 1)));
                    }
                    echo $iniciales;
                    ?>
                </div>
                <div>
                    <div style="font-weight: bold; font-size: 14px;"><?php echo htmlspecialchars($_SESSION['usuario_nombre'] ?? 'Usuario'); ?></div>
                    <div style="font-size: 12px; opacity: 0.8;">
                        <?php echo htmlspecialchars($_SESSION['usuario_rol'] ?? 'miembro'); ?>
                    </div>
                </div>
            </div>

            <!-- Menú simple -->
            <div style="position: relative;">
                <button style="
                    background: none; 
                    border: none; 
                    color: white; 
                    font-size: 16px; 
                    cursor: pointer; 
                    padding: 5px 10px;
                " onclick="toggleMenu()">▼</button>
                
                <div id="userMenu" style="
                    display: none; 
                    position: absolute; 
                    top: 100%; 
                    right: 0; 
                    background: white; 
                    color: #333; 
                    border-radius: 8px; 
                    box-shadow: 0 4px 15px rgba(0,0,0,0.2); 
                    min-width: 180px; 
                    z-index: 1001;
                    margin-top: 5px;
                ">
                    <a href="perfil.php" style="display: block; padding: 12px 15px; text-decoration: none; color: #333; border-bottom: 1px solid #eee;">👤 Mi Perfil</a>
                    <a href="dashboard.php" style="display: block; padding: 12px 15px; text-decoration: none; color: #333; border-bottom: 1px solid #eee;">📊 Dashboard</a>
                    <a href="notificaciones.php" style="display: block; padding: 12px 15px; text-decoration: none; color: #333; border-bottom: 1px solid #eee;">🔔 Notificaciones</a>
                    <a href="logout.php" style="display: block; padding: 12px 15px; text-decoration: none; color: #e74c3c;">🚪 Cerrar Sesión</a>
                </div>
            </div>

            <script>
                function toggleMenu() {
                    const menu = document.getElementById('userMenu');
                    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                }

                // Cerrar menú al hacer click fuera
                document.addEventListener('click', function(event) {
                    const menu = document.getElementById('userMenu');
                    const button = event.target.closest('button');
                    
                    if (!menu.contains(event.target) && !button) {
                        menu.style.display = 'none';
                    }
                });
            </script>

        <?php else: ?>
            <a href="login.php" style="color: white; text-decoration: none; background: #2c5aa0; padding: 8px 15px; border-radius: 5px;">Iniciar Sesión</a>
        <?php endif; ?>
    </div>
</header>

<style>
    #userMenu a:hover {
        background: #f8f9fa;
    }
</style>
