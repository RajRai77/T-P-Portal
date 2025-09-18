package com.fsd_CSE.TnP_Connect.util;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

@Component
public class JwtUtil {

    // Generates a secure, cryptographic key for signing the token
    private final Key key = Keys.secretKeyFor(SignatureAlgorithm.HS256);

    // Token valid for 24 hours (in milliseconds)
    private final long expirationTime = 86400000;

    public String generateToken(String email, String role, Integer id) {
        return Jwts.builder()
                .setSubject(email)
                .claim("role", role) // Embeds whether they are STUDENT or ADMIN
                .claim("id", id)     // Embeds their database ID
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expirationTime))
                .signWith(key)
                .compact();
    }
}