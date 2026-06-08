<?php
function createNotificationsTable($db) {
    $db->exec("CREATE TABLE IF NOT EXISTS notificaciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        tipo TEXT NOT NULL, -- 'equipo', 'salida', 'cuota', 'sistema'
        titulo TEXT NOT NULL,
        mensaje TEXT NOT NULL,
        enlace TEXT, -- URL a la acción relacionada
        leida BOOLEAN DEFAULT 0,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )");
}
?>
