package com.example.todospring.service;

import com.example.todospring.dto.TaskRequestDTO;
import com.example.todospring.dto.TaskResponseDTO;
import com.example.todospring.model.Task;
import com.example.todospring.model.User;
import com.example.todospring.repository.TaskRepository;
import com.example.todospring.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class TaskServiceTest {

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private TaskService taskService;

    @Test
    void shouldCreateTask() {

        Long userId = 1L;
        User user = new User();
        user.setId(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        when(taskRepository.findMaxUserTaskNumberByUserId(userId))
                .thenReturn(null);

        TaskRequestDTO request = new TaskRequestDTO();
        request.setDescription("Купить хлеб");
        request.setPriority(Task.Priority.HIGH);
        request.setIsCompleted(false);


        Task savedTask = new Task();
        savedTask.setId(1L);
        savedTask.setUserTaskNumber(1L);
        savedTask.setDescription("Купить хлеб");
        savedTask.setPriority(Task.Priority.HIGH);
        savedTask.setCompleted(false);
        savedTask.setUser(user);
        when(taskRepository.save(any(Task.class))).thenReturn(savedTask);

        TaskResponseDTO result = taskService.createTask(request, userId);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getUserTaskNumber()).isEqualTo(1L);
        assertThat(result.getDescription()).isEqualTo("Купить хлеб");
        assertThat(result.getPriority()).isEqualTo(Task.Priority.HIGH);
        assertThat(result.getIsCompleted()).isFalse();

        verify(taskRepository).save(argThat(task ->
                task.getUser() != null && task.getUser().getId()
                        .equals(userId) && task.getUserTaskNumber()
                        .equals(1L)));
    }

    @Test
    void shouldIncrementUserTaskNumber() {
        Long userId = 1L;
        User user = new User();
        user.setId(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        when(taskRepository.findMaxUserTaskNumberByUserId(userId))
                .thenReturn(3L);

        TaskRequestDTO request = new TaskRequestDTO();
        request.setDescription("Новая задача");
        request.setPriority(Task.Priority.MEDIUM);
        request.setIsCompleted(false);

        Task savedTask = new Task();
        savedTask.setId(4L);
        savedTask.setUserTaskNumber(4L);
        savedTask.setDescription("Новая задача");
        savedTask.setPriority(Task.Priority.MEDIUM);
        savedTask.setCompleted(false);
        savedTask.setUser(user);
        when(taskRepository.save(any(Task.class))).thenReturn(savedTask);

        TaskResponseDTO result = taskService.createTask(request, userId);
        assertThat(result.getUserTaskNumber()).isEqualTo(4L);

        verify(taskRepository).save(argThat(task -> task
                .getUserTaskNumber().equals(4L)));
    }

    @Test
    void shouldReturnTaskWhenExists() {

        Long userId = 1L;
        User user = new User();
        user.setId(userId);

        Task task = new Task();
        task.setId(1L);
        task.setDescription("Купить хлеб");
        task.setPriority(Task.Priority.HIGH);
        task.setCompleted(false);
        task.setUser(user);

        when(taskRepository.findByIdAndUserId(1L, userId))
                .thenReturn(Optional.of(task));

        TaskResponseDTO result = taskService.getTaskById(1L, userId);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getDescription()).isEqualTo("Купить хлеб");
    }

    @Test
    void shouldThrowExceptionWhenTaskNotFound() {
        when(taskRepository.findByIdAndUserId(99L, 99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> taskService.getTaskById(99L, 99L))
                .isInstanceOf(TaskNotFoundException.class)
                .hasMessageContaining("99");
    }

    @Test
    void shouldUpdateTaskWhenExists() {
        Long taskId = 1L;
        Long userId = 1L;
        User user = new User();
        user.setId(userId);

        Task existingTask = new Task();
        existingTask.setId(taskId);
        existingTask.setUser(user);
        existingTask.setDescription("Старое описание");
        existingTask.setPriority(Task.Priority.LOW);
        existingTask.setCompleted(false);

        when(taskRepository.findByIdAndUserId(taskId, userId))
                .thenReturn(Optional.of(existingTask));

        TaskRequestDTO request = new TaskRequestDTO();
        request.setDescription("Новое описание");
        request.setPriority(Task.Priority.HIGH);
        request.setIsCompleted(true);

        when(taskRepository.save(any(Task.class))).thenReturn(existingTask);

        TaskResponseDTO result = taskService.updateTask(taskId,
                request, userId);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(taskId);
        assertThat(result.getDescription()).isEqualTo("Новое описание");
        assertThat(result.getPriority()).isEqualTo(Task.Priority.HIGH);
        assertThat(result.getIsCompleted()).isTrue();

        verify(taskRepository, times(1)).save(any(Task.class));
    }

    @Test
    void shouldThrowExceptionWhenUpdatingNonExistentTask() {
        Long taskId = 99L;
        Long userId = 1L;
        when(taskRepository.findByIdAndUserId(taskId, userId))
                .thenReturn(Optional.empty());

        TaskRequestDTO request = new TaskRequestDTO();
        request.setDescription("Новое описание");
        request.setPriority(Task.Priority.HIGH);
        request.setIsCompleted(true);

        assertThatThrownBy(() -> taskService.updateTask(taskId, request,
                userId))
                .isInstanceOf(TaskNotFoundException.class)
                .hasMessageContaining("99");

        verify(taskRepository, never()).save(any(Task.class));
    }

    @Test
    void shouldDeleteTaskWhenExists() {
        Long taskId = 1L;
        Long userId = 1L;

        Task taskToDelete = new Task();
        taskToDelete.setId(taskId);
        taskToDelete.setUserTaskNumber(1L);

        Task remainingTask = new Task();
        remainingTask.setId(2L);
        remainingTask.setUserTaskNumber(2L);

        when(taskRepository.findByIdAndUserId(taskId, userId))
                .thenReturn(Optional.of(taskToDelete));

        when(taskRepository.findAllByUserIdOrderByUserTaskNumber(userId))
                .thenReturn(List.of(remainingTask));

        taskService.deleteTask(taskId, userId);

        verify(taskRepository).delete(taskToDelete);
        verify(taskRepository).saveAll(argThat(tasks -> {
            List<Task> list = (List<Task>) tasks;
            return list.size() == 1 && list.get(0).getUserTaskNumber()
                    .equals(1L);
        }));
    }
    @Test
    void shouldThrowExceptionWhenDeletingNonexistentTask() {
        Long taskId = 99L;
        Long userId = 1L;

        when(taskRepository.findByIdAndUserId(taskId, userId))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> taskService.deleteTask(taskId, userId))
                .isInstanceOf(TaskNotFoundException.class)
                .hasMessageContaining("99");

        verify(taskRepository, never()).delete(any());
        verify(taskRepository, never()).saveAll(any());
    }
}