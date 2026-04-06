CREATE TABLE IF NOT EXISTS raw_logs (
    id BIGSERIAL PRIMARY KEY,
    event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_ip VARCHAR(45),
    destination_ip VARCHAR(45),
    method VARCHAR(16),
    path TEXT,
    status_code INTEGER,
    bytes_sent BIGINT,
    user_agent TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_raw_logs_event_time ON raw_logs (event_time DESC);
CREATE INDEX IF NOT EXISTS idx_raw_logs_source_ip ON raw_logs (source_ip);

CREATE TABLE IF NOT EXISTS detections (
    id BIGSERIAL PRIMARY KEY,
    raw_log_id BIGINT REFERENCES raw_logs(id) ON DELETE CASCADE,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    model_name VARCHAR(64) NOT NULL,
    anomaly_score DOUBLE PRECISION NOT NULL,
    threat_score DOUBLE PRECISION NOT NULL,
    is_anomaly BOOLEAN NOT NULL,
    attack_type VARCHAR(64),
    reason TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_detections_detected_at ON detections (detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_detections_anomaly ON detections (is_anomaly, detected_at DESC);

CREATE TABLE IF NOT EXISTS alerts (
    id BIGSERIAL PRIMARY KEY,
    detection_id BIGINT REFERENCES detections(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    severity VARCHAR(16) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    acknowledged BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON alerts (acknowledged, created_at DESC);

CREATE TABLE IF NOT EXISTS model_metrics (
    id BIGSERIAL PRIMARY KEY,
    model_name VARCHAR(64) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    precision_score DOUBLE PRECISION,
    recall_score DOUBLE PRECISION,
    f1_score DOUBLE PRECISION,
    roc_auc DOUBLE PRECISION,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_model_metrics_model_name ON model_metrics (model_name, recorded_at DESC);

