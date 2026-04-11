package com.localfold.backend.dto;

public class AuthDTO {
    
    public static class LoginRequest {
        public String email;
        public String password;
    }

    public static class RegisterRequest {
        public String name;
        public String email;
        public String password;
    }

    public static class AuthResponse {
        public Long id;
        public String name;
        public String email;
        public String token; // Token ficticio simple para mantener sesion
        public boolean isPremium;

        public AuthResponse(Long id, String name, String email, String token, boolean isPremium) {
            this.id = id;
            this.name = name;
            this.email = email;
            this.token = token;
            this.isPremium = isPremium;
        }
    }
}
