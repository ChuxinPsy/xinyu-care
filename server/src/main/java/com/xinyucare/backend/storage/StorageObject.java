package com.xinyucare.backend.storage;

public record StorageObject(
    String bucket,
    String path,
    String publicUrl
) {
}
