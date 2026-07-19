package org.shagnik.backend;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import java.io.File;
import java.nio.file.Files;
import java.util.List;
import io.lettuce.core.RedisClient;
import io.lettuce.core.api.StatefulRedisConnection;

@Disabled("Temporary diagnostic test")
public class RedisConnectionTest {

    @Test
    public void testManualEnvLoadAndConnect() {
        System.out.println("--- Loading .env file manually ---");
        File envFile = new File(".env");
        if (!envFile.exists()) {
            System.out.println(".env file does not exist!");
            return;
        }

        try {
            List<String> lines = Files.readAllLines(envFile.toPath());
            for (String line : lines) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#")) {
                    continue;
                }
                int eqIndex = line.indexOf('=');
                if (eqIndex > 0) {
                    String key = line.substring(0, eqIndex).trim();
                    String value = line.substring(eqIndex + 1).trim();
                    if ((value.startsWith("\"") && value.endsWith("\"")) || 
                        (value.startsWith("'") && value.endsWith("'"))) {
                        value = value.substring(1, value.length() - 1);
                    }
                    System.setProperty(key, value);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        String redisUrl = System.getProperty("REDIS_URL");
        try {
            RedisClient client = RedisClient.create(redisUrl);
            StatefulRedisConnection<String, String> connection = client.connect();
            connection.close();
            client.shutdown();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}

