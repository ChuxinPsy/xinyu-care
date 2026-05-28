#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://127.0.0.1:8088/api}"
FRONT_BASE="${FRONT_BASE:-http://127.0.0.1:5175}"
TMP_DIR="$(mktemp -d)"
USER_NAME="fsu$(date +%s)"
DOCTOR_NAME="fsd$(date +%s)"
PASSWORD="codex123"
TODAY="$(date +%F)"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

json() {
  jq -e "$1" >/dev/null
}

api_get() {
  curl -fsS "$@"
}

api_post_json() {
  curl -fsS "$1" \
    -H 'Content-Type: application/json' \
    "${@:2}"
}

echo "[1/13] backend/frontend health"
api_get "${API_BASE}/health" | json '.ok == true'
api_get "${FRONT_BASE}/api/health" | json '.ok == true'

echo "[2/13] user signup/login/session/profile"
USER_SIGNUP="$(curl -fsS -X POST "${API_BASE}/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"${USER_NAME}\",\"password\":\"${PASSWORD}\",\"role\":\"user\"}")"
printf '%s' "$USER_SIGNUP" | json '.accessToken != null and .user.id != null'
USER_TOKEN="$(printf '%s' "$USER_SIGNUP" | jq -r '.accessToken')"
USER_ID="$(printf '%s' "$USER_SIGNUP" | jq -r '.user.id')"
printf '%s' "$USER_SIGNUP" | json '.profile.username != null'

USER_LOGIN="$(curl -fsS -X POST "${API_BASE}/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"usernameOrEmail\":\"${USER_NAME}\",\"password\":\"${PASSWORD}\"}")"
printf '%s' "$USER_LOGIN" | json '.accessToken != null'

curl -fsS "${API_BASE}/auth/session" -H "Authorization: Bearer ${USER_TOKEN}" | json '.profile.id != null'
curl -fsS -X POST "${API_BASE}/auth/refresh" -H "Authorization: Bearer ${USER_TOKEN}" | json '.accessToken != null'
curl -fsS -X PATCH "${API_BASE}/data/profiles" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d "{\"data\":{\"full_name\":\"全链路用户\",\"bio\":\"integration test\",\"phone\":\"13800000000\"},\"filters\":[{\"op\":\"eq\",\"field\":\"id\",\"value\":\"${USER_ID}\"}],\"single\":true}" \
  | json '.data.full_name == "全链路用户"'

echo "[3/13] diary + wearable data"
DIARY_JSON="$(curl -fsS -X POST "${API_BASE}/data/emotion_diaries" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d "{\"data\":{\"user_id\":\"${USER_ID}\",\"diary_date\":\"${TODAY}\",\"emotion_level\":\"neutral\",\"title\":\"测试日记\",\"content\":\"今天感觉平稳\",\"tags\":[\"测试\"],\"ai_analysis\":{\"summary\":\"ok\"}},\"upsert\":true,\"onConflict\":\"user_id,diary_date\",\"single\":true}")"
DIARY_ID="$(printf '%s' "$DIARY_JSON" | jq -r '.data.id')"
printf '%s' "$DIARY_JSON" | json '.data.content == "今天感觉平稳"'
curl -fsS "${API_BASE}/data/emotion_diaries?select=*&filters=%5B%7B%22op%22%3A%22eq%22%2C%22field%22%3A%22id%22%2C%22value%22%3A%22${DIARY_ID}%22%7D%5D&limit=1" \
  -H "Authorization: Bearer ${USER_TOKEN}" | json '.data[0].id != null'

curl -fsS -X POST "${API_BASE}/data/wearable_data" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d "{\"data\":{\"user_id\":\"${USER_ID}\",\"record_date\":\"${TODAY}\",\"heart_rate\":72,\"sleep_hours\":7.5,\"steps\":8200,\"data_json\":{\"source\":\"band\"}},\"upsert\":true,\"onConflict\":\"user_id,record_date\",\"single\":true}" \
  | json '.data.heart_rate == 72'

