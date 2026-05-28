#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://127.0.0.1:8088/api}"
TMP_FILE="$(mktemp)"
USERNAME="smoke_$(date +%s)"
PASSWORD="smoke123"

cleanup() {
  rm -f "$TMP_FILE"
}
trap cleanup EXIT

echo '{"ok":true}' > "$TMP_FILE"

echo "[1/6] health"
curl -fsS "${API_BASE}/health" >/dev/null

echo "[2/6] signup"
SIGNUP_JSON="$(curl -fsS -X POST "${API_BASE}/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"${USERNAME}\",\"password\":\"${PASSWORD}\",\"role\":\"user\"}")"
TOKEN="$(printf '%s' "$SIGNUP_JSON" | jq -r '.accessToken')"
USER_ID="$(printf '%s' "$SIGNUP_JSON" | jq -r '.user.id')"

echo "[3/6] session"
curl -fsS -H "Authorization: Bearer ${TOKEN}" "${API_BASE}/auth/session" >/dev/null

echo "[4/6] data insert/query"
curl -fsS -X POST "${API_BASE}/data/emotion_diaries" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H 'Content-Type: application/json' \
  -d "{\"data\":{\"user_id\":\"${USER_ID}\",\"diary_date\":\"$(date +%F)\",\"emotion_level\":\"neutral\",\"content\":\"smoke\"},\"upsert\":true,\"onConflict\":\"user_id,diary_date\",\"single\":true}" \
  >/dev/null
curl -fsS -H "Authorization: Bearer ${TOKEN}" \
  "${API_BASE}/data/emotion_diaries?select=*&filters=%5B%7B%22op%22%3A%22eq%22%2C%22field%22%3A%22user_id%22%2C%22value%22%3A%22${USER_ID}%22%7D%5D&limit=1" \
  >/dev/null

echo "[5/6] storage upload/delete"
UPLOAD_JSON="$(curl -fsS -X POST "${API_BASE}/storage/knowledge-documents/upload" \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "path=smoke/${USERNAME}.json" \
  -F "file=@${TMP_FILE}")"
UPLOADED_PATH="$(printf '%s' "$UPLOAD_JSON" | jq -r '.data.path')"
curl -fsS "${API_BASE}/storage/public/knowledge-documents/${UPLOADED_PATH}" >/dev/null
curl -fsS -X DELETE "${API_BASE}/storage/knowledge-documents" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H 'Content-Type: application/json' \
  -d "{\"paths\":[\"${UPLOADED_PATH}\"]}" \
  >/dev/null

echo "[6/6] refresh"
curl -fsS -X POST "${API_BASE}/auth/refresh" -H "Authorization: Bearer ${TOKEN}" >/dev/null

echo "Smoke test passed for ${API_BASE}"
