package com.xinyucare.backend.auth;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.xinyucare.backend.common.ApiException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

  private final NamedParameterJdbcTemplate jdbcTemplate;
  private final JwtService jwtService;
  private final ObjectMapper objectMapper;
  private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

  public AuthService(
      NamedParameterJdbcTemplate jdbcTemplate,
      JwtService jwtService,
      ObjectMapper objectMapper) {
    this.jdbcTemplate = jdbcTemplate;
    this.jwtService = jwtService;
    this.objectMapper = objectMapper;
  }

  @Transactional
  public AuthDtos.SessionEnvelope signup(AuthDtos.SignupRequest request) {
    String username = request.username().trim();
    String role = normalizeRole(request.role());
    String loginEmail = request.email() == null || request.email().isBlank()
        ? buildSyntheticEmail(username)
        : request.email().trim();

    if ("doctor".equals(role)) {
      verifyDoctorCodeForRegistration(request.verificationCode());
    }

    Map<String, Object> existing = jdbcTemplate.query(
        "SELECT id FROM users WHERE username = :username OR email = :email LIMIT 1",
        new MapSqlParameterSource()
            .addValue("username", username)
            .addValue("email", loginEmail),
        rs -> rs.next() ? Map.of("id", rs.getString("id")) : null
    );
    if (existing != null) {
      throw new ApiException(HttpStatus.CONFLICT, "用户名或账号已存在");
    }

    String userId = UUID.randomUUID().toString();
    String passwordHash = passwordEncoder.encode(request.password());
    Instant now = Instant.now();
    String metadataJson = toJson(Map.of("username", username, "role", role));

    MapSqlParameterSource params = new MapSqlParameterSource()
        .addValue("id", userId)
        .addValue("username", username)
        .addValue("email", loginEmail)
        .addValue("passwordHash", passwordHash)
        .addValue("role", role)
        .addValue("metadata", metadataJson)
        .addValue("now", Timestamp.from(now));

    jdbcTemplate.update("""
        INSERT INTO users (id, username, email, password_hash, role, status, metadata, created_at, updated_at)
        VALUES (:id, :username, :email, :passwordHash, :role, 'active', CAST(:metadata AS JSON), :now, :now)
        """, params);

    jdbcTemplate.update("""
        INSERT INTO profiles (
          id, username, email, role, phone, wechat, avatar_url, full_name, gender, birth_date, bio,
          background_url, selected_background, created_at, updated_at
        ) VALUES (
          :id, :username, :email, :role, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, :now, :now
        )
        """, params);

    if ("doctor".equals(role)) {
      markDoctorCodeUsed(request.verificationCode(), userId);
    }

    AuthUser user = new AuthUser(userId, username, loginEmail, role);
    return buildSession(user);
  }

  @Transactional
  public AuthDtos.SessionEnvelope login(AuthDtos.LoginRequest request) {
    Map<String, Object> row = jdbcTemplate.query(
        """
        SELECT u.id, u.username, u.email, u.password_hash, u.role, p.full_name, p.avatar_url
        FROM users u
        LEFT JOIN profiles p ON p.id = u.id
        WHERE u.username = :value OR u.email = :value
        LIMIT 1
        """,
        new MapSqlParameterSource().addValue("value", request.usernameOrEmail().trim()),
        rs -> rs.next() ? mapUserRow(rs) : null
    );
    if (row == null || !passwordEncoder.matches(request.password(), String.valueOf(row.get("password_hash")))) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "账号或密码错误");
    }

    String id = String.valueOf(row.get("id"));
    jdbcTemplate.update(
        "UPDATE users SET last_login_at = :now, updated_at = :now WHERE id = :id",
        new MapSqlParameterSource().addValue("id", id).addValue("now", Timestamp.from(Instant.now()))
    );
    AuthUser user = new AuthUser(
        id,
        String.valueOf(row.get("username")),
        String.valueOf(row.get("email")),
        String.valueOf(row.get("role"))
    );
    return buildSession(user);
  }

  public AuthDtos.SessionEnvelope session(AuthUser user) {
    if (user == null) {
      return new AuthDtos.SessionEnvelope(null, null, null);
    }
    return buildSession(user);
  }

  public AuthUser requireUser(AuthUser user) {
    if (user == null) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "请先登录");
    }
    return user;
  }

  public void verifyDoctorCodeForRegistration(String verificationCode) {
    if (verificationCode == null || verificationCode.isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "医生注册需要验证码");
    }
    Map<String, Object> row = jdbcTemplate.query(
        """
        SELECT id, code, is_permanent, is_used
        FROM doctor_verification_codes
        WHERE code = :code
        LIMIT 1
        """,
        new MapSqlParameterSource().addValue("code", normalizeCode(verificationCode)),
        rs -> rs.next() ? Map.of(
            "id", rs.getString("id"),
            "is_permanent", rs.getBoolean("is_permanent"),
            "is_used", rs.getBoolean("is_used")) : null
    );
    if (row == null) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "验证码不存在");
    }
    if (!(Boolean) row.get("is_permanent") && (Boolean) row.get("is_used")) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "验证码已被使用");
    }
  }

  public boolean verifyDoctorCode(String verificationCode) {
    try {
      verifyDoctorCodeForRegistration(verificationCode);
      return true;
    } catch (ApiException ex) {
      return false;
    }
  }

  @Transactional
  public void markDoctorCodeUsed(String verificationCode, String userId) {
    String code = normalizeCode(verificationCode);
    jdbcTemplate.update("""
        UPDATE doctor_verification_codes
        SET is_used = CASE WHEN is_permanent = 1 THEN is_used ELSE 1 END,
            used_by = CASE WHEN is_permanent = 1 THEN used_by ELSE :userId END,
            used_at = CASE WHEN is_permanent = 1 THEN used_at ELSE :usedAt END
        WHERE code = :code
        """,
        new MapSqlParameterSource()
            .addValue("code", code)
            .addValue("userId", userId)
            .addValue("usedAt", Timestamp.from(Instant.now()))
    );
  }

  private AuthDtos.SessionEnvelope buildSession(AuthUser user) {
    Map<String, Object> profile = jdbcTemplate.query(
        "SELECT * FROM profiles WHERE id = :id LIMIT 1",
        new MapSqlParameterSource().addValue("id", user.id()),
        rs -> rs.next() ? mapProfileRow(rs) : null
    );
    String token = jwtService.issueToken(user);
    Map<String, Object> userBody = new LinkedHashMap<>();
    userBody.put("id", user.id());
    userBody.put("email", user.email());
    userBody.put("user_metadata", Map.of("username", user.username(), "role", user.role()));
    return new AuthDtos.SessionEnvelope(token, userBody, profile);
  }

  private Map<String, Object> mapProfileRow(ResultSet rs) throws SQLException {
    Map<String, Object> row = new LinkedHashMap<>();
    row.put("id", rs.getString("id"));
    row.put("username", rs.getString("username"));
    row.put("email", rs.getString("email"));
    row.put("phone", rs.getString("phone"));
    row.put("wechat", rs.getString("wechat"));
    row.put("role", rs.getString("role"));
    row.put("avatar_url", rs.getString("avatar_url"));
    row.put("full_name", rs.getString("full_name"));
    row.put("gender", rs.getString("gender"));
    row.put("birth_date", rs.getDate("birth_date") == null ? null : rs.getDate("birth_date").toString());
    row.put("bio", rs.getString("bio"));
    row.put("background_url", rs.getString("background_url"));
    row.put("selected_background", rs.getString("selected_background"));
    row.put("created_at", toIso(rs.getTimestamp("created_at")));
    row.put("updated_at", toIso(rs.getTimestamp("updated_at")));
    return row;
  }

  private Map<String, Object> mapUserRow(ResultSet rs) throws SQLException {
    Map<String, Object> row = new LinkedHashMap<>();
    row.put("id", rs.getString("id"));
    row.put("username", rs.getString("username"));
    row.put("email", rs.getString("email"));
    row.put("password_hash", rs.getString("password_hash"));
    row.put("role", rs.getString("role"));
    return row;
  }

  private String normalizeRole(String role) {
    if ("doctor".equals(role) || "admin".equals(role)) {
      return role;
    }
    return "user";
  }

  private String buildSyntheticEmail(String username) {
    return username + "@miaoda.com";
  }

  private String normalizeCode(String code) {
    String trimmed = code.trim();
    StringBuilder builder = new StringBuilder(trimmed.length());
    for (int i = 0; i < trimmed.length(); i++) {
      char ch = trimmed.charAt(i);
      if (ch >= '\uFF10' && ch <= '\uFF19') {
        builder.append((char) (ch - 0xFEE0));
      } else if (ch >= '\uFF21' && ch <= '\uFF3A') {
        builder.append((char) (ch - 0xFEE0));
      } else if (ch >= '\uFF41' && ch <= '\uFF5A') {
        builder.append((char) (ch - 0xFEE0));
      } else {
        builder.append(ch);
      }
    }
    return builder.toString();
  }

  private String toJson(Object value) {
    try {
      return objectMapper.writeValueAsString(value);
    } catch (JsonProcessingException e) {
      throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "序列化失败");
    }
  }

  private String toIso(Timestamp timestamp) {
    return timestamp == null ? null : timestamp.toInstant().toString();
  }
}
