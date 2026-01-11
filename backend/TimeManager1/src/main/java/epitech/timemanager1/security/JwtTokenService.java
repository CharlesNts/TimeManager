package epitech.timemanager1.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.time.Instant;
import java.util.Date;
import java.util.Map;

@Service
public class JwtTokenService {

    private final Key key;
    private final long expirationSeconds;
    private final String issuer;

    public JwtTokenService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration:3600}") long expirationSeconds,
            @Value("${app.jwt.issuer:timemanager}") String issuer
    ) {
        this.key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(ensureBase64(secret)));
        this.expirationSeconds = expirationSeconds;
        this.issuer = issuer;
    }

    public String generate(String subject) {
        Instant now = Instant.now();
        return Jwts.builder()
                .setClaims(Map.of())
                .setSubject(subject)
                .setIssuer(issuer)
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(now.plusSeconds(expirationSeconds)))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public boolean isValid(String token) {
        try {
            parse(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public String getSubject(String token) {
        return parse(token).getBody().getSubject();
    }

    private Jws<Claims> parse(String token) {
        return Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
    }

    private static String ensureBase64(String s) {
        try {
            Decoders.BASE64.decode(s);
            return s;
        } catch (IllegalArgumentException ignore) {
            return io.jsonwebtoken.io.Encoders.BASE64.encode(s.getBytes());
        }
    }
}