package com.xinyucare.backend.db;

import com.xinyucare.backend.common.ApiException;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class TableRegistry {

  private final Map<String, TableMetadata> tables = Map.ofEntries(
      Map.entry("profiles", metadata("profiles", set(
          "id", "username", "email", "phone", "wechat", "role", "avatar_url", "full_name", "gender",
          "birth_date", "bio", "background_url", "selected_background", "created_at", "updated_at"))),
      Map.entry("emotion_diaries", metadata("emotion_diaries", set(
          "id", "user_id", "diary_date", "emotion_level", "title", "content", "tags", "image_urls", "voice_url",
          "ai_analysis", "created_at", "updated_at"), set("tags", "image_urls", "ai_analysis"))),
      Map.entry("assessments", metadata("assessments", set(
          "id", "user_id", "assessment_type", "conversation_history", "text_input", "voice_input_url", "image_input_url",
          "video_input_url", "ai_analysis", "risk_level", "score", "report", "created_at", "updated_at"),
          set("conversation_history", "ai_analysis", "report"))),
      Map.entry("wearable_data", metadata("wearable_data", set(
          "id", "user_id", "record_date", "heart_rate", "sleep_hours", "sleep_quality", "steps", "calories",
          "stress_level", "blood_oxygen", "temperature", "data_json", "created_at"), set("data_json"))),
      Map.entry("healing_contents", metadata("healing_contents", set(
          "id", "title", "description", "category", "content_type", "content_url", "duration", "thumbnail_url",
          "author", "tags", "is_active", "view_count", "like_count", "created_at", "updated_at"), set("tags"))),
      Map.entry("user_healing_records", metadata("user_healing_records", set(
          "id", "user_id", "healing_content_id", "duration_seconds", "completed", "created_at"))),
      Map.entry("community_posts", metadata("community_posts", set(
          "id", "user_id", "anonymous_name", "anonymous_nickname", "title", "content", "category_id", "tags",
          "like_count", "comment_count", "is_pinned", "is_hidden", "is_recovery_story", "is_featured", "created_at", "updated_at"),
          set("tags"))),
      Map.entry("community_comments", metadata("community_comments", set(
          "id", "post_id", "user_id", "anonymous_name", "content", "like_count", "created_at"))),
      Map.entry("post_likes", metadata("post_likes", set("id", "post_id", "user_id", "created_at"))),
      Map.entry("meditation_sessions", metadata("meditation_sessions", set(
          "id", "user_id", "content_id", "duration", "completed", "mood_before", "mood_after", "notes", "created_at", "updated_at"))),
      Map.entry("user_favorites", metadata("user_favorites", set("id", "user_id", "content_id", "created_at"))),
      Map.entry("post_categories", metadata("post_categories", set("id", "name", "description", "icon", "color", "created_at"))),
      Map.entry("doctor_patients", metadata("doctor_patients", set(
          "id", "doctor_id", "patient_id", "status", "notes", "created_at", "updated_at"))),
      Map.entry("risk_alerts", metadata("risk_alerts", set(
          "id", "patient_id", "alert_type", "risk_level", "description", "data_source", "source_id", "is_handled",
          "handled_by", "handled_at", "notes", "created_at"))),
      Map.entry("knowledge_base", metadata("knowledge_base", set(
          "id", "title", "content", "category", "tags", "content_type", "file_url", "file_name", "file_size",
          "file_mime_type", "is_active", "created_by", "created_at", "updated_at"), set("tags"))),
      Map.entry("doctor_verification_codes", metadata("doctor_verification_codes", set(
          "id", "code", "is_permanent", "is_used", "used_by", "used_at", "created_by", "created_at", "notes")))
  );

  public TableMetadata get(String table) {
    TableMetadata metadata = tables.get(table);
    if (metadata == null) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "不支持的数据表: " + table);
    }
    return metadata;
  }

  private static TableMetadata metadata(String table, Set<String> columns) {
    return new TableMetadata(table, columns, Set.of(), Set.of("created_at"), List.of("created_at desc"));
  }

  private static TableMetadata metadata(String table, Set<String> columns, Set<String> jsonColumns) {
    return new TableMetadata(table, columns, jsonColumns, Set.of("created_at"), List.of("created_at desc"));
  }

  private static Set<String> set(String... values) {
    return Set.of(values);
  }
}
