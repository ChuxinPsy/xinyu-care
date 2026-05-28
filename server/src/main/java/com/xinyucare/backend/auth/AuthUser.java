package com.xinyucare.backend.auth;

public record AuthUser(
    String id,
    String username,
    String email,
    String role
) {

  public boolean isStaff() {
    return "doctor".equals(role) || "admin".equals(role);
  }

  public boolean isAdmin() {
    return "admin".equals(role);
  }
}
