package com.example.todospring.controller;

import com.example.todospring.dto.AuthRequest;
import com.example.todospring.model.User;
import com.example.todospring.security.JwtService;
import com.example.todospring.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;
    private final JwtService jwtService;

    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> register(
            @Valid @RequestBody AuthRequest request) {

        String email = request.getEmail();
        String password = request.getPassword();

        try {
            User user = userService.registerUser(email, password);
            String token = jwtService.generateToken(user.getEmail());

            return ResponseEntity.ok(Map.of(
                    "token", token,
                    "message", "Пользователь зарегистрирован"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, String>> login(
            @Valid@RequestBody AuthRequest request) {

        String email = request.getEmail();
        String password = request.getPassword();

        try {
            User user = userService.authenticateUser(email, password);
            String token = jwtService.generateToken(user.getEmail());

            return ResponseEntity.ok(Map.of("token", token));
        }catch (RuntimeException e) {
            return ResponseEntity.status(401).body(Map.of(
                    "error", e.getMessage()));
        }
    }
}
