package com.example.todospring.service;

import com.example.todospring.model.RefreshToken;
import com.example.todospring.model.User;
import com.example.todospring.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private final RefreshTokenRepository repository;

    @Value("${auth.refresh.expiration-days:30}")
    private long expirationDays;

    @Scheduled(cron = "0 0 3 * * *", zone = "Europe/Moscow")
    @Transactional
    public void cleanupExpired() {
        int deleted = repository.deleteExpiredBefore(Instant.now());
        if (deleted > 0) {
            log.info("Очищено {} протухших refresh-токенов", deleted);
        } else {
            log.info("Протухших refresh-токенов не найдено");
        }
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void cleanupOnStartup() {
        int deleted = repository.deleteExpiredBefore(Instant.now());
        if (deleted > 0) {
            log.info("Очищено {} протухших refresh-токенов при старте", deleted);
        } else {
            log.info("Протухших refresh-токенов при старте не найдено");
        }
    }

    @Transactional
    public String issue(User user) {
        String raw = UUID.randomUUID() + "." + UUID.randomUUID();
        RefreshToken entity = new RefreshToken();
        entity.setUser(user);
        entity.setTokenHash(sha256(raw));
        entity.setExpiresAt(Instant.now().plus(expirationDays,
                ChronoUnit.DAYS));
        repository.save(entity);
        return raw;
    }

    @Transactional
    public User rotate(String raw) {
        RefreshToken stored = repository.findByTokenHash(sha256(raw))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Refresh token недействителен"));
        if (stored.getExpiresAt().isBefore(Instant.now())) {
            repository.delete(stored);
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Сессия истекла - войдите снова");
        }
        User user = stored.getUser();
        user.getEmail();
        repository.delete(stored);
        return user;
    }

    @Transactional
    public void revoke(String raw) {
        repository.findByTokenHash(sha256(raw))
                .ifPresent(repository::delete);
    }

    private String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest
                    .getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
