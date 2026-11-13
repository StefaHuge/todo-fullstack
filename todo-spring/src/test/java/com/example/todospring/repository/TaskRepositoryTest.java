package com.example.todospring.repository;

import com.example.todospring.config.CacheConfig;
import com.example.todospring.model.Task;
import com.example.todospring.model.Task.Priority;
import com.example.todospring.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ComponentScan(excludeFilters = @ComponentScan.Filter(
        type = FilterType.ASSIGNABLE_TYPE,
        classes = CacheConfig.class))
class TaskRepositoryTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer postgres = new PostgreSQLContainer(
            "postgres:16-alpine");

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private UserRepository userRepository;

    private User user;
    private User otherUser;

    @BeforeEach
    void setUp() {
        taskRepository.deleteAll();
        userRepository.deleteAll();

        user = new User();
        user.setEmail("user@example.com");
        user.setPassword("encoded");
        user = userRepository.save(user);

        otherUser = new User();
        otherUser.setEmail("other@example.com");
        otherUser.setPassword("encoded");
        otherUser = userRepository.save(otherUser);
    }

    private Task newTask(String description, boolean completed, Priority priority,
                         User owner, long number) {
        Task task = new Task();
        task.setDescription(description);
        task.setCompleted(completed);
        task.setPriority(priority);
        task.setUser(owner);
        task.setUserTaskNumber(number);
        return task;
    }

    @Test
    void shouldSaveAndFindTaskById() {
        Task task = taskRepository.save(newTask("Test task",
                false, Priority.HIGH, user, 1L));

        Optional<Task> found = taskRepository.findById(task.getId());

        assertThat(found).isPresent();
        assertThat(found.get().getDescription()).isEqualTo("Test task");
        assertThat(found.get().getUser().getId()).isEqualTo(user.getId());
    }

    @Test
    void shouldFindOnlyTasksOfGivenUser() {
        taskRepository.save(newTask("User task 1", false,
                Priority.LOW, user, 1L));
        taskRepository.save(newTask("User task 2", true,
                Priority.HIGH, user, 2L));
        taskRepository.save(newTask("Other user task", false,
                Priority.MEDIUM, otherUser, 1L));

        List<Task> userTasks = taskRepository
                .findAllByUserIdOrderByUserTaskNumber(user.getId());

        assertThat(userTasks).hasSize(2);
        assertThat(userTasks).extracting(Task::getDescription)
                .containsExactly("User task 1", "User task 2");
    }

    @Test
    void shouldPaginateAndSortTasks() {
        for (int i = 1; i <= 5; i++) {
            taskRepository.save(newTask("Task " + i,
                    false, Priority.MEDIUM, user, i));
        }

        Page<Task> page = taskRepository.findByUserId(
                user.getId(),
                PageRequest.of(0,2, Sort.by(
                        Sort.Direction.DESC, "userTaskNumber"
                ))
        );

        assertThat(page.getTotalElements()).isEqualTo(5);
        assertThat(page.getTotalPages()).isEqualTo(3);
        assertThat(page.getContent()).hasSize(2);
        assertThat(page.getContent().get(0).getUserTaskNumber())
                .isEqualTo(5L);
        assertThat(page.getContent().get(1).getUserTaskNumber())
                .isEqualTo(4L);
    }

    @Test
    void shouldFilterByCompletedStatus() {
        taskRepository.save(newTask("Active", false,
                Priority.LOW, user, 1L));
        taskRepository.save(newTask("Done", true,
                Priority.HIGH, user, 2L));

        List<Task> active = taskRepository.findByIsCompletedFalse();
        List<Task> done = taskRepository.findByIsCompletedTrue();

        assertThat(active).extracting(Task::getDescription)
                .containsExactly("Active");
        assertThat(done).extracting(Task::getDescription)
                .containsExactly("Done");
    }

    @Test
    void shouldDeleteTaskAndNotAffectOtherUsers() {
        Task userTask = taskRepository.save(newTask("User task",
                false, Priority.LOW, user, 1L));
        Task otherTask = taskRepository.save(newTask("Other task",
                false, Priority.LOW, otherUser, 1L));

        taskRepository.deleteById(userTask.getId());

        assertThat(taskRepository.findById(userTask.getId())).isEmpty();
        assertThat(taskRepository.findById(otherTask.getId())).isPresent();
    }

    @Test
    void shouldFindMaxUserTaskNumber() {
        taskRepository.save(newTask("A", false,
                Priority.LOW, user, 3L));
        taskRepository.save(newTask("B", false,
                Priority.LOW, user, 7L));
        taskRepository.save(newTask("C", false,
                Priority.LOW, user, 5L));

        Long max = taskRepository.findMaxUserTaskNumberByUserId(user.getId());
        assertThat(max).isEqualTo(7L);
    }

    @Test
    void shouldFindByIdAndUserId() {
        Task userTask = taskRepository.save(newTask("User task",
                false, Priority.LOW, user, 1L));
        taskRepository.save(newTask("Other task", false,
                Priority.LOW, otherUser, 1L));

        assertThat(taskRepository.findByIdAndUserId(userTask.getId(),
                user.getId())).isPresent();
        assertThat(taskRepository.findByIdAndUserId(userTask.getId(),
                otherUser.getId())).isEmpty();
    }
}
