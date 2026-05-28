#!/usr/bin/env bash
set -euo pipefail

MYSQL_USER="${MYSQL_ADMIN_USER:-debian-sys-maint}"
MYSQL_PASSWORD="${MYSQL_ADMIN_PASSWORD:-nMWjQvu7wTEJmc50}"
APP_DB="${APP_DB_NAME:-xinyu_care}"
APP_USER="${APP_DB_USER:-xinyu_care}"
APP_PASSWORD="${APP_DB_PASSWORD:-xinyu_care_dev}"

mysql -u"${MYSQL_USER}" -p"${MYSQL_PASSWORD}" <<SQL
CREATE DATABASE IF NOT EXISTS \`${APP_DB}\`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${APP_USER}'@'localhost' IDENTIFIED BY '${APP_PASSWORD}';
CREATE USER IF NOT EXISTS '${APP_USER}'@'127.0.0.1' IDENTIFIED BY '${APP_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${APP_DB}\`.* TO '${APP_USER}'@'localhost';
GRANT ALL PRIVILEGES ON \`${APP_DB}\`.* TO '${APP_USER}'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL

echo "MySQL backend database and user are ready."