echo "[4/13] storage upload/public/delete"
printf '{"kind":"diary","ok":true}\n' > "${TMP_DIR}/diary.json"
UPLOAD_JSON="$(curl -fsS -X POST "${API_BASE}/storage/diary-images/upload" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -F "path=tests/${USER_NAME}.json" \
  -F "file=@${TMP_DIR}/diary.json")"
UPLOAD_PATH="$(printf '%s' "$UPLOAD_JSON" | jq -r '.data.path')"
api_get "${API_BASE}/storage/public/diary-images/${UPLOAD_PATH}" >/dev/null
curl -fsS -X DELETE "${API_BASE}/storage/diary-images" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d "{\"paths\":[\"${UPLOAD_PATH}\"]}" | json '.ok == true'

echo "[5/13] healing content + favorites + meditation"
HEALING_ID="$(curl -fsS "${API_BASE}/data/healing_contents?select=*&filters=%5B%7B%22op%22%3A%22eq%22%2C%22field%22%3A%22is_active%22%2C%22value%22%3Atrue%7D%5D&limit=1" \
  -H "Authorization: Bearer ${USER_TOKEN}" | jq -r '.data[0].id')"
[ -n "${HEALING_ID}" ] && [ "${HEALING_ID}" != "null" ]
curl -fsS -X POST "${API_BASE}/rpc/increment_view_count" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d "{\"content_id\":\"${HEALING_ID}\"}" | json '.ok == true'
curl -fsS -X POST "${API_BASE}/data/user_favorites" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d "{\"data\":{\"user_id\":\"${USER_ID}\",\"content_id\":\"${HEALING_ID}\"},\"single\":true}" | json '.data.content_id != null'
curl -fsS -X POST "${API_BASE}/data/meditation_sessions" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d "{\"data\":{\"user_id\":\"${USER_ID}\",\"content_id\":\"${HEALING_ID}\",\"duration\":600,\"completed\":true,\"mood_before\":\"anxious\",\"mood_after\":\"calm\"},\"single\":true}" | json '.data.completed == true'

echo "[6/13] community posts/comments/likes"
CATEGORY_ID="$(curl -fsS "${API_BASE}/data/post_categories?select=*&limit=1" -H "Authorization: Bearer ${USER_TOKEN}" | jq -r '.data[0].id')"
POST_JSON="$(curl -fsS -X POST "${API_BASE}/data/community_posts" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d "{\"data\":{\"user_id\":\"${USER_ID}\",\"anonymous_name\":\"匿名测试\",\"title\":\"社区帖子\",\"content\":\"这里是帖子内容\",\"category_id\":\"${CATEGORY_ID}\",\"tags\":[\"测试\"]},\"single\":true}")"
POST_ID="$(printf '%s' "$POST_JSON" | jq -r '.data.id')"
curl -fsS -X POST "${API_BASE}/data/community_comments" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d "{\"data\":{\"post_id\":\"${POST_ID}\",\"user_id\":\"${USER_ID}\",\"anonymous_name\":\"匿名评论\",\"content\":\"评论内容\"},\"single\":true}" | json '.data.post_id != null'
curl -fsS -X POST "${API_BASE}/data/post_likes" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d "{\"data\":{\"post_id\":\"${POST_ID}\",\"user_id\":\"${USER_ID}\"},\"single\":true}" | json '.data.post_id != null'
curl -fsS "${API_BASE}/data/community_posts?select=*&filters=%5B%7B%22op%22%3A%22eq%22%2C%22field%22%3A%22id%22%2C%22value%22%3A%22${POST_ID}%22%7D%5D&limit=1" \
  -H "Authorization: Bearer ${USER_TOKEN}" | json '.data[0].id != null'

