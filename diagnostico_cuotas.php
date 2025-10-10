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

echo "<h2>🔍 Diagnóstico del Sistema de Cuotas</h2>";

try {
    // Verificar tablas
    echo "<h3>📊 Tablas existentes:</h3>";
    $stmt = $db->query("SELECT name FROM sqlite_master WHERE type='table'");
    $tablas = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "<pre>" . print_r($tablas, true) . "</pre>";
    
    // Verificar años habilitados
    echo "<h3>📅 Años habilitados:</h3>";
    $stmt = $db->query("SELECT * FROM cuotas_anuales");
    $anos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "<pre>" . print_r($anos, true) . "</pre>";
    
    // Verificar cuotas mensuales
    echo "<h3>💰 Cuotas mensuales:</h3>";
    $stmt = $db->query("SELECT COUNT(*) as total FROM cuotas_mensuales");
    $total_cuotas = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Total cuotas: " . $total_cuotas['total'] . "<br>";
    
    $stmt = $db->query("SELECT año, COUNT(*) as cantidad FROM cuotas_mensuales GROUP BY año");
    $cuotas_por_ano = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "<pre>" . print_r($cuotas_por_ano, true) . "</pre>";
    
    // Verificar usuarios activos
    echo "<h3>👥 Usuarios activos:</h3>";
    $stmt = $db->query("SELECT id, nombres, apellidos, tipo_miembro FROM usuarios WHERE estado = 'activo' AND rol != 'admin'");
    $usuarios = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "<pre>" . print_r($usuarios, true) . "</pre>";
    
} catch (Exception $e) {
    echo "<p style='color: red;'>❌ Error: " . $e->getMessage() . "</p>";
}

echo "<br><a href='cuotas.php'>← Volver a Cuotas</a>";
?>
