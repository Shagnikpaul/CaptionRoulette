package org.shagnik.backend.config;

import java.io.File;
import java.nio.file.Files;
import java.util.List;

public class EnvLoader {
    
    public static void load() {
        // Find .env file in the root directory (CWD)
        File envFile = new File(".env");
        if (envFile.exists()) {
            try {
                List<String> lines = Files.readAllLines(envFile.toPath());
                for (String line : lines) {
                    line = line.trim();
                    // ignore comments in the .env file
                    if (line.isEmpty() || line.startsWith("#")) {
                        continue;
                    }
                    // parsing key=value pair
                    int eqIndex = line.indexOf('=');
                    if (eqIndex > 0) {
                        String key = line.substring(0, eqIndex).trim();
                        String value = line.substring(eqIndex + 1).trim();
                        // Strip surrounding quotes if present
                        if ((value.startsWith("\"") && value.endsWith("\"")) || 
                            (value.startsWith("'") && value.endsWith("'"))) {
                            value = value.substring(1, value.length() - 1);
                        }
                        System.setProperty(key, value);
                    }
                }
            } catch (Exception e) {
                System.out.println("Warning: Failed to load .env file: " + e.getMessage());
            }
        }
    }
}
