<?php
// Header consistente para todas las páginas
if (!isset($_SESSION)) {
    session_start();
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
    <!-- Logo y nombre del sistema -->
    <div style="display: flex; align-items: center; gap: 15px;">
        <a href="dashboard.php" style="text-decoration: none; color: white; display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 24px;">🏔️</span>
            <h1 style="margin: 0; font-size: 20px; font-weight: bold;">Club Montana Collipulli</h1>
        </a>
    </div>

    <!-- Información del usuario -->
    <div style="display: flex; align-items: center; gap: 20px;">
        <?php if (isset($_SESSION['usuario_id'])): ?>
            <!-- Notificaciones (placeholder) -->
            <div style="position: relative;">
                <span style="font-size: 18px; cursor: pointer;">🔔</span>
                <span style="
                    position: absolute; 
                    top: -5px; 
                    right: -5px; 
                    background: #ff4757; 
                    color: white; 
                    border-radius: 50%; 
                    width: 16px; 
                    height: 16px; 
                    font-size: 10px; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center;
                ">3</span>
            </div>

            <!-- Información del usuario -->
            <div style="display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.1); padding: 8px 15px; border-radius: 25px;">
                <div style="
                    width: 35px; 
                    height: 35px; 
                    background: #2c5aa0; 
                    border-radius: 50%; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center;
                    font-weight: bold;
                    font-size: 14px;
                ">
                    <?php 
                    $nombres = $_SESSION['usuario_nombre'] ?? '';
                    $iniciales = '';
                    if (!empty($nombres)) {
                        $partes = explode(' ', $nombres);
                        $iniciales = strtoupper(substr($partes[0], 0, 1) . (isset($partes[1]) ? substr($partes[1], 0, 1) : ''));
                    } else {
                        $iniciales = 'U';
                    }
                    echo $iniciales;
                    ?>
                </div>
                <div>
                    <div style="font-weight: bold; font-size: 14px;"><?php echo htmlspecialchars($_SESSION['usuario_nombre'] ?? 'Usuario'); ?></div>
                    <div style="font-size: 12px; opacity: 0.8;">
                        <span style="
                            background: rgba(255,255,255,0.2); 
                            padding: 2px 8px; 
                            border-radius: 10px; 
                            font-size: 10px;
                        ">
                            <?php echo htmlspecialchars($_SESSION['usuario_rol'] ?? 'miembro'); ?>
                        </span>
                    </div>
                </div>
            </div>

            <!-- Menú desplegable -->
            <div style="position: relative;">
                <button style="
                    background: none; 
                    border: none; 
                    color: white; 
                    font-size: 18px; 
                    cursor: pointer; 
                    padding: 5px;
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
                    <a href="perfil.php" style="
                        display: block; 
                        padding: 12px 15px; 
                        text-decoration: none; 
                        color: #333; 
                        border-bottom: 1px solid #eee;
                        font-size: 14px;
                    ">👤 Mi Perfil</a>
                    <a href="dashboard.php" style="
                        display: block; 
                        padding: 12px 15px; 
                        text-decoration: none; 
                        color: #333; 
                        border-bottom: 1px solid #eee;
                        font-size: 14px;
                    ">📊 Dashboard</a>
                    <a href="logout.php" style="
                        display: block; 
                        padding: 12px 15px; 
                        text-decoration: none; 
                        color: #e74c3c; 
                        font-size: 14px;
                    ">🚪 Cerrar Sesión</a>
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
            <!-- Si no está logueado -->
            <a href="login.php" style="color: white; text-decoration: none; background: #2c5aa0; padding: 8px 15px; border-radius: 5px;">Iniciar Sesión</a>
        <?php endif; ?>
    </div>
</header>

<style>
    #userMenu a:hover {
        background: #f8f9fa;
    }
</style>
