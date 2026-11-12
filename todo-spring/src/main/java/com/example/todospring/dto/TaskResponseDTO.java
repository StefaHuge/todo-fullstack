package com.example.todospring.dto;

import com.example.todospring.model.Task.Priority;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskResponseDTO {

    private Long id;
    private Long userTaskNumber;

    private String description;
    @JsonProperty("isCompleted")
    private Boolean isCompleted;
    private Priority priority;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
