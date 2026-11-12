package com.example.todospring.controller;

import com.example.todospring.dto.TaskRequestDTO;
import com.example.todospring.dto.TaskResponseDTO;
import com.example.todospring.model.Task;
import com.example.todospring.model.User;
import com.example.todospring.repository.UserRepository;
import com.example.todospring.security.JwtService;
import com.example.todospring.service.TaskNotFoundException;
import com.example.todospring.service.TaskService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.cache.CacheManager;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TaskController.class)
public class TaskControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TaskService taskService;

    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private CacheManager cacheManager;

    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        User user = new User();
        user.setId(1L);
        when(userRepository.findByEmail(anyString())).thenReturn(Optional
                .of(user));

        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(
                        "test@example.com", null,
                        List.of(new SimpleGrantedAuthority("ROLE_USER")));
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    @Test
    void shouldCreateTaskReturn201() throws Exception {

        TaskRequestDTO request = new TaskRequestDTO();
        request.setDescription("Купить хлеб");
        request.setPriority(Task.Priority.HIGH);
        request.setIsCompleted(false);

        TaskResponseDTO response = TaskResponseDTO.builder()
                .id(1L)
                .userTaskNumber(1L)
                .description("Купить хлеб")
                .priority(Task.Priority.HIGH)
                .isCompleted(false)
                .build();

        when(taskService.createTask(any(TaskRequestDTO.class), eq(1L)))
                .thenReturn(response);

        mockMvc.perform(post("/api/tasks")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.userTaskNumber")
                        .value(1L))
                .andExpect(jsonPath("$.description")
                        .value("Купить хлеб"))
                .andExpect(jsonPath("$.priority")
                        .value("HIGH"));
    }

    @Test
    void shouldReturn400DescriptionEmpty() throws Exception {
        TaskRequestDTO request = new TaskRequestDTO();
        request.setDescription("");
        request.setPriority(Task.Priority.HIGH);

        mockMvc.perform(post("/api/tasks")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldReturnTaskById() throws Exception {
        TaskResponseDTO response = TaskResponseDTO.builder()
                .id(1L)
                .description("Купить хлеб")
                .priority(Task.Priority.HIGH)
                .isCompleted(false)
                .build();

        when(taskService.getTaskById(1L, 1L)).thenReturn(response);

        mockMvc.perform(get("/api/tasks/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.description")
                        .value("Купить хлеб"));
    }

    @Test
    void shouldReturn404NotFound() throws Exception {
        when(taskService.getTaskById(99L, 1L))
                .thenThrow(new TaskNotFoundException(
                        "Задача не найдена"));

        mockMvc.perform(get("/api/tasks/99"))
                .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.message").value(
                "Задача не найдена"));
    }

    @Test
    void shouldDeleteTaskReturn204() throws Exception {
        mockMvc.perform(delete("/api/tasks/1"))
                .andExpect(status().isNoContent());
    }

    @Test
    void shouldReturn404DeleteNotExist() throws Exception {

        doThrow(new TaskNotFoundException(
                        "Задача не найдена"))
                .when(taskService).deleteTask(99L, 1L);

        mockMvc.perform(delete("/api/tasks/99"))
                .andExpect(status().isNotFound());
    }
}
