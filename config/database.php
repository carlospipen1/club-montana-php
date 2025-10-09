<?php
class Database {
    public $conn;

    public function getConnection() {
        $this->conn = null;
        try {
            // SQLite - funciona inmediatamente
            $this->conn = new PDO("sqlite:club_montana.db");
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
        } catch(PDOException $exception) {
            echo "Error SQLite: " . $exception->getMessage();
        }
        return $this->conn;
    }

    // Crear todas las tablas del sistema
    public function installDatabase() {
        $sql = [
            "CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                rut TEXT UNIQUE,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                nombres TEXT NOT NULL,
                apellidos TEXT NOT NULL,
                telefono TEXT,
                fecha_ingreso DATE,
                contacto_emergencia_nombre TEXT,
                contacto_emergencia_telefono TEXT,
                contacto_emergencia_relacion TEXT,
                rol TEXT DEFAULT 'miembro',
                fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                estado TEXT DEFAULT 'activo'
            )",
            
            "CREATE TABLE IF NOT EXISTS roles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT UNIQUE NOT NULL,
                descripcion TEXT,
                nivel_permisos INTEGER DEFAULT 0
            )",
            
            "CREATE TABLE IF NOT EXISTS equipos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                categoria TEXT NOT NULL,
                nombre TEXT NOT NULL,
                descripcion TEXT,
                estado TEXT DEFAULT 'disponible',
                fecha_adquisicion DATE
            )",
            
            "CREATE TABLE IF NOT EXISTS salidas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                descripcion TEXT,
                fecha_salida DATETIME NOT NULL,
                fecha_limite_inscripcion DATETIME NOT NULL,
                lugar TEXT,
                encargado_id INTEGER,
                estado TEXT DEFAULT 'planificada'
            )",
            
            "CREATE TABLE IF NOT EXISTS cuotas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuario_id INTEGER NOT NULL,
                tipo TEXT NOT NULL,
                monto REAL NOT NULL,
                mes TEXT NOT NULL,
                estado TEXT DEFAULT 'pendiente',
                fecha_pago DATE,
                fecha_vencimiento DATE NOT NULL
            )"
        ];

        foreach ($sql as $query) {
            $this->conn->exec($query);
        }
        
        // Insertar datos básicos
        $this->insertInitialData();
    }

    private function insertInitialData() {
        // Insertar roles
        $roles = [
            ['admin', 'Administrador del sistema', 100],
            ['presidente', 'Presidente del club', 90],
            ['secretario', 'Secretario', 80],
            ['encargado_equipo', 'Encargado de equipo', 70],
            ['comision_tecnica', 'Comisión técnica', 60],
            ['miembro', 'Miembro general', 10]
        ];

        $stmt = $this->conn->prepare("INSERT OR IGNORE INTO roles (nombre, descripcion, nivel_permisos) VALUES (?, ?, ?)");
        foreach ($roles as $rol) {
            $stmt->execute($rol);
        }

        // Insertar usuario admin por defecto
        $stmt = $this->conn->prepare("INSERT OR IGNORE INTO usuarios (email, password_hash, nombres, apellidos, rol) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute(['admin@clubmontana.cl', password_hash('admin123', PASSWORD_DEFAULT), 'Administrador', 'Sistema', 'admin']);
    }
}
?>
