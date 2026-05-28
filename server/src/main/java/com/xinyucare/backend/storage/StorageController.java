package com.xinyucare.backend.storage;

import com.xinyucare.backend.common.ApiException;
import com.xinyucare.backend.common.ResponseBodyBuilder;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.io.InputStream;
import java.net.URLConnection;
import java.util.List;
import java.util.Map;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/storage")
public class StorageController {

  private final StorageService storageService;
  private final AntPathMatcher pathMatcher = new AntPathMatcher();

  public StorageController(StorageService storageService) {
    this.storageService = storageService;
  }

  @PostMapping("/{bucket}/upload")
  public Map<String, Object> upload(
      @PathVariable String bucket,
      @RequestParam("path") String path,
      @RequestParam("file") MultipartFile file) throws IOException {
    StorageObject object = storageService.put(bucket, path, file);
    return ResponseBodyBuilder.ok(Map.of("path", object.path(), "publicUrl", object.publicUrl()));
  }

  @DeleteMapping("/{bucket}")
  public Map<String, Object> delete(@PathVariable String bucket, @RequestBody Map<String, Object> payload) {
    Object rawPaths = payload.get("paths");
    if (!(rawPaths instanceof List<?> paths)) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "缺少 paths");
    }
    for (Object item : paths) {
      storageService.delete(bucket, String.valueOf(item));
    }
    return ResponseBodyBuilder.ok();
  }

  @GetMapping("/public/**")
  public ResponseEntity<InputStreamResource> publicFile(HttpServletRequest request) throws IOException {
    String pattern = (String) request.getAttribute("org.springframework.web.servlet.HandlerMapping.bestMatchingPattern");
    String pathWithinHandler = (String) request.getAttribute("org.springframework.web.servlet.HandlerMapping.pathWithinHandlerMapping");
    String remainder = pathMatcher.extractPathWithinPattern(pattern, pathWithinHandler);
    String[] segments = remainder.split("/", 2);
    if (segments.length != 2) {
      throw new ApiException(HttpStatus.NOT_FOUND, "文件不存在");
    }
    String bucket = segments[0];
    String path = segments[1];
    InputStream stream = storageService.load(bucket, path);
    String fileName = path.contains("/") ? path.substring(path.lastIndexOf('/') + 1) : path;
    String contentType = URLConnection.guessContentTypeFromName(fileName);
    return ResponseEntity.ok()
        .header(HttpHeaders.CACHE_CONTROL, "public, max-age=3600")
        .contentType(contentType == null ? MediaType.APPLICATION_OCTET_STREAM : MediaType.parseMediaType(contentType))
        .body(new InputStreamResource(stream));
  }
}
