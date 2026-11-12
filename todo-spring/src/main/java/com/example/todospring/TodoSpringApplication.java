package com.example.todospring;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
public class TodoSpringApplication {

    public static void main(String[] args) {

        System.out.println("DEBUG ENV SPRING_DATASOURCE_URL: " +
                System.getenv("SPRING_DATASOURCE_URL"));

        SpringApplication.run(TodoSpringApplication.class, args);
    }

}
