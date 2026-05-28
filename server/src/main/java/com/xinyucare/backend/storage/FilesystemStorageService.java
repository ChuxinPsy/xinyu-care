package com.xinyucare.backend.storage;

import com.xinyucare.backend.config.AppProperties;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FilesystemStorageService implements StorageService {

  private final Path rootPath;
  private final String publicBaseUrl;

  public FilesystemStorageService(AppProperties properties) throws IOException {
    this.rootPath = Path.of(properties.getStorage().getFilesystemRoot()).normalize().toAbsolutePath();
    this.publicBaseUrl = properties.getStorage().getPublicBaseUrl();
    Files.createDirectories(rootPath);
  }

  @Override
  public StorageObject put(String bucket, String path, MultipartFile file) throws IOException {
    Path target = rootPath.resolve(bucket).resolve(path).normalize();
    Files.createDirectories(target.getParent());
    try (InputStream inputStream = file.getInputStream()) {
      Files.copy(inputStream, target, StandardCopyOption.REPLACE_EXISTING);
    }
    return new StorageObject(bucket, path, publicUrl(bucket, path));
  }

  @Override
  public void delete(String bucket, String path) {
    try {
      Files.deleteIfExists(rootPath.resolve(bucket).resolve(path).normalize());
    } catch (IOException ignored) {
    }
  }

  @Override
  public String publicUrl(String bucket, String path) {
    return publicBaseUrl + "/" + bucket + "/" + path;
  }

  @Override
  public InputStream load(String bucket, String path) throws IOException {
    return Files.newInputStream(rootPath.resolve(bucket).resolve(path).normalize());
  }
}
