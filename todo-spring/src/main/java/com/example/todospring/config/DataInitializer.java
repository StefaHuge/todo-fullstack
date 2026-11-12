package com.example.todospring.config;

import com.example.todospring.model.Task;
import com.example.todospring.model.Task.Priority;
import com.example.todospring.model.User;
import com.example.todospring.repository.TaskRepository;
import com.example.todospring.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.count() == 0) {
            log.info("Создаю тестового пользователя...");

            User user = new User();
            user.setEmail("user@example.com");
            user.setPassword(passwordEncoder.encode(
                    "password123"));
            userRepository.save(user);

            Task task1 = new Task();
            task1.setDescription("Изучить Spring Boot");
            task1.setPriority(Priority.HIGH);
            task1.setCompleted(false);
            task1.setUser(user);
            task1.setUserTaskNumber(1L);

            Task task2 = new Task();
            task2.setDescription("Сделать пет-проект");
            task2.setPriority(Priority.HIGH);
            task2.setCompleted(false);
            task2.setUser(user);
            task2.setUserTaskNumber(2L);

            Task task3 = new Task();
            task3.setDescription("Прочитать документацию");
            task3.setPriority(Priority.MEDIUM);
            task3.setCompleted(true);
            task3.setUser(user);
            task3.setUserTaskNumber(3L);

            taskRepository.save(task1);
            taskRepository.save(task2);
            taskRepository.save(task3);

            log.info(
                    "Создан пользователь: user@example.com / password123");
        }
    }
}
