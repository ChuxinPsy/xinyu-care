package com.xinyucare.backend.common;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(ApiException.class)
  public ResponseEntity<Map<String, Object>> handleApiException(ApiException ex, HttpServletRequest request) {
    return buildResponse(ex.getStatus(), ex.getMessage(), request.getRequestURI());
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<Map<String, Object>> handleValidationException(
      MethodArgumentNotValidException ex,
      HttpServletRequest request) {
    String message = ex.getBindingResult()
        .getFieldErrors()
        .stream()
        .findFirst()
        .map(FieldError::getDefaultMessage)
        .orElse("请求参数无效");
    return buildResponse(HttpStatus.BAD_REQUEST, message, request.getRequestURI());
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<Map<String, Object>> handleException(Exception ex, HttpServletRequest request) {
    ex.printStackTrace();
    return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, ex.getMessage(), request.getRequestURI());
  }

  private ResponseEntity<Map<String, Object>> buildResponse(HttpStatus status, String message, String path) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("timestamp", Instant.now().toString());
    body.put("status", status.value());
    body.put("error", message == null || message.isBlank() ? status.getReasonPhrase() : message);
    body.put("path", path);
    return ResponseEntity.status(status).body(body);
  }
}
