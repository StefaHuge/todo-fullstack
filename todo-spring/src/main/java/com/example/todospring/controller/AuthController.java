package com.example.todospring.controller;

import com.example.todospring.dto.AuthRequest;
import com.example.todospring.model.User;
import com.example.todospring.security.JwtService;
import com.example.todospring.service.RefreshTokenService;
import com.example.todospring.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;

    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> register(
            @Valid @RequestBody AuthRequest request) {
        try {
            User user = userService.registerUser(request.getEmail(),
                    request.getPassword());
            return ResponseEntity.ok(Map.of(
                    "accessToken", jwtService
                            .generateToken(user.getEmail()),
                    "refreshToken", refreshTokenService.issue(user),
                    "message", "Пользователь зарегистрирован"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, String>> login(
            @Valid @RequestBody AuthRequest request) {
        try {
            User user = userService.authenticateUser(request.getEmail(),
                    request.getPassword());
            return ResponseEntity.ok(Map.of(
                    "accessToken", jwtService.generateToken(
                            user.getEmail()),
                    "refreshToken", refreshTokenService.issue(user)));
        }catch (RuntimeException e) {
            return ResponseEntity.status(401).body(Map.of(
                    "error", e.getMessage()));
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<Map<String, String>> refresh(
            @RequestBody Map<String, String> body) {
        String raw = body.get("refreshToken");
        if (raw == null || raw.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Refresh token отсутствует");
        }
        User user = refreshTokenService.rotate(raw);
        return ResponseEntity.ok(Map.of(
                "accessToken", jwtService.generateToken(
                        user.getEmail()),
                "refreshToken", refreshTokenService.issue(user)));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestBody(required = false)
                                           Map<String, String> body) {
        if (body != null && body.get("refreshToken") != null) {
            refreshTokenService.revoke(body.get("refreshToken"));
        }
        return ResponseEntity.noContent().build();
    }
}
