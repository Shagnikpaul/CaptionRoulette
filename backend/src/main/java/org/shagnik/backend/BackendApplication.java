package org.shagnik.backend;

import io.github.cdimascio.dotenv.Dotenv;
import io.github.cdimascio.dotenv.DotenvEntry;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class BackendApplication {

    public static void main(String[] args) {
        // Load .env file
        Dotenv dotenv = Dotenv.configure()
                .ignoreIfMissing() // Prevents crashing if .env is missing (e.g., in production)
                .load();

        // Copy dotenv variables into System properties so Spring Boot can read them
        for (DotenvEntry entry : dotenv.entries()) {
            System.setProperty(entry.getKey(), entry.getValue());
        }
        SpringApplication.run(BackendApplication.class, args);
    }

}
