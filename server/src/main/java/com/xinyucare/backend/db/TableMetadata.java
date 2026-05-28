package com.xinyucare.backend.db;

import java.util.List;
import java.util.Set;

public record TableMetadata(
    String tableName,
    Set<String> columns,
    Set<String> jsonColumns,
    Set<String> immutableColumns,
    List<String> defaultOrder
) {
}
