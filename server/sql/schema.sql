-- MineScript adatbázisséma (MySQL 8.0+)
-- Az adatbázist a setupDb szkript hozza létre, ezért itt nem szerepel CREATE DATABASE.

CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username      VARCHAR(24) NOT NULL,
  username_lower VARCHAR(24) NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username_lower (username_lower)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS maps (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_id    INT UNSIGNED NULL,
  name        VARCHAR(80) NOT NULL,
  description VARCHAR(500) NOT NULL DEFAULT '',
  data        TEXT NOT NULL,
  width       TINYINT UNSIGNED NOT NULL,
  height      TINYINT UNSIGNED NOT NULL,
  gold_count  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_public   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_maps_owner (owner_id),
  KEY idx_maps_public (is_public),
  KEY idx_maps_public_updated (is_public, updated_at),
  KEY idx_maps_owner_updated (owner_id, updated_at),
  CONSTRAINT fk_maps_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS runs (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  map_id         INT UNSIGNED NOT NULL,
  user_id        INT UNSIGNED NOT NULL,
  program_source TEXT NOT NULL,
  gold           SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  steps          INT UNSIGNED NOT NULL DEFAULT 0,
  error_code     VARCHAR(48) NULL,
  error_line     INT UNSIGNED NULL,
  error_message  VARCHAR(500) NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_runs_map_score (map_id, gold DESC, steps ASC),
  KEY idx_runs_map_user_score (map_id, user_id, gold DESC, steps ASC, created_at ASC, id ASC),
  KEY idx_runs_user_created (user_id, created_at DESC),
  CONSTRAINT fk_runs_map FOREIGN KEY (map_id) REFERENCES maps (id) ON DELETE CASCADE,
  CONSTRAINT fk_runs_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
