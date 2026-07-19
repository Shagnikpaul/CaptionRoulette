package org.shagnik.backend;

import org.shagnik.backend.config.EnvLoader;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class BackendApplication {

    static {
        // Load .env variables into System properties
        EnvLoader.load();
    }

    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }

}



