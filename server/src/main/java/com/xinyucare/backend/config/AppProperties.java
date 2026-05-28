package com.xinyucare.backend.config;

import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public class AppProperties {

  private String jwtSecret;
  private long jwtExpirationSeconds;
  private List<String> corsOrigins = new ArrayList<>();
  private Storage storage = new Storage();

  public String getJwtSecret() {
    return jwtSecret;
  }

  public void setJwtSecret(String jwtSecret) {
    this.jwtSecret = jwtSecret;
  }

  public long getJwtExpirationSeconds() {
    return jwtExpirationSeconds;
  }

  public void setJwtExpirationSeconds(long jwtExpirationSeconds) {
    this.jwtExpirationSeconds = jwtExpirationSeconds;
  }

  public List<String> getCorsOrigins() {
    return corsOrigins;
  }

  public void setCorsOrigins(List<String> corsOrigins) {
    this.corsOrigins = corsOrigins;
  }

  public Storage getStorage() {
    return storage;
  }

  public void setStorage(Storage storage) {
    this.storage = storage;
  }

  public static class Storage {
    private String mode;
    private String filesystemRoot;
    private String publicBaseUrl;
    private S3 s3 = new S3();

    public String getMode() {
      return mode;
    }

    public void setMode(String mode) {
      this.mode = mode;
    }

    public String getFilesystemRoot() {
      return filesystemRoot;
    }

    public void setFilesystemRoot(String filesystemRoot) {
      this.filesystemRoot = filesystemRoot;
    }

    public String getPublicBaseUrl() {
      return publicBaseUrl;
    }

    public void setPublicBaseUrl(String publicBaseUrl) {
      this.publicBaseUrl = publicBaseUrl;
    }

    public S3 getS3() {
      return s3;
    }

    public void setS3(S3 s3) {
      this.s3 = s3;
    }
  }

  public static class S3 {
    private String bucket;
    private String endpoint;
    private String region;
    private String accessKey;
    private String secretKey;
    private String publicBaseUrl;

    public String getBucket() {
      return bucket;
    }

    public void setBucket(String bucket) {
      this.bucket = bucket;
    }

    public String getEndpoint() {
      return endpoint;
    }

    public void setEndpoint(String endpoint) {
      this.endpoint = endpoint;
    }

    public String getRegion() {
      return region;
    }

    public void setRegion(String region) {
      this.region = region;
    }

    public String getAccessKey() {
      return accessKey;
    }

    public void setAccessKey(String accessKey) {
      this.accessKey = accessKey;
    }

    public String getSecretKey() {
      return secretKey;
    }

    public void setSecretKey(String secretKey) {
      this.secretKey = secretKey;
    }

    public String getPublicBaseUrl() {
      return publicBaseUrl;
    }

    public void setPublicBaseUrl(String publicBaseUrl) {
      this.publicBaseUrl = publicBaseUrl;
    }
  }
}
