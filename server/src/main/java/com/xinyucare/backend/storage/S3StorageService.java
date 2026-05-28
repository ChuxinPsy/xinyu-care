package com.xinyucare.backend.storage;

import com.xinyucare.backend.config.AppProperties;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.util.Objects;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

public class S3StorageService implements StorageService {

  private final S3Client s3Client;
  private final String bucket;
  private final String publicBaseUrl;

  public S3StorageService(AppProperties properties) {
    AppProperties.S3 s3 = properties.getStorage().getS3();
    this.bucket = Objects.requireNonNull(s3.getBucket(), "S3 bucket is required");
    this.publicBaseUrl = Objects.requireNonNullElse(s3.getPublicBaseUrl(), "");
    var builder = S3Client.builder()
        .region(Region.of(Objects.requireNonNullElse(s3.getRegion(), "ap-guangzhou")))
        .credentialsProvider(StaticCredentialsProvider.create(
            AwsBasicCredentials.create(s3.getAccessKey(), s3.getSecretKey())
        ));
    if (s3.getEndpoint() != null && !s3.getEndpoint().isBlank()) {
      builder.endpointOverride(URI.create(s3.getEndpoint()));
    }
    this.s3Client = builder.build();
  }

  @Override
  public StorageObject put(String bucket, String path, MultipartFile file) throws IOException {
    s3Client.putObject(
        PutObjectRequest.builder()
            .bucket(this.bucket)
            .key(bucket + "/" + path)
            .contentType(file.getContentType())
            .build(),
        RequestBody.fromInputStream(file.getInputStream(), file.getSize())
    );
    return new StorageObject(bucket, path, publicUrl(bucket, path));
  }

  @Override
  public void delete(String bucket, String path) {
    s3Client.deleteObject(DeleteObjectRequest.builder().bucket(this.bucket).key(bucket + "/" + path).build());
  }

  @Override
  public String publicUrl(String bucket, String path) {
    return publicBaseUrl + "/" + bucket + "/" + path;
  }

  @Override
  public InputStream load(String bucket, String path) {
    return s3Client.getObject(GetObjectRequest.builder().bucket(this.bucket).key(bucket + "/" + path).build());
  }
}
