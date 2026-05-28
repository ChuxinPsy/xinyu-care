package com.xinyucare.backend.storage;

import java.io.IOException;
import java.io.InputStream;
import org.springframework.web.multipart.MultipartFile;

public interface StorageService {

  StorageObject put(String bucket, String path, MultipartFile file) throws IOException;

  void delete(String bucket, String path);

  String publicUrl(String bucket, String path);

  InputStream load(String bucket, String path) throws IOException;
}
