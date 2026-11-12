package com.example.todospring.controller;

import com.example.todospring.dto.TaskRequestDTO;
import com.example.todospring.dto.TaskResponseDTO;
import com.example.todospring.model.Task.Priority;
import com.example.todospring.repository.UserRepository;
import com.example.todospring.service.TaskService;
import com.example.todospring.service.TaskService.TaskStatistics;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TaskController {

    private final TaskService taskService;
    private final UserRepository userRepository;

    private Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext()
                .getAuthentication();
        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException(
                        "Пользователь не найден"))
                .getId();
    }

    @PostMapping
    public ResponseEntity<TaskResponseDTO> createTask(
           @Valid @RequestBody TaskRequestDTO request) {
        Long userId = getCurrentUserId();
        TaskResponseDTO task = taskService.createTask(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(task);
    }

    @GetMapping
    public ResponseEntity<Page<TaskResponseDTO>> getAllTasks(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size,
        @RequestParam(defaultValue = "createdAt") String sortBy,
        @RequestParam(defaultValue = "desc") String direction) {

        Long userId = getCurrentUserId();
        return ResponseEntity.ok(taskService.getAllTasks(userId, page, size,
                sortBy, direction));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TaskResponseDTO> getTaskById(
            @PathVariable Long id) {
        Long userId = getCurrentUserId();
        TaskResponseDTO task = taskService.getTaskById(id, userId);
        return ResponseEntity.ok(task);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TaskResponseDTO> updateTask(
            @PathVariable Long id,
            @Valid @RequestBody TaskRequestDTO request) {
        Long userId = getCurrentUserId();
        TaskResponseDTO task = taskService.updateTask(id, request, userId);
        return ResponseEntity.ok(task);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(@PathVariable Long id) {
        Long userId = getCurrentUserId();
        taskService.deleteTask(id, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/filter")
    public ResponseEntity<List<TaskResponseDTO>> getTasksByPriority(
            @RequestParam Priority priority) {
        List<TaskResponseDTO> tasks = taskService
                .getTasksByPriority(priority);

        return ResponseEntity.ok(tasks);
    }

    @GetMapping("/statistics")
    public ResponseEntity<TaskStatistics> getStatistics() {
        TaskStatistics stats = taskService.getStatistics();
        return ResponseEntity.ok(stats);
    }
}
