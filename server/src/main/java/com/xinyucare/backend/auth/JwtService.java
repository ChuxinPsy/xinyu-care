package com.xinyucare.backend.auth;

import com.xinyucare.backend.config.AppProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

  private final SecretKey signingKey;
  private final long expirationSeconds;

  public JwtService(AppProperties properties) {
    byte[] keyBytes = properties.getJwtSecret().length() >= 32
        ? properties.getJwtSecret().getBytes()
        : Decoders.BASE64.decode("eGlueXUtY2FyZS1kZXYtc2VjcmV0LWtleS1mb3Itand0LXNpZ25pbmc=");
    this.signingKey = Keys.hmacShaKeyFor(keyBytes);
    this.expirationSeconds = properties.getJwtExpirationSeconds();
  }

  public String issueToken(AuthUser user) {
    Instant now = Instant.now();
    return Jwts.builder()
        .subject(user.id())
        .claim("username", user.username())
        .claim("email", user.email())
        .claim("role", user.role())
        .issuedAt(Date.from(now))
        .expiration(Date.from(now.plusSeconds(expirationSeconds)))
        .signWith(signingKey)
        .compact();
  }

  public AuthUser parseToken(String token) {
    Claims claims = Jwts.parser()
        .verifyWith(signingKey)
        .build()
        .parseSignedClaims(token)
        .getPayload();
    return new AuthUser(
        claims.getSubject(),
        claims.get("username", String.class),
        claims.get("email", String.class),
        claims.get("role", String.class)
    );
  }
}