echo "[7/13] assessment + fusion report persistence"
ASSESSMENT_JSON="$(curl -fsS -X POST "${API_BASE}/data/assessments" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d "{\"data\":{\"user_id\":\"${USER_ID}\",\"assessment_type\":\"fusion_report\",\"score\":12,\"risk_level\":3,\"conversation_history\":[{\"role\":\"user\",\"content\":\"最近很累\"}],\"report\":{\"scaleData\":{\"score\":10},\"voiceData\":{\"score\":12},\"expressionData\":{\"depression_risk_score\":9}}},\"single\":true}")"
ASSESSMENT_ID="$(printf '%s' "$ASSESSMENT_JSON" | jq -r '.data.id')"
printf '%s' "$ASSESSMENT_JSON" | json '.data.report.scaleData.score == 10'

echo "[8/13] doctor signup + doctor domain + knowledge doc"
DOCTOR_SIGNUP="$(curl -fsS -X POST "${API_BASE}/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"${DOCTOR_NAME}\",\"password\":\"${PASSWORD}\",\"role\":\"doctor\",\"verificationCode\":\"2026\"}")"
printf '%s' "$DOCTOR_SIGNUP" | json '.accessToken != null and .user.id != null'
DOCTOR_TOKEN="$(printf '%s' "$DOCTOR_SIGNUP" | jq -r '.accessToken')"
DOCTOR_ID="$(printf '%s' "$DOCTOR_SIGNUP" | jq -r '.user.id')"
printf '%s' "$DOCTOR_SIGNUP" | json '.profile.role == "doctor"'

