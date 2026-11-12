package com.example.todospring;

import com.example.todospring.dto.TaskRequestDTO;
import com.example.todospring.model.Task;
import com.example.todospring.repository.TaskRepository;
import com.example.todospring.security.JwtAuthFilter;
import com.example.todospring.security.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
public class TaskIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer postgres = new PostgreSQLContainer(
            "postgres:16-alpine");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private JwtAuthFilter jwtAuthFilter;
    @Autowired
    private JwtService jwtService;

    @Test
    void shouldCreateTaskSaveToDatabase() throws Exception {

        String token = jwtService.generateToken("user@example.com");

        TaskRequestDTO request = new TaskRequestDTO();
        request.setDescription("Интеграционная задача");
        request.setPriority(Task.Priority.HIGH);

        mockMvc.perform(post("/api/tasks")
                        .header("Authorization",
                                "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.description").value(
                        "Интеграционная задача"))
                .andExpect(jsonPath("$.userTaskNumber").value(
                        4L));

        var tasks = taskRepository.findAll();
        assertThat(tasks).anyMatch(t -> t.getDescription()
                .equals("Интеграционная задача"));
    }
}
