package com.xinyucare.backend.db;

public record FilterCondition(
    String op,
    String field,
    Object value
) {
}