curl -fsS -X POST "${API_BASE}/data/doctor_patients" \
  -H "Authorization: Bearer ${DOCTOR_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d "{\"data\":{\"doctor_id\":\"${DOCTOR_ID}\",\"patient_id\":\"${USER_ID}\",\"notes\":\"初始接诊\"},\"single\":true}" | json '.data.patient_id != null'

ALERT_JSON="$(curl -fsS -X POST "${API_BASE}/data/risk_alerts" \
  -H "Authorization: Bearer ${DOCTOR_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d "{\"data\":{\"patient_id\":\"${USER_ID}\",\"alert_type\":\"manual_review\",\"risk_level\":4,\"description\":\"需要复查\",\"data_source\":\"fusion_report\",\"source_id\":\"${ASSESSMENT_ID}\"},\"single\":true}")"
ALERT_ID="$(printf '%s' "$ALERT_JSON" | jq -r '.data.id')"
printf '%s' "$ALERT_JSON" | json '.data.risk_level == 4'

KNOWLEDGE_JSON="$(curl -fsS -X POST "${API_BASE}/data/knowledge_base" \
  -H "Authorization: Bearer ${DOCTOR_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d "{\"data\":{\"title\":\"PHQ-9 基础量表\",\"content\":\"{\\\"type\\\":\\\"scale\\\",\\\"scale_id\\\":\\\"PHQ-9\\\",\\\"questions\\\":[{\\\"text\\\":\\\"最近心情如何\\\"}]}\",\"category\":\"assessment\",\"tags\":[\"PHQ-9\",\"assessment\"],\"content_type\":\"text\",\"is_active\":true,\"created_by\":\"${DOCTOR_ID}\"},\"single\":true}")"
KNOWLEDGE_ID="$(printf '%s' "$KNOWLEDGE_JSON" | jq -r '.data.id')"
printf '%s' "$KNOWLEDGE_JSON" | json '.data.category == "assessment"'
curl -fsS "${API_BASE}/data/knowledge_base?select=*&filters=%5B%7B%22op%22%3A%22eq%22%2C%22field%22%3A%22category%22%2C%22value%22%3A%22assessment%22%7D%5D&limit=10" \
  -H "Authorization: Bearer ${USER_TOKEN}" | json '.data | length >= 1'

printf 'knowledge document\n' > "${TMP_DIR}/knowledge.txt"
KNOWLEDGE_UPLOAD="$(curl -fsS -X POST "${API_BASE}/storage/knowledge-documents/upload" \
  -H "Authorization: Bearer ${DOCTOR_TOKEN}" \
  -F "path=tests/${DOCTOR_NAME}.txt" \
  -F "file=@${TMP_DIR}/knowledge.txt")"
KNOWLEDGE_PATH="$(printf '%s' "$KNOWLEDGE_UPLOAD" | jq -r '.data.path')"
api_get "${API_BASE}/storage/public/knowledge-documents/${KNOWLEDGE_PATH}" >/dev/null
curl -fsS -X DELETE "${API_BASE}/storage/knowledge-documents" \
  -H "Authorization: Bearer ${DOCTOR_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d "{\"paths\":[\"${KNOWLEDGE_PATH}\"]}" | json '.ok == true'

curl -fsS -X PATCH "${API_BASE}/data/risk_alerts" \
  -H "Authorization: Bearer ${DOCTOR_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d "{\"data\":{\"is_handled\":true,\"handled_by\":\"${DOCTOR_ID}\",\"handled_at\":\"$(date -u +%FT%TZ)\",\"notes\":\"已跟进\"},\"filters\":[{\"op\":\"eq\",\"field\":\"id\",\"value\":\"${ALERT_ID}\"}],\"single\":true}" \
  | json '.data.is_handled == true'

echo "[9/13] ai chat-completion"
CHAT_JSON="$(curl -fsS -X POST "${API_BASE}/functions/chat-completion" \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"system","content":"You are concise."},{"role":"user","content":"Reply with exactly three Chinese words about calm mood."}]}')"
printf '%s' "$CHAT_JSON" | json '.data.choices[0].message.content | length > 0'

echo "[10/13] ai multimodal vision"
ffmpeg -loglevel error -f lavfi -i color=c=red:s=64x64:d=1 -frames:v 1 "${TMP_DIR}/vision.png"
VISION_DATA_URL="data:image/png;base64,$(base64 -w0 "${TMP_DIR}/vision.png")"
VISION_JSON="$(curl -fsS -X POST "${API_BASE}/functions/multimodal-analysis" \
  -H 'Content-Type: application/json' \
  -d "{\"messages\":[{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"Describe the main visible subject in one short sentence.\"},{\"type\":\"image_url\",\"image_url\":{\"url\":\"${VISION_DATA_URL}\"}}]}]}")"
printf '%s' "$VISION_JSON" | json '.data.choices[0].message.content | length > 0'

echo "[11/13] ai speech recognition"
ffmpeg -loglevel error -y -f lavfi -i "flite=text='hello this is a test recording':voice=slt" -t 3 -ar 16000 -ac 1 "${TMP_DIR}/speech.wav"
SPEECH_BASE64="$(base64 -w0 "${TMP_DIR}/speech.wav")"
SPEECH_JSON="$(curl -fsS -X POST "${API_BASE}/functions/speech-recognition" \
  -H 'Content-Type: application/json' \
  -d "{\"input_audio\":{\"data\":\"${SPEECH_BASE64}\",\"format\":\"wav\"}}")"
printf '%s' "$SPEECH_JSON" | json '.data.text != null'

echo "[12/13] ai rag + fusion"
curl -fsS -X POST "${API_BASE}/functions/rag-retrieval" \
  -H 'Content-Type: application/json' \
  -d '{"query":"最近睡眠不太好怎么办","assessment_type":"PHQ-9"}' \
  | json '.data.assessment_type == "PHQ-9"'
curl -fsS -X POST "${API_BASE}/functions/multimodal-fusion" \
  -H 'Content-Type: application/json' \
  -d '{"text_analysis":{"score":6},"image_analysis":{"score":4},"voice_analysis":{"score":5},"video_analysis":{"score":3}}' \
  | json '.data.success == true and .data.risk_level >= 0'

echo "[13/13] cleanup checks"
curl -fsS -X DELETE "${API_BASE}/data/community_posts" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d "{\"filters\":[{\"op\":\"eq\",\"field\":\"id\",\"value\":\"${POST_ID}\"}]}" | json '.ok == true'
curl -fsS "${FRONT_BASE}/api/auth/session" | json '.session == null'

echo "Full stack verification passed for ${API_BASE} and ${FRONT_BASE}"
