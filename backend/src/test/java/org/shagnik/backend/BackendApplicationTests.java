package org.shagnik.backend;

import org.junit.jupiter.api.Test;
import org.shagnik.backend.config.EnvLoader;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.test.context.ContextConfiguration;

@SpringBootTest
@ContextConfiguration(initializers = BackendApplicationTests.EnvTestInitializer.class)
class BackendApplicationTests {

    public static class EnvTestInitializer implements ApplicationContextInitializer<ConfigurableApplicationContext> {
        @Override
        public void initialize(ConfigurableApplicationContext applicationContext) {
            EnvLoader.load();
        }
    }

    @Test
    void contextLoads() {
    }

}

