package com.example.todospring.service;

import com.example.todospring.dto.TaskRequestDTO;
import com.example.todospring.dto.TaskResponseDTO;
import com.example.todospring.model.Task;
import com.example.todospring.model.Task.Priority;
import com.example.todospring.model.User;
import com.example.todospring.repository.TaskRepository;
import com.example.todospring.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional
public class TaskService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
          "createdAt", "updatedAt", "description", "priority", "id");

    private TaskResponseDTO mapToDTO(Task task) {
        return TaskResponseDTO.builder()
                .id(task.getId())
                .userTaskNumber(task.getUserTaskNumber())
                .description(task.getDescription())
                .isCompleted(task.isCompleted())
                .priority(task.getPriority())
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .build();
    }

    public TaskResponseDTO createTask(TaskRequestDTO request, Long userId) {

        log.info("Создание новой задачи: {}", request.getDescription());

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException(
                        "Пользователь не найден"));

        Long maxNumber = taskRepository.findMaxUserTaskNumberByUserId(userId);
        Long nextNumber = (maxNumber != null ? maxNumber : 0) + 1;

        Task task = new Task();
        task.setDescription(request.getDescription());
        task.setCompleted(request.getIsCompleted() != null ? request
                .getIsCompleted() : false);
        task.setPriority(request.getPriority());
        task.setUser(user);
        task.setUserTaskNumber(nextNumber);

        Task savedTask = taskRepository.save(task);
        log.debug("Задача создана с ID: {}", savedTask.getId());
        return mapToDTO(savedTask);
    }

    @Transactional(readOnly = true)
    public Page<TaskResponseDTO> getAllTasks(Long userId, int page, int size,
                                             String sortBy, String direction) {

        if (!ALLOWED_SORT_FIELDS.contains(sortBy)) {
            throw new IllegalArgumentException(
                 "Недопустимое поле для сортировки: " + sortBy +
                 ". Допустимые: " + ALLOWED_SORT_FIELDS);
        }

        Sort.Direction dir;
        try {
            dir = Sort.Direction.fromString(direction);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException(
            "Направление сортировки должно быть 'asc' или 'desc'");
        }

        Sort sort = Sort.by(dir, sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);

        return taskRepository.findByUserId(userId, pageable)
                .map(this::mapToDTO);
    }

    @Cacheable(value = "tasks", key = "#id")
    public TaskResponseDTO getTaskById(Long id, Long userId) {
        Task task = taskRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new TaskNotFoundException("Задача с ID "
                + id + " не найдена"));
        return mapToDTO(task);
    }

    @CachePut(value = "tasks", key = "#id")
    public TaskResponseDTO updateTask(Long id, TaskRequestDTO request, Long userId) {
        Task task = taskRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new TaskNotFoundException("Задача с ID "
                + id + " не найдена"));

        task.setDescription(request.getDescription());
        task.setCompleted(request.getIsCompleted());
        task.setPriority(request.getPriority());

        Task updatedTask = taskRepository.save(task);
        return mapToDTO(updatedTask);
    }

    @Transactional
    public void deleteTask(Long id, Long userId) {
        log.warn("Удаление задачи с ID: {}", id);
        Task task = taskRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new TaskNotFoundException("Задача с ID " +
                        id + " не найдена"));

        taskRepository.delete(task);

        List<Task> remainingTasks = taskRepository
                .findAllByUserIdOrderByUserTaskNumber(userId);
        long counter = 1;
        for (Task t : remainingTasks) {
            t.setUserTaskNumber(counter++);
        }
        taskRepository.saveAll(remainingTasks);
    }

    @Transactional(readOnly = true)
    public List<TaskResponseDTO> getTasksByPriority(Priority priority) {
        return taskRepository.findByPriority(priority)
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TaskStatistics getStatistics() {
        long total = taskRepository.count();
        long completed = taskRepository.countByCompletionStatus(true);
        long pending = total - completed;

        return new TaskStatistics(total, completed, pending);
    }

    public record TaskStatistics(long total, long completed, long pending) {}
}
