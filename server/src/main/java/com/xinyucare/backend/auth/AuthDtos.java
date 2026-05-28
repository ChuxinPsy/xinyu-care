package com.xinyucare.backend.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Map;

public final class AuthDtos {

  private AuthDtos() {
  }

  public record LoginRequest(
      @NotBlank(message = "账号不能为空")
      String usernameOrEmail,
      @NotBlank(message = "密码不能为空")
      String password
  ) {
  }

  public record SignupRequest(
      @NotBlank(message = "用户名不能为空")
      @Size(min = 2, max = 20, message = "用户名长度需在2到20之间")
      String username,
      @NotBlank(message = "密码不能为空")
      @Size(min = 6, max = 128, message = "密码长度需在6到128之间")
      String password,
      String role,
      String verificationCode,
      String email
  ) {
  }

  public record SessionEnvelope(
      String accessToken,
      Map<String, Object> user,
      Map<String, Object> profile
  ) {
  }
}
