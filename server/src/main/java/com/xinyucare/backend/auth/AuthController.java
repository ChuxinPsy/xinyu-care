package com.xinyucare.backend.auth;

import com.xinyucare.backend.auth.AuthDtos.LoginRequest;
import com.xinyucare.backend.auth.AuthDtos.SessionEnvelope;
import com.xinyucare.backend.auth.AuthDtos.SignupRequest;
import java.util.LinkedHashMap;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private final AuthService authService;

  public AuthController(AuthService authService) {
    this.authService = authService;
  }

  @PostMapping("/signup")
  public SessionEnvelope signup(@Valid @RequestBody SignupRequest request) {
    return authService.signup(request);
  }

  @PostMapping("/login")
  public SessionEnvelope login(@Valid @RequestBody LoginRequest request) {
    return authService.login(request);
  }

  @PostMapping("/refresh")
  public SessionEnvelope refresh(Authentication authentication) {
    AuthUser user = authentication != null && authentication.getPrincipal() instanceof AuthUser authUser
        ? authUser
        : null;
    return authService.session(user);
  }

  @GetMapping("/session")
  public Map<String, Object> session(Authentication authentication) {
    AuthUser user = authentication != null && authentication.getPrincipal() instanceof AuthUser authUser
        ? authUser
        : null;
    SessionEnvelope envelope = authService.session(user);
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("session", envelope.user() == null ? null : Map.of("access_token", envelope.accessToken(), "user", envelope.user()));
    body.put("profile", envelope.profile());
    return body;
  }

  @PostMapping("/logout")
  public Map<String, Object> logout() {
    return Map.of("ok", true);
  }
}
