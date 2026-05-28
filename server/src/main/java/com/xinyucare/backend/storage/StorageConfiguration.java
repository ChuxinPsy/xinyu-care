package com.xinyucare.backend.storage;

import com.xinyucare.backend.config.AppProperties;
import java.io.IOException;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class StorageConfiguration {

  @Bean
  StorageService storageService(AppProperties properties) throws IOException {
    if ("s3".equalsIgnoreCase(properties.getStorage().getMode())) {
      return new S3StorageService(properties);
    }
    return new FilesystemStorageService(properties);
  }
}
