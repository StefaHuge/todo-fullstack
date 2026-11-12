# ToDo List API

REST API для управления задачами с JWT-аутентификацией, разграничением прав и полным циклом CI/CD.

**[🔗 Деплой на Render](https://todo-spring-boot-m3g2.onrender.com/swagger-ui.html)**
*Бесплатный тариф Render «засыпает» после 15 минут бездействия. Первый запрос может занять 20–30 секунд.*

**[🔗 Живое демо фронтенда на Vercel](https://todo-frontend-nine-beta.vercel.app)**
**[🔗 Фронтенд (React + TypeScript + Vite + TailwindCSS)](https://github.com/StefaHuge/todo-frontend)**


## 🛠 Технологический стек

- **Java 17**, Spring Boot 4
- **Spring Security** + JWT (jjwt)
- **Spring Data JPA** + Hibernate
- **PostgreSQL** (локально и в облаке)
- **Flyway** (миграции БД)
- **Docker** + Docker Compose
- **Swagger / OpenAPI** (springdoc)
- **JUnit 5**, Mockito, AssertJ, Testcontainers
- **GitHub Actions** (CI/CD)

## ✨ Что умеет приложение

- Регистрация и аутентификация пользователей (JWT-токены)
- CRUD задач: создание, чтение, обновление, удаление
- Фильтрация задач по приоритету
- **Многопользовательский**: каждый видит только свои задачи
- Пагинация и сортировка
- Документация API через Swagger UI

## 🚀 Как запустить локально

### Вариант 1: Через Docker Compose (рекомендуется)

1. Убедитесь, что установлены **Docker** и **Docker Desktop**.

2. Клонируйте репозиторий:
   ```bash
   git clone https://github.com/StefaHuge/todo-spring-boot.git
   cd todo-spring-boot
   
3. Запустите:
   ```bash
   docker compose up --build
   
5. Откройте Swagger UI:
```text 
   http://localhost:8081/swagger-ui.html
```

### Вариант 2: Локально с PostgreSQL

1. Создайте базу данных todo_db в PostgreSQL.
2. Скопируйте application.yml.example в application.yml и заполните пароль.
3. Запустите:
   ```bash
   mvn spring-boot:run
   
## 🧪Тесты

Проект покрыт тестами трёх уровней:
- Unit-тесты (TaskServiceTest) — проверка бизнес-логики с Mockito.
- Тесты контроллера (TaskControllerTest) — @WebMvcTest, проверка HTTP-статусов и JSON.
- Интеграционные тесты (TaskIntegrationTest) — @SpringBootTest + Testcontainers (реальный PostgreSQL в Docker), проверка полного пути запроса.

Запуск всех тестов:
  ```bash
  mvn clean verify
  ```
  
## ⚙️ CI/CD

Настроен GitHub Actions (.github/workflows/ci.yml):
При каждом пуше в main запускаются все тесты (включая интеграционные с Testcontainers).
После успешных тестов выполняется автоматический деплой на Render.

## 📦 Деплой

Приложение задеплоено на Render:
Web Service: https://todo-spring-boot-m3g2.onrender.com
База данных: PostgreSQL (Render)
Конфигурация для облака — в application-render.yml (без секретов, только переменные окружения).

## 📁 Структура проекта
```text
src/main/java/com/example/todospring/
├── config/# SecurityConfig, SecurityBeans, DataInitializer
├── controller/# AuthController, TaskController
├── dto/# TaskRequestDTO, TaskResponseDTO, AuthRequest
├── exception/# GlobalExceptionHandler, ErrorResponse
├── model/# Task, User
├── repository/# TaskRepository, UserRepository
├── security/# JwtService, JwtAuthFilter
└── service/# TaskService, UserService
```

## 📄 Лицензия

MIT
    
