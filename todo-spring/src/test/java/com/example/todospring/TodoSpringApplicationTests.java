package com.example.todospring;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
@Disabled("Requires a database, will be enabled later with Testcontainers")
class TodoSpringApplicationTests {

    @Test
    void contextLoads() {
    }

}
