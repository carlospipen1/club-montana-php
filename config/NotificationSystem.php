<?php
class NotificationSystem {
    private $db;

    public function __construct($database) {
        $this->db = $database;
    }

    // Crear notificación
    public function create($usuario_id, $tipo, $titulo, $mensaje, $enlace = null) {
        $stmt = $this->db->prepare("INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, enlace) VALUES (?, ?, ?, ?, ?)");
        return $stmt->execute([$usuario_id, $tipo, $titulo, $mensaje, $enlace]);
    }

    // Obtener notificaciones no leídas
    public function getUnread($usuario_id) {
        $stmt = $this->db->prepare("SELECT * FROM notificaciones WHERE usuario_id = ? AND leida = 0 ORDER BY fecha_creacion DESC");
        $stmt->execute([$usuario_id]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Marcar como leída
    public function markAsRead($notificacion_id) {
        $stmt = $this->db->prepare("UPDATE notificaciones SET leida = 1 WHERE id = ?");
        return $stmt->execute([$notificacion_id]);
    }

    // Notificaciones específicas del sistema
    public function notifyNewEquipment($equipo_nombre) {
        // Notificar a todos los usuarios sobre nuevo equipo
        $usuarios = $this->db->query("SELECT id FROM usuarios WHERE estado = 'activo'")->fetchAll(PDO::FETCH_COLUMN);
        
        foreach ($usuarios as $usuario_id) {
            $this->create(
                $usuario_id,
                'equipo',
                '🎒 Nuevo equipo disponible',
                "Se ha agregado '$equipo_nombre' al inventario del club",
                'equipos.php'
            );
        }
    }

    public function notifyUpcomingTrip($salida_nombre, $fecha_salida) {
        // Notificar a usuarios inscritos 1 día antes
        $stmt = $this->db->prepare("
            SELECT DISTINCT u.id 
            FROM usuarios u 
            JOIN inscripciones_salidas i ON u.id = i.usuario_id 
            JOIN salidas s ON i.salida_id = s.id 
            WHERE s.nombre = ? AND s.fecha_salida = DATE(?, '+1 day')
        ");
        $stmt->execute([$salida_nombre, $fecha_salida]);
        $usuarios = $stmt->fetchAll(PDO::FETCH_COLUMN);

        foreach ($usuarios as $usuario_id) {
            $this->create(
                $usuario_id,
                'salida',
                '🏔️ Recordatorio de salida',
                "Mañana es la salida: $salida_nombre. ¡Prepárate!",
                'salidas.php'
            );
        }
    }

    public function notifyPaymentReminder($usuario_id, $mes) {
        $this->create(
            $usuario_id,
            'cuota',
            '💰 Recordatorio de pago',
            "Tu cuota del mes $mes vence pronto. Por favor regulariza tu situación.",
            'cuotas.php'
        );
    }
}
?>
