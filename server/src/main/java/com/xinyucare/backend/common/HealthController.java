package com.xinyucare.backend.common;

import com.xinyucare.backend.config.AppProperties;
import java.time.Instant;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class HealthController {

  private final AppProperties appProperties;

  public HealthController(AppProperties appProperties) {
    this.appProperties = appProperties;
  }

  @GetMapping("/health")
  public Map<String, Object> health() {
    return Map.of(
        "ok", true,
        "service", "xinyu-care-backend",
        "timestamp", Instant.now().toString(),
        "storageMode", appProperties.getStorage().getMode()
    );
  }
}
