ALTER TABLE tasks ADD COLUMN user_task_number BIGINT;

UPDATE tasks t
SET user_task_number = sub.row_num
FROM (
    SELECT id, ROW_NUMBER() OVER  (PARTITION BY user_id ORDER BY id)
        AS row_num
    FROM tasks
     ) sub
WHERE t.id = sub.id;

ALTER TABLE tasks ALTER COLUMN user_task_number SET NOT NULL;