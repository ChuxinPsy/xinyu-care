package com.xinyucare.backend.common;

import java.util.LinkedHashMap;
import java.util.Map;

public final class ResponseBodyBuilder {

  private ResponseBodyBuilder() {
  }

  public static Map<String, Object> ok() {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("ok", true);
    body.put("error", null);
    return body;
  }

  public static Map<String, Object> ok(Object data) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("ok", true);
    body.put("data", data);
    body.put("error", null);
    return body;
  }

  public static Map<String, Object> ok(Object data, int count) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("ok", true);
    body.put("data", data);
    body.put("count", count);
    body.put("error", null);
    return body;
  }
}
