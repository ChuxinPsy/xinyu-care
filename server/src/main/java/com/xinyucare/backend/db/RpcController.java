package com.xinyucare.backend.db;

import com.xinyucare.backend.auth.AuthUser;
import com.xinyucare.backend.common.ResponseBodyBuilder;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/rpc")
public class RpcController {

  private final GenericDataService genericDataService;

  public RpcController(GenericDataService genericDataService) {
    this.genericDataService = genericDataService;
  }

  @PostMapping("/{name}")
  public Map<String, Object> rpc(
      @PathVariable String name,
      @RequestBody Map<String, Object> payload,
      Authentication authentication) {
    AuthUser authUser = authentication != null && authentication.getPrincipal() instanceof AuthUser user ? user : null;
    return switch (name) {
      case "increment_view_count" -> genericDataService.incrementCounter(
          "healing_contents",
          String.valueOf(payload.get("content_id")),
          "view_count",
          authUser
      );
      case "increment_like_count" -> genericDataService.incrementCounter(
          "healing_contents",
          String.valueOf(payload.get("content_id")),
          "like_count",
          authUser
      );
      case "verify_and_use_code" -> ResponseBodyBuilder.ok(
          genericDataService.verifyAndUseCode(String.valueOf(payload.get("p_code")), String.valueOf(payload.get("p_user_id")))
      );
      case "link_username_to_user" -> ResponseBodyBuilder.ok(true);
      default -> Map.of("error", "Unsupported RPC: " + name);
    };
  }
}
