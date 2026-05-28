package com.xinyucare.backend.db;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.xinyucare.backend.auth.AuthService;
import com.xinyucare.backend.auth.AuthUser;
import com.xinyucare.backend.common.ApiException;
import com.xinyucare.backend.common.ResponseBodyBuilder;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.ColumnMapRowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GenericDataService {

  private final NamedParameterJdbcTemplate jdbcTemplate;
  private final TableRegistry tableRegistry;
  private final AuthService authService;
  private final ObjectMapper objectMapper;

  public GenericDataService(
      NamedParameterJdbcTemplate jdbcTemplate,
      TableRegistry tableRegistry,
      AuthService authService,
      ObjectMapper objectMapper) {
    this.jdbcTemplate = jdbcTemplate;
    this.tableRegistry = tableRegistry;
    this.authService = authService;
    this.objectMapper = objectMapper;
  }

  public Map<String, Object> select(
      String table,
      String selectSpec,
      List<FilterCondition> filters,
      List<OrderCondition> orders,
      Integer limit,
      boolean head,
      boolean count,
      AuthUser authUser) {
    TableMetadata metadata = tableRegistry.get(table);
    List<FilterCondition> effectiveFilters = applyReadScope(table, filters, authUser);
    MapSqlParameterSource params = new MapSqlParameterSource();
    List<String> clauses = buildWhereClauses(metadata, effectiveFilters, params);

    if (head && count) {
      String sql = "SELECT COUNT(*) FROM " + metadata.tableName() + buildWhere(clauses);
      Integer rowCount = jdbcTemplate.queryForObject(sql, params, Integer.class);
      return ResponseBodyBuilder.ok(List.of(), rowCount == null ? 0 : rowCount);
    }

    String sql = "SELECT * FROM " + metadata.tableName()
        + buildWhere(clauses)
        + buildOrder(metadata, orders)
        + buildLimit(limit);
    List<Map<String, Object>> rows = jdbcTemplate.query(sql, params, new ColumnMapRowMapper())
        .stream()
        .map(row -> normalizeRow(metadata, row))
        .collect(Collectors.toCollection(ArrayList::new));
    enrichRows(table, rows);
    Object data = rows;
    if (selectSpec != null && selectSpec.contains("maybeSingle")) {
      data = rows.isEmpty() ? null : rows.getFirst();
    }
    return ResponseBodyBuilder.ok(data);
  }

  @Transactional
  public Map<String, Object> insert(
      String table,
      Map<String, Object> payload,
      boolean upsert,
      String onConflict,
      boolean single,
      AuthUser authUser) {
    TableMetadata metadata = tableRegistry.get(table);
    Map<String, Object> writable = prepareWritablePayload(table, payload, authUser, true);
    if (writable.isEmpty()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "没有可写入字段");
    }
    if (writable.containsKey("id") == false && metadata.columns().contains("id")) {
      writable.put("id", UUID.randomUUID().toString());
    }
    Instant now = Instant.now();
    writable.putIfAbsent("created_at", Timestamp.from(now));
    if (metadata.columns().contains("updated_at")) {
      writable.putIfAbsent("updated_at", Timestamp.from(now));
    }

    List<String> columns = new ArrayList<>(writable.keySet());
    MapSqlParameterSource params = new MapSqlParameterSource();
    List<String> placeholders = new ArrayList<>();
    for (String column : columns) {
      assertColumnAllowed(metadata, column);
      placeholders.add(":" + column);
      params.addValue(column, serializeValue(metadata, column, writable.get(column)));
    }

    String sql = "INSERT INTO " + metadata.tableName()
        + " (" + String.join(", ", columns) + ") VALUES (" + String.join(", ", placeholders) + ")";
    if (upsert && onConflict != null && !onConflict.isBlank()) {
      List<String> conflictKeys = List.of(onConflict.split(","));
      String updateClause = columns.stream()
          .filter(column -> !conflictKeys.contains(column))
          .map(column -> column + " = VALUES(" + column + ")")
          .collect(Collectors.joining(", "));
      sql = sql + " ON DUPLICATE KEY UPDATE " + updateClause;
    }

    jdbcTemplate.update(sql, params);
    Map<String, Object> inserted = fetchInsertedOrUpdated(table, metadata, writable, onConflict, authUser);
    return ResponseBodyBuilder.ok(single ? inserted : List.of(inserted));
  }

  @Transactional
  public Map<String, Object> update(
      String table,
      Map<String, Object> payload,
      List<FilterCondition> filters,
      boolean single,
      AuthUser authUser) {
    TableMetadata metadata = tableRegistry.get(table);
    authService.requireUser(authUser);
    Map<String, Object> writable = prepareWritablePayload(table, payload, authUser, false);
    if (writable.isEmpty()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "没有可更新字段");
    }
    if (metadata.columns().contains("updated_at")) {
      writable.put("updated_at", Timestamp.from(Instant.now()));
    }
    List<FilterCondition> effectiveFilters = applyWriteScope(table, filters, authUser, payload);
    if (effectiveFilters.isEmpty()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "更新必须带过滤条件");
    }

    MapSqlParameterSource params = new MapSqlParameterSource();
    List<String> sets = new ArrayList<>();
    for (Map.Entry<String, Object> entry : writable.entrySet()) {
      assertColumnAllowed(metadata, entry.getKey());
      if (metadata.immutableColumns().contains(entry.getKey())) {
        continue;
      }
      sets.add(entry.getKey() + " = :set_" + entry.getKey());
      params.addValue("set_" + entry.getKey(), serializeValue(metadata, entry.getKey(), entry.getValue()));
    }
    List<String> clauses = buildWhereClauses(metadata, effectiveFilters, params);
    jdbcTemplate.update(
        "UPDATE " + metadata.tableName() + " SET " + String.join(", ", sets) + buildWhere(clauses),
        params
    );
    Map<String, Object> updated = selectSingle(metadata, effectiveFilters);
    if (updated != null) {
      enrichRows(table, List.of(updated));
    }
    return ResponseBodyBuilder.ok(single ? updated : List.of(updated));
  }

  @Transactional
  public Map<String, Object> delete(String table, List<FilterCondition> filters, AuthUser authUser) {
    TableMetadata metadata = tableRegistry.get(table);
    authService.requireUser(authUser);
    List<FilterCondition> effectiveFilters = applyWriteScope(table, filters, authUser, Map.of());
    if (effectiveFilters.isEmpty()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "删除必须带过滤条件");
    }
    MapSqlParameterSource params = new MapSqlParameterSource();
    List<String> clauses = buildWhereClauses(metadata, effectiveFilters, params);
    jdbcTemplate.update("DELETE FROM " + metadata.tableName() + buildWhere(clauses), params);
    return ResponseBodyBuilder.ok();
  }

  public Map<String, Object> incrementCounter(String table, String id, String column, AuthUser authUser) {
    authService.requireUser(authUser);
    jdbcTemplate.update(
        "UPDATE " + table + " SET " + column + " = COALESCE(" + column + ", 0) + 1 WHERE id = :id",
        new MapSqlParameterSource().addValue("id", id)
    );
    return ResponseBodyBuilder.ok();
  }

  public boolean verifyAndUseCode(String code, String userId) {
    Map<String, Object> row = selectSingle(
        tableRegistry.get("doctor_verification_codes"),
        List.of(new FilterCondition("eq", "code", code))
    );
    if (row == null) {
      return false;
    }
    if (!(Boolean) row.get("is_permanent") && Boolean.TRUE.equals(row.get("is_used"))) {
      return false;
    }
    if (!(Boolean) row.get("is_permanent")) {
      jdbcTemplate.update("""
          UPDATE doctor_verification_codes
          SET is_used = 1, used_by = :userId, used_at = :usedAt
          WHERE code = :code
          """,
          new MapSqlParameterSource()
              .addValue("userId", userId)
              .addValue("usedAt", Timestamp.from(Instant.now()))
              .addValue("code", code)
      );
    }
    return true;
  }

  private Map<String, Object> fetchInsertedOrUpdated(
      String table,
      TableMetadata metadata,
      Map<String, Object> writable,
      String onConflict,
      AuthUser authUser) {
    if (writable.containsKey("id")) {
      return selectSingle(metadata, List.of(new FilterCondition("eq", "id", writable.get("id"))));
    }
    if (onConflict != null && !onConflict.isBlank()) {
      List<FilterCondition> filters = List.of(onConflict.split(",")).stream()
          .map(String::trim)
          .filter(writable::containsKey)
          .map(key -> new FilterCondition("eq", key, writable.get(key)))
          .toList();
      return selectSingle(metadata, applyReadScope(table, filters, authUser));
    }
    return null;
  }

  private Map<String, Object> selectSingle(TableMetadata metadata, List<FilterCondition> filters) {
    MapSqlParameterSource params = new MapSqlParameterSource();
    String sql = "SELECT * FROM " + metadata.tableName() + buildWhere(buildWhereClauses(metadata, filters, params)) + " LIMIT 1";
    List<Map<String, Object>> rows = jdbcTemplate.query(sql, params, new ColumnMapRowMapper())
        .stream()
        .map(row -> normalizeRow(metadata, row))
        .toList();
    return rows.isEmpty() ? null : rows.getFirst();
  }

  private List<FilterCondition> applyReadScope(String table, List<FilterCondition> filters, AuthUser authUser) {
    List<FilterCondition> result = new ArrayList<>(filters == null ? List.of() : filters);
    boolean isStaff = authUser != null && authUser.isStaff();
    switch (table) {
      case "profiles" -> {
        authService.requireUser(authUser);
        if (!isStaff) {
          result.add(new FilterCondition("eq", "id", authUser.id()));
        }
      }
      case "emotion_diaries", "assessments", "wearable_data", "user_healing_records", "meditation_sessions", "user_favorites" -> {
        authService.requireUser(authUser);
        if (!isStaff) {
          result.add(new FilterCondition("eq", "user_id", authUser.id()));
        }
      }
      case "healing_contents" -> result.add(new FilterCondition("eq", "is_active", true));
      case "community_posts" -> result.add(new FilterCondition("eq", "is_hidden", false));
      case "doctor_patients" -> {
        authService.requireUser(authUser);
        if (!isStaff) {
          result.add(new FilterCondition("eq", "patient_id", authUser.id()));
        }
      }
      case "risk_alerts" -> {
        authService.requireUser(authUser);
        if (!isStaff) {
          result.add(new FilterCondition("eq", "patient_id", authUser.id()));
        }
      }
      case "knowledge_base" -> {
        authService.requireUser(authUser);
        if (!isStaff) {
          result.add(new FilterCondition("eq", "is_active", true));
        }
      }
      case "doctor_verification_codes" -> {
        boolean publicCodeCheck = result.stream().anyMatch(filter -> "code".equals(filter.field()));
        if (!publicCodeCheck) {
          authService.requireUser(authUser);
          if (!isStaff) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权访问验证码列表");
          }
        }
      }
      default -> {
      }
    }
    return result;
  }

  private List<FilterCondition> applyWriteScope(
      String table,
      List<FilterCondition> filters,
      AuthUser authUser,
      Map<String, Object> payload) {
    List<FilterCondition> result = new ArrayList<>(filters == null ? List.of() : filters);
    boolean isStaff = authUser.isStaff();
    switch (table) {
      case "profiles" -> {
        if (!isStaff) {
          result.add(new FilterCondition("eq", "id", authUser.id()));
        }
      }
      case "emotion_diaries", "assessments", "wearable_data", "user_healing_records", "meditation_sessions", "user_favorites" -> {
        if (!isStaff) {
          result.add(new FilterCondition("eq", "user_id", authUser.id()));
          if (payload.containsKey("user_id") && !authUser.id().equals(String.valueOf(payload.get("user_id")))) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权写入其他用户数据");
          }
        }
      }
      case "community_posts", "community_comments", "post_likes" -> {
        if (payload.containsKey("user_id") && !authUser.id().equals(String.valueOf(payload.get("user_id")))) {
          throw new ApiException(HttpStatus.FORBIDDEN, "无权操作其他用户内容");
        }
      }
      case "doctor_patients", "risk_alerts", "knowledge_base", "doctor_verification_codes", "healing_contents" -> {
        if (!isStaff) {
          throw new ApiException(HttpStatus.FORBIDDEN, "仅医生或管理员可操作");
        }
      }
      default -> {
      }
    }
    return result;
  }

  private Map<String, Object> prepareWritablePayload(String table, Map<String, Object> payload, AuthUser authUser, boolean inserting) {
    authUser = inserting ? authUser : authService.requireUser(authUser);
    Map<String, Object> writable = new LinkedHashMap<>(payload == null ? Map.of() : payload);
    if (inserting && authUser != null) {
      switch (table) {
        case "profiles" -> writable.putIfAbsent("id", authUser.id());
        case "emotion_diaries", "assessments", "wearable_data", "user_healing_records", "meditation_sessions", "user_favorites" ->
            writable.putIfAbsent("user_id", authUser.id());
        case "community_posts", "community_comments", "post_likes" -> writable.putIfAbsent("user_id", authUser.id());
        case "risk_alerts" -> {
          authService.requireUser(authUser);
          if (!authUser.isStaff()) {
            writable.putIfAbsent("patient_id", authUser.id());
            Object patientId = writable.get("patient_id");
            if (patientId != null && !authUser.id().equals(String.valueOf(patientId))) {
              throw new ApiException(HttpStatus.FORBIDDEN, "无权创建其他患者的预警");
            }
            writable.put("is_handled", false);
            writable.remove("handled_by");
            writable.remove("handled_at");
          }
        }
        case "knowledge_base" -> writable.putIfAbsent("created_by", authUser.id());
        default -> {
        }
      }
    }
    return writable;
  }

  private List<String> buildWhereClauses(TableMetadata metadata, List<FilterCondition> filters, MapSqlParameterSource params) {
    List<String> clauses = new ArrayList<>();
    int index = 0;
    for (FilterCondition filter : filters) {
      assertColumnAllowed(metadata, filter.field());
      String paramName = "p" + index++;
      String operator = switch (filter.op()) {
        case "eq" -> "=";
        case "gte" -> ">=";
        case "lte" -> "<=";
        default -> throw new ApiException(HttpStatus.BAD_REQUEST, "不支持的过滤类型: " + filter.op());
      };
      clauses.add(filter.field() + " " + operator + " :" + paramName);
      params.addValue(paramName, serializeValue(metadata, filter.field(), filter.value()));
    }
    return clauses;
  }

  private String buildWhere(List<String> clauses) {
    return clauses.isEmpty() ? "" : " WHERE " + String.join(" AND ", clauses);
  }

  private String buildOrder(TableMetadata metadata, List<OrderCondition> orders) {
    List<String> orderings = new ArrayList<>();
    if (orders != null) {
      for (OrderCondition order : orders) {
        assertColumnAllowed(metadata, order.field());
        orderings.add(order.field() + (order.ascending() ? " ASC" : " DESC"));
      }
    }
    if (orderings.isEmpty()) {
      orderings.addAll(metadata.defaultOrder());
    }
    return orderings.isEmpty() ? "" : " ORDER BY " + String.join(", ", orderings);
  }

  private String buildLimit(Integer limit) {
    return limit == null || limit <= 0 ? "" : " LIMIT " + limit;
  }

  private Object serializeValue(TableMetadata metadata, String column, Object value) {
    if (value == null) {
      return null;
    }
    if (metadata.jsonColumns().contains(column)) {
      try {
        return value instanceof String ? value : objectMapper.writeValueAsString(value);
      } catch (JsonProcessingException e) {
        throw new ApiException(HttpStatus.BAD_REQUEST, "JSON 字段序列化失败: " + column);
      }
    }
    if (value instanceof Instant instant) {
      return Timestamp.from(instant);
    }
    if (value instanceof String stringValue) {
      String trimmed = stringValue.trim();
      if (!trimmed.isEmpty()) {
        if (looksLikeTimestampColumn(column)) {
          try {
            return Timestamp.from(Instant.parse(trimmed));
          } catch (Exception ignored) {
          }
        }
        if (looksLikeDateColumn(column)) {
          try {
            return Date.valueOf(trimmed);
          } catch (Exception ignored) {
          }
        }
      }
    }
    return value;
  }

  private boolean looksLikeTimestampColumn(String column) {
    return column.endsWith("_at");
  }

  private boolean looksLikeDateColumn(String column) {
    return column.endsWith("_date");
  }

  private Map<String, Object> normalizeRow(TableMetadata metadata, Map<String, Object> row) {
    Map<String, Object> normalized = new LinkedHashMap<>();
    for (Map.Entry<String, Object> entry : row.entrySet()) {
      String key = entry.getKey().toLowerCase(Locale.ROOT);
      Object value = entry.getValue();
      if (metadata.jsonColumns().contains(key) && value instanceof String json && !json.isBlank()) {
        try {
          normalized.put(key, objectMapper.readValue(json, new TypeReference<Object>() {}));
          continue;
        } catch (JsonProcessingException ignored) {
        }
      }
      if (value instanceof Timestamp timestamp) {
        normalized.put(key, timestamp.toInstant().toString());
      } else if (value instanceof Date date) {
        normalized.put(key, date.toString());
      } else {
        normalized.put(key, value);
      }
    }
    return normalized;
  }

  private void enrichRows(String table, List<Map<String, Object>> rows) {
    switch (table) {
      case "user_healing_records", "meditation_sessions", "user_favorites" -> attachHealingContent(table, rows);
      case "community_posts" -> attachPostCategories(rows);
      case "doctor_patients" -> attachProfiles(rows, "patient_id");
      case "risk_alerts" -> attachProfiles(rows, "patient_id");
      default -> {
      }
    }
  }

  private void attachHealingContent(String table, List<Map<String, Object>> rows) {
    String field = "meditation_sessions".equals(table) || "user_favorites".equals(table) ? "content_id" : "healing_content_id";
    List<String> ids = rows.stream()
        .map(row -> row.get(field))
        .filter(String.class::isInstance)
        .map(String.class::cast)
        .distinct()
        .toList();
    if (ids.isEmpty()) {
      return;
    }
    Map<String, Map<String, Object>> contents = fetchByIds("healing_contents", ids);
    rows.forEach(row -> row.put("healing_contents", contents.get(String.valueOf(row.get(field)))));
  }

  private void attachPostCategories(List<Map<String, Object>> rows) {
    List<String> ids = rows.stream()
        .map(row -> row.get("category_id"))
        .filter(String.class::isInstance)
        .map(String.class::cast)
        .distinct()
        .toList();
    if (ids.isEmpty()) {
      return;
    }
    Map<String, Map<String, Object>> categories = fetchByIds("post_categories", ids);
    rows.forEach(row -> row.put("post_categories", categories.get(String.valueOf(row.get("category_id")))));
  }

  private void attachProfiles(List<Map<String, Object>> rows, String foreignKey) {
    List<String> ids = rows.stream()
        .map(row -> row.get(foreignKey))
        .filter(String.class::isInstance)
        .map(String.class::cast)
        .distinct()
        .toList();
    if (ids.isEmpty()) {
      return;
    }
    Map<String, Map<String, Object>> profiles = fetchByIds("profiles", ids);
    rows.forEach(row -> row.put("profiles", profiles.get(String.valueOf(row.get(foreignKey)))));
  }

  private Map<String, Map<String, Object>> fetchByIds(String table, List<String> ids) {
    TableMetadata metadata = tableRegistry.get(table);
    List<Map<String, Object>> rows = jdbcTemplate.query(
        "SELECT * FROM " + table + " WHERE id IN (:ids)",
        new MapSqlParameterSource().addValue("ids", ids),
        new ColumnMapRowMapper()
    ).stream().map(row -> normalizeRow(metadata, row)).toList();
    Map<String, Map<String, Object>> result = new HashMap<>();
    for (Map<String, Object> row : rows) {
      result.put(String.valueOf(row.get("id")), row);
    }
    return result;
  }

  private void assertColumnAllowed(TableMetadata metadata, String column) {
    if (!metadata.columns().contains(column)) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "非法字段: " + column);
    }
  }
}
