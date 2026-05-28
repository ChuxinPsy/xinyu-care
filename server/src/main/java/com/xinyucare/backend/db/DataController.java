package com.xinyucare.backend.db;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.xinyucare.backend.auth.AuthUser;
import com.xinyucare.backend.common.ApiException;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/data")
public class DataController {

  private final GenericDataService genericDataService;
  private final ObjectMapper objectMapper;

  public DataController(GenericDataService genericDataService, ObjectMapper objectMapper) {
    this.genericDataService = genericDataService;
    this.objectMapper = objectMapper;
  }

  @GetMapping("/{table}")
  public Map<String, Object> select(
      @PathVariable String table,
      @RequestParam(defaultValue = "*") String select,
      @RequestParam(required = false) String filters,
      @RequestParam(required = false) String orders,
      @RequestParam(required = false) Integer limit,
      @RequestParam(defaultValue = "false") boolean head,
      @RequestParam(defaultValue = "false") boolean count,
      Authentication authentication) {
    return genericDataService.select(
        table,
        select,
        parse(filters, new TypeReference<List<FilterCondition>>() {}),
        parse(orders, new TypeReference<List<OrderCondition>>() {}),
        limit,
        head,
        count,
        principal(authentication)
    );
  }

  @PostMapping("/{table}")
  public Map<String, Object> insert(
      @PathVariable String table,
      @RequestBody Map<String, Object> body,
      Authentication authentication) {
    return genericDataService.insert(
        table,
        castMap(body.get("data")),
        Boolean.TRUE.equals(body.get("upsert")),
        body.get("onConflict") == null ? null : String.valueOf(body.get("onConflict")),
        Boolean.TRUE.equals(body.get("single")),
        principal(authentication)
    );
  }

  @PatchMapping("/{table}")
  public Map<String, Object> update(
      @PathVariable String table,
      @RequestBody Map<String, Object> body,
      Authentication authentication) {
    return genericDataService.update(
        table,
        castMap(body.get("data")),
        castFilters(body.get("filters")),
        Boolean.TRUE.equals(body.get("single")),
        principal(authentication)
    );
  }

  @DeleteMapping("/{table}")
  public Map<String, Object> delete(
      @PathVariable String table,
      @RequestBody Map<String, Object> body,
      Authentication authentication) {
    return genericDataService.delete(
        table,
        castFilters(body.get("filters")),
        principal(authentication)
    );
  }

  private AuthUser principal(Authentication authentication) {
    return authentication != null && authentication.getPrincipal() instanceof AuthUser authUser ? authUser : null;
  }

  private <T> T parse(String raw, TypeReference<T> typeReference) {
    if (raw == null || raw.isBlank()) {
      try {
        return objectMapper.readValue("[]", typeReference);
      } catch (JsonProcessingException e) {
        throw new ApiException(HttpStatus.BAD_REQUEST, "请求解析失败");
      }
    }
    try {
      return objectMapper.readValue(raw, typeReference);
    } catch (JsonProcessingException e) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "请求解析失败");
    }
  }

  @SuppressWarnings("unchecked")
  private Map<String, Object> castMap(Object value) {
    return value instanceof Map<?, ?> map ? (Map<String, Object>) map : Map.of();
  }

  private List<FilterCondition> castFilters(Object value) {
    return value == null
        ? List.of()
        : objectMapper.convertValue(value, new TypeReference<List<FilterCondition>>() {});
  }
}
