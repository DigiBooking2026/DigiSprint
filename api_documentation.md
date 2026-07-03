# DigiSprint Administrative CRUD & Initialization APIs

This document covers the utility endpoints created to facilitate initial database configuration, bulk seeding, and complete CRUD management of Projects, Task Statuses, Categories (Tags), and Tasks without session authentication.

**Base Server URL**: `http://37.59.205.27`

---

## 1. Bulk User Registration API

### Request URL
* **`POST http://37.59.205.27/api/admin/create-users`**

Registers multiple users at once and returns their database IDs.

### Request Payload Example
```json
{
  "users": [
    {
      "email": "dev1@digisprint.local",
      "password": "securepassword123",
      "name": "Lead Developer",
      "role": "ADMIN" // Allowed roles: "USER", "ADMIN" (default: "USER")
    },
    {
      "email": "dev2@digisprint.local",
      "password": "securepassword456",
      "name": "Frontend Engineer",
      "role": "USER" // Allowed roles: "USER", "ADMIN" (default: "USER")
    }
  ]
}
```

---

## 2. Bulk Import API

### Request URL
* **`POST http://37.59.205.27/api/admin/bulk-import`**

Allows importing Epics, Sprints, and Tasks into a specific project. Matches assignees using `assigneeId`, `assigneeEmail`, or `assigneeName`.

---

## 3. Project CRUD APIs

### List All Projects
* **Request URL**: **`GET http://37.59.205.27/api/admin/projects`**

### Create a Project
* **Request URL**: **`POST http://37.59.205.27/api/admin/projects`**

### Get Project Details
* **Request URL**: **`GET http://37.59.205.27/api/admin/projects/[id]`**

### Update a Project
* **Request URL**: **`PATCH http://37.59.205.27/api/admin/projects/[id]`** (or `PUT`)

### Delete a Project
* **Request URL**: **`DELETE http://37.59.205.27/api/admin/projects/[id]`**

---

## 4. Task Status CRUD APIs

Use these endpoints to manage the custom statuses belonging to a project.

### List All Statuses for a Project
* **Request URL**: **`GET http://37.59.205.27/api/admin/statuses?projectId=[projectId]`**
* **Response Example (200 OK)**:
  ```json
  [
    { "id": "status-1", "name": "Backlog", "color": "#64748b", "order": 1, "projectId": "cmqzif8qp001..." },
    { "id": "status-2", "name": "To Do", "color": "#3b82f6", "order": 2, "projectId": "cmqzif8qp001..." }
  ]
  ```

### Create a Task Status
* **Request URL**: **`POST http://37.59.205.27/api/admin/statuses`**
* **Payload Example**:
  ```json
  {
    "projectId": "cmqzif8qp001kjnnwm633bjle", // Required
    "name": "QA Review",                       // Required
    "color": "#ec4899",                        // Optional hex color
    "order": 4                                 // Optional sort order
  }
  ```

### Update a Task Status
* **Request URL**: **`PATCH http://37.59.205.27/api/admin/statuses/[id]`**
* **Payload Example**: (Allows partial updates)
  ```json
  {
    "name": "Passed QA",
    "color": "#10b981"
  }
  ```

### Delete a Task Status
* **Request URL**: **`DELETE http://37.59.205.27/api/admin/statuses/[id]`**

---

## 5. Category (Tag) CRUD APIs

Tags are global in the database and represent structural boundaries or functional areas such as:
* `"backend"`
* `"frontend"`
* `"database"`
* `"UI"`
* `"documentation"`

### List All Categories (Tags)
* **Request URL**: **`GET http://37.59.205.27/api/admin/tags`**
* **Response Example (200 OK)**:
  ```json
  [
    { "id": "tag-1", "name": "backend", "color": "#ff0000" },
    { "id": "tag-2", "name": "frontend", "color": "#00ff00" }
  ]
  ```

### Create a Category (Tag)
* **Request URL**: **`POST http://37.59.205.27/api/admin/tags`**
* **Payload Example**:
  ```json
  {
    "name": "database", // Required: The unique tag name
    "color": "#3b82f6"  // Optional hex color
  }
  ```

### Update a Category (Tag)
* **Request URL**: **`PATCH http://37.59.205.27/api/admin/tags/[id]`**

### Delete a Category (Tag)
* **Request URL**: **`DELETE http://37.59.205.27/api/admin/tags/[id]`**

---

## 6. Task CRUD APIs

### List Tasks
* **Request URL**: **`GET http://37.59.205.27/api/admin/tasks`** or **`GET http://37.59.205.27/api/admin/tasks?projectId=cmqzif8py000ujnnwr4myoilk`**

### Create a Task
* **Request URL**: **`POST http://37.59.205.27/api/admin/tasks`**
* **Payload Example**:
  ```json
  {
    "projectId": "cmqzif8py000ujnnwr4myoilk",
    "statusId": "s-1",
    "title": "Create User Profiles",
    "description": "Enable user settings changes",
    "type": "USER_STORY",             // Allowed types: "TASK", "BUG", "USER_STORY", "EPIC" (default: "TASK")
    "priority": "HIGH",               // Allowed priorities: "LOW", "MEDIUM", "HIGH", "CRITICAL" (default: "MEDIUM")
    "category": "frontend",           // Area classification (e.g. backend, frontend, database, UI, documentation)
    "storyPoints": 8,
    "assigneeId": "cmqy67890fghij",
    "ownerId": "cmqy12345abcde"
  }
  ```

### Get Task Details
* **Request URL**: **`GET http://37.59.205.27/api/admin/tasks/[id]`**

### Update a Task
* **Request URL**: **`PATCH http://37.59.205.27/api/admin/tasks/[id]`** (or `PUT`)

### Delete a Task
* **Request URL**: **`DELETE http://37.59.205.27/api/admin/tasks/[id]`**
