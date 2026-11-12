package com.example.todospring.repository;

import com.example.todospring.model.Task;
import com.example.todospring.model.Task.Priority;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findByIsCompletedTrue();

    List<Task> findByIsCompletedFalse();

    List<Task> findByPriority(Priority priority);

    List<Task> findByDescriptionContainingIgnoreCase(String keyword);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.isCompleted = :status")
    long countByCompletionStatus(boolean status);

    Page<Task> findByUserId(Long userId, Pageable pageable);

    Optional<Task> findByIdAndUserId(Long id, Long userId);

    boolean existsByIdAndUserId(Long id, Long userId);

    void deleteByIdAndUserId(Long id, Long userId);

    @Query("SELECT MAX(t.userTaskNumber) FROM Task t WHERE t.user.id = :userId")
    Long findMaxUserTaskNumberByUserId(@Param("userId") Long userId);

    @Query("SELECT t FROM Task t WHERE t.user.id = :userId ORDER BY " +
            "t.userTaskNumber ASC")
    List<Task> findAllByUserIdOrderByUserTaskNumber(Long userId);

    Page<Task> findAll(Pageable pageable);
}
