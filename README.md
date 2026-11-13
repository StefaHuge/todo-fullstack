# 📝 ToDo List — Fullstack приложение

Полноценное Fullstack-приложение для управления задачами: многопользовательскость, JWT-аутентификация, приоритеты, фильтрация, PWA. Бэкенд на Spring Boot, фронтенд на React + TypeScript, всё упаковано в Docker и задеплоено в облако.

[![Java CI with Maven](https://github.com/StefaHuge/todo-fullstack/actions/workflows/ci.yml/badge.svg)](https://github.com/StefaHuge/todo-fullstack/actions/workflows/ci.yml)
![Java](https://img.shields.io/badge/Java-17-orange)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.1.1-green)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)
![Docker](https://img.shields.io/badge/Docker-Compose-blue)

## 🔗 Demo

| Сервис | URL |
|--------|-----|
| **Frontend (Vercel)** | https://todo-frontend-nine-beta.vercel.app |
| **Backend API (Render)** | https://todo-spring-boot-m3g2.onrender.com |
| **Swagger UI** | https://todo-spring-boot-m3g2.onrender.com/swagger-ui.html |
| **Health check** | https://todo-spring-boot-m3g2.onrender.com/actuator/health |
| **Prometheus metrics** | https://todo-spring-boot-m3g2.onrender.com/actuator/prometheus |

> ### ⚠️ Демо открываются через VPN
> Бэкенд на Render Free Tier «засыпает» через 15 минут бездействия. Первый запрос после сна может занять 20–30 секунд. Настроен пинг через **UptimeRobot** (`/actuator/health`, интервал 5 минут).

### Тестовый аккаунт

- **Email:** `user@example.com`
- **Пароль:** `password123`

## 🛠 Стек

| Слой | Технологии |
|------|-----------|
| **Backend** | Java 17, Spring Boot 4.1.1, Spring Security, Spring Data JPA, Flyway, JWT (jjwt), Swagger (springdoc), Actuator |
| **Database** | PostgreSQL 16 |
| **Frontend** | React 19, TypeScript, Vite, TailwindCSS, PWA (vite-plugin-pwa) |
| **Infrastructure** | Docker, Docker Compose, Nginx (reverse proxy) |
| **CI/CD** | GitHub Actions, Render (backend), Vercel (frontend) |
| **Tests** | JUnit 5, Mockito, `@WebMvcTest`, Testcontainers |

## ✨ Возможности

- 🔐 **JWT-аутентификация** — регистрация, вход, защищённые эндпоинты
- 👥 **Многопользовательскость** — каждый видит только свои задачи
- ✅ **CRUD задач** — создание, редактирование, удаление, отметка «выполнено»
- 🎯 **Приоритеты** — LOW / MEDIUM / HIGH
- 🔍 **Фильтрация** — Все / Активные / Выполненные
- 🔢 **Автонумерация** — задачи нумеруются по порядку, без «дырок» после удаления
- 📄 **Пагинация и сортировка** — с валидацией параметров
- 📱 **PWA** — устанавливается на телефон, работает офлайн
- 📚 **Swagger UI** — интерактивная документация API
- 📊 **Actuator** — health, metrics
- 📊 **Prometheus-метрики** — `/actuator/prometheus` для мониторинга (JVM, HTTP, HikariCP, Spring Security)

## 🏗 Архитектура
```text
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ React SPA    │--->│ Nginx /      │--->│ Spring Boot  │
│ (Vercel /    │    │ Vercel       │    │ (Render /    │
│ Docker)      │    │ (proxy)      │    │ Docker)      │
└──────────────┘    └──────────────┘    └──────┬───────┘
                                               │
                                        ┌──────▼───────┐
                                        │ PostgreSQL   │
                                        │ (Render /    │
                                        │ Docker)      │
                                        └──────────────┘
```

**Слоистая архитектура бэкенда:** `Controller → Service → Repository → Entity`

- **DTO** — `TaskRequestDTO`, `TaskResponseDTO`, `AuthRequest` (без `Map<String, String>`)
- **Связи** — `User @OneToMany → Task`, `Task @ManyToOne → User`
- **Схема БД** — управляется через Flyway (`ddl-auto: validate`), 4 миграции

## 🚀 Запуск локально

### Способ 1: Docker Compose (рекомендуемый)

Требуется только Docker Desktop.

```bash
git clone https://github.com/StefaHuge/todo-fullstack.git
cd todo-fullstack
docker compose up --build
```

После сборки:

Приложение: http://localhost

Swagger: http://localhost:8081/swagger-ui.html

Health: http://localhost:8081/actuator/health

PostgreSQL: 127.0.0.1:5432, БД todo_db, пользователь postgres, пароль postgres

Остановить:

```bash
docker compose down
```

Остановить и удалить данные БД:

```bash
docker compose down -v
```

### Способ 2: без Docker (для разработки)
Требования: Java 17, Maven, Node.js 20+, PostgreSQL 16.

 1. Создать БД
```bash
createdb todo_db
```
 2. Бэкенд
```bash
cd todo-spring
cp src/main/resources/application.yml.example src/main/resources/application.yml
```
 отредактировать application.yml: пароль от PostgreSQL, JWT_SECRET
```bash
./mvnw spring-boot:run
```
 3. Фронтенд (в другом терминале)
```bash
cd todo-frontend
npm install --legacy-peer-deps
npm run dev
```
Фронтенд: http://localhost:5173 (Vite проксирует /api на localhost:8081).

## 📚 API
Полная документация — в Swagger UI: http://localhost:8081/swagger-ui.html (или на Render).

### Основные эндпоинты

Метод	Путь	Описание	Auth
POST	/api/auth/register	Регистрация	❌
POST	/api/auth/login	Вход, возвращает JWT	❌
GET	/api/tasks	Список задач (пагинация, фильтр)	✅
POST	/api/tasks	Создать задачу	✅
PUT	/api/tasks/{id}	Обновить задачу	✅
DELETE	/api/tasks/{id}	Удалить задачу	✅
PATCH	/api/tasks/{id}/toggle	Переключить «выполнено»	✅

Пример: вход
```bash
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```
Ответ:
```json
{ "token": "eyJhbGciOiJIUzI1NiJ9..." }
```
Пример: список задач
```bash
curl http://localhost:8081/api/tasks \
  -H "Authorization: Bearer <TOKEN>"
```

## 🧪 Тесты

```bash
cd todo-spring
./mvnw test
```
### Покрытие:

Unit — TaskServiceTest (8 тестов, Mockito)

Controller — TaskControllerTest (@WebMvcTest, 6 тестов)

Integration — TaskIntegrationTest (@SpringBootTest + Testcontainers)

Всего: 16 тестов, все проходят.

## 🔄 CI/CD

```text
push в main
   │
   ▼
GitHub Actions (ci.yml)
   ├─ mvn clean verify  (тесты)
   └─ curl $RENDER_DEPLOY_HOOK_URL
         │
         ▼
      Render (backend)  ─── автоматический редеплой
      Vercel (frontend) ─── автодеплой при пуше
```

CI: .github/workflows/ci.yml — сборка + тесты на каждый push/PR в main

Backend deploy: Render через Deploy Hook (секрет RENDER_DEPLOY_HOOK_URL в GitHub)

Frontend deploy: Vercel (автодеплой при пуше)

## 📁 Структура проекта
```text
todo-fullstack/
├── .github/workflows/ci.yml     # GitHub Actions
├── docker-compose.yml           # PostgreSQL + backend + frontend
├── README.md
├── todo-spring/                 # Backend
│   ├── Dockerfile
│   ├── pom.xml
│   ├── mvnw, mvnw.cmd
│   └── src/
│       ├── main/java/com/example/todospring/
│       │   ├── config/          # SecurityConfig, DataInitializer
│       │   ├── controller/      # AuthController, TaskController
│       │   ├── dto/             # TaskRequestDTO, TaskResponseDTO
│       │   ├── exception/       # GlobalExceptionHandler
│       │   ├── model/           # User, Task
│       │   ├── repository/      # UserRepository, TaskRepository
│       │   ├── security/        # JwtService, JwtAuthFilter
│       │   └── service/         # TaskService
│       ├── main/resources/
│       │   ├── application.yml.example
│       │   ├── application-render.yml
│       │   └── db/migration/    # Flyway V1–V4
│       └── test/java/...        # Unit + WebMvc + Integration
└── todo-frontend/               # Frontend
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    └── src/
        ├── api.ts
        ├── App.tsx
        └── components/
```

## 📦 Старые репозитории (архив)
Проект вырос из двух отдельных репозиториев, которые теперь объединены в монорепозиторий:

todo-spring-boot — старый бэкенд (архив)

todo-frontend — старый фронтенд (архив)

Оба помечены как «перенесено в todo-fullstack».

## ⚠️ Известные ограничения
Render Free Tier засыпает через 15 минут бездействия (cold start ~20–30 с). Настроен пинг через UptimeRobot.

npm install на Vercel требует --legacy-peer-deps (настроено в Settings → Build & Development → Install Command).

Старый JWT в localStorage при смене окружения (IntelliJ / Docker / Render) — нужно чистить localStorage и входить заново.

Mockito self-attaching warning в IntelliJ не убирается через pom.xml — запускайте тесты через ./mvnw test.

## 📄 Лицензия
MIT

## 👤 Автор
StefaHuge — GitHub

