package com.xinyucare.backend;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
@ConfigurationPropertiesScan
public class XinyuCareBackendApplication {

  public static void main(String[] args) {
    loadDotenv();
    SpringApplication.run(XinyuCareBackendApplication.class, args);
  }

  private static void loadDotenv() {
    for (Path candidate : List.of(Path.of("../.env"), Path.of(".env"))) {
      if (!Files.exists(candidate)) {
        continue;
      }
      try {
        for (String rawLine : Files.readAllLines(candidate)) {
          String line = rawLine.trim();
          if (line.isEmpty() || line.startsWith("#")) {
            continue;
          }
          int separator = line.indexOf('=');
          if (separator <= 0) {
            continue;
          }
          String key = line.substring(0, separator).trim();
          String value = line.substring(separator + 1).trim();
          if (key.isEmpty() || System.getProperty(key) != null || System.getenv(key) != null) {
            continue;
          }
          System.setProperty(key, value);
        }
        return;
      } catch (IOException ignored) {
      }
    }
  }
}
