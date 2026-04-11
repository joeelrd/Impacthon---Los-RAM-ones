package com.localfold.backend.controller;

import com.localfold.backend.dto.AuthDTO.LoginRequest;
import com.localfold.backend.dto.AuthDTO.RegisterRequest;
import com.localfold.backend.dto.AuthDTO.AuthResponse;
import com.localfold.backend.model.User;
import com.localfold.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        if (userRepository.existsByEmail(request.email)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "Este correo electrónico ya está registrado."));
        }

        // Crear usuario (password plano para hackathon para eficiencia, en prod debería estar hasheado)
        User newUser = new User(request.name, request.email, request.password);
        userRepository.save(newUser);

        // Retornar la nueva sesión directamente
        String tokenDummy = UUID.randomUUID().toString();
        return ResponseEntity.ok(new AuthResponse(newUser.getId(), newUser.getName(), newUser.getEmail(), tokenDummy, newUser.isPremium()));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        Optional<User> userOpt = userRepository.findByEmail(request.email);
        
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Usuario no encontrado."));
        }

        User user = userOpt.get();
        if (!user.getPassword().equals(request.password)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Contraseña incorrecta."));
        }

        // Simulación de generador de sesión rápida
        String pseudoToken = UUID.randomUUID().toString() + "-" + user.getId();
        return ResponseEntity.ok(new AuthResponse(user.getId(), user.getName(), user.getEmail(), pseudoToken, user.isPremium()));
    }
}
