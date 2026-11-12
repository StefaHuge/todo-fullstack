CREATE TABLE tasks
(
    id           BIGSERIAL PRIMARY KEY,
    description  VARCHAR(500) NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    priority     VARCHAR(20)  NOT NULL,
    created_at   TIMESTAMP,
    updated_at   TIMESTAMP,
    user_id      BIGINT REFERENCES users (id)
);