import sqlite3

# Connect to database
conn = sqlite3.connect('elevator_company.db')
cursor = conn.cursor()

# Drop table if exists
cursor.execute("DROP TABLE IF EXISTS audit_logs")

# Create audit_logs table
cursor.execute("""
CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username VARCHAR(100),
    user_role VARCHAR(50),
    session_id VARCHAR(100),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id INTEGER,
    entity_name VARCHAR(255),
    old_values TEXT,
    new_values TEXT,
    changed_fields TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_method VARCHAR(10),
    request_url VARCHAR(500),
    request_parameters TEXT,
    audit_level VARCHAR(20) DEFAULT 'medium',
    category VARCHAR(50),
    subcategory VARCHAR(50),
    is_successful BOOLEAN DEFAULT 1,
    error_message TEXT,
    error_code VARCHAR(50),
    description TEXT,
    metadata TEXT,
    tags TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    duration_ms INTEGER,
    contains_pii BOOLEAN DEFAULT 0,
    contains_financial BOOLEAN DEFAULT 0,
    retention_period_days INTEGER DEFAULT 2555,
    compliance_tags TEXT,
    is_exported BOOLEAN DEFAULT 0,
    export_timestamp DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
)
""")

# Create indexes
cursor.execute("CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp)")
cursor.execute("CREATE INDEX idx_audit_user_id ON audit_logs(user_id)")
cursor.execute("CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id)")
cursor.execute("CREATE INDEX idx_audit_action ON audit_logs(action)")
cursor.execute("CREATE INDEX idx_audit_category ON audit_logs(category)")
cursor.execute("CREATE INDEX idx_audit_level ON audit_logs(audit_level)")
cursor.execute("CREATE INDEX idx_audit_ip ON audit_logs(ip_address)")
cursor.execute("CREATE INDEX idx_audit_session ON audit_logs(session_id)")

conn.commit()
conn.close()

print("audit_logs table created successfully!")
