# DigiSprint Administrative CRUD & Initialization APIs

This document covers the utility endpoints created to facilitate initial database configuration, bulk seeding, and complete CRUD management of Projects and Tasks without session authentication.

---

## 1. Bulk User Registration API

**`POST /api/admin/create-users`**

Registers multiple users at once and returns their database IDs.

### Request Payload Example
```json
{
  "users": [
    {
      "email": "dev1@digisprint.local",
      "password": "securepassword123",
      "name": "Lead Developer",
      "role": "ADMIN"
    },
    {
      "email": "dev2@digisprint.local",
      "password": "securepassword456",
      "name": "Frontend Engineer",
      "role": "USER"
    }
  ]
}
```

### Response Example (200 OK)
```json
{
  "success": true,
  "users": [
    {
      "id": "cmqy12345abcde",
      "email": "dev1@digisprint.local",
      "name": "Lead Developer",
      "role": "ADMIN",
      "status": "created"
    },
    {
      "id": "cmqy67890fghij",
      "email": "dev2@digisprint.local",
      "name": "Frontend Engineer",
      "role": "USER",
      "status": "created"
    }
  ]
}
```

---

## 2. Bulk Import API

**`POST /api/admin/bulk-import`**

Allows importing Epics, Sprints, and Tasks into a specific project. Matches assignees using `assigneeId`, `assigneeEmail`, or `assigneeName`.

### Request Payload Example
```json
{
  "projectId": "cmqzif8qp001kjnnwm633bjle",
  "epics": [
    {
      "title": "SSO Auth",
      "description": "Enterprise Single Sign-On flow."
    }
  ],
  "sprints": [
    {
      "name": "Sprint 1: Core Setup",
      "goal": "Integrate basic modules",
      "status": "ACTIVE",
      "tasks": [
        {
          "title": "Configure OAuth login",
          "type": "USER_STORY",
          "storyPoints": 5,
          "status": "In Progress",
          "priority": "HIGH",
          "epicTitle": "SSO Auth",
          "assigneeId": "cmqy12345abcde"
        }
      ]
    }
  ],
  "tasks": [
    {
      "title": "Fix SSO alignment button",
      "type": "BUG",
      "storyPoints": 1,
      "status": "Backlog",
      "priority": "LOW"
    }
  ]
}
```

### Response Example (200 OK)
```json
{
  "success": true,
  "message": "Bulk import successful",
  "results": {
    "sprintsCreated": 1,
    "tasksCreated": 2,
    "epicsCreated": 1
  }
}
```

---

## 3. Project CRUD APIs

### List All Projects
* **`GET /api/admin/projects`**

#### Response Example (200 OK)
```json
[
  {
    "id": "cmqzif8qp001kjnnwm633bjle",
    "name": "YallaNamrah",
    "description": "YallaNamrah project desc",
    "prefix": "YN",
    "startDate": "2026-06-29T19:03:35.000Z",
    "deadline": "2026-07-29T19:03:35.000Z",
    "ownerId": "cmqy12345abcde",
    "isPrivate": false,
    "createdAt": "2026-06-29T19:03:35.000Z",
    "updatedAt": "2026-06-29T19:03:35.000Z",
    "deletedAt": null,
    "statuses": [
      { "id": "status-1", "name": "Backlog", "color": "#64748b", "order": 1 },
      { "id": "status-2", "name": "To Do", "color": "#3b82f6", "order": 2 },
      { "id": "status-3", "name": "Done", "color": "#22c55e", "order": 7 }
    ],
    "_count": {
      "tasks": 20
    }
  }
]
```

### Create a Project
* **`POST /api/admin/projects`**

#### Request Payload Example
```json
{
  "name": "ZTrip Taxi App",
  "prefix": "ZT",
  "description": "Ride sharing application",
  "startDate": "2026-07-01",
  "deadline": "2026-12-31",
  "ownerId": "cmqy12345abcde",
  "isPrivate": false
}
```

#### Response Example (200 OK)
```json
{
  "id": "cmqzif8py000ujnnwr4myoilk",
  "name": "ZTrip Taxi App",
  "description": "Ride sharing application",
  "prefix": "ZT",
  "startDate": "2026-07-01T00:00:00.000Z",
  "deadline": "2026-12-31T00:00:00.000Z",
  "ownerId": "cmqy12345abcde",
  "isPrivate": false,
  "createdAt": "2026-07-03T19:20:00.000Z",
  "updatedAt": "2026-07-03T19:20:00.000Z",
  "deletedAt": null,
  "statuses": [
    { "id": "s-1", "name": "Backlog", "color": "#64748b", "order": 1 },
    { "id": "s-2", "name": "To Do", "color": "#3b82f6", "order": 2 },
    { "id": "s-3", "name": "In Progress", "color": "#f59e0b", "order": 3 },
    { "id": "s-4", "name": "Done", "color": "#22c55e", "order": 7 }
  ]
}
```

### Get Project Details
* **`GET /api/admin/projects/[id]`**

#### Response Example (200 OK)
```json
{
  "id": "cmqzif8py000ujnnwr4myoilk",
  "name": "ZTrip Taxi App",
  "description": "Ride sharing application",
  "prefix": "ZT",
  "startDate": "2026-07-01T00:00:00.000Z",
  "deadline": "2026-12-31T00:00:00.000Z",
  "ownerId": "cmqy12345abcde",
  "isPrivate": false,
  "deletedAt": null,
  "statuses": [
    { "id": "s-1", "name": "Backlog", "color": "#64748b", "order": 1 },
    { "id": "s-2", "name": "To Do", "color": "#3b82f6", "order": 2 }
  ],
  "members": [
    { "id": "cmqy12345abcde", "name": "Lead Developer", "email": "dev1@digisprint.local" }
  ],
  "tasks": [
    {
      "id": "task-uuid-999",
      "ticketId": "ZT-1",
      "title": "Setup repository structure",
      "status": { "id": "s-1", "name": "Backlog", "color": "#64748b", "order": 1 },
      "assignee": null
    }
  ]
}
```

### Update a Project
* **`PATCH /api/admin/projects/[id]`**

#### Request Payload Example
```json
{
  "name": "ZTrip Taxi Platform",
  "description": "New updated project summary",
  "isPrivate": true
}
```

#### Response Example (200 OK)
```json
{
  "id": "cmqzif8py000ujnnwr4myoilk",
  "name": "ZTrip Taxi Platform",
  "description": "New updated project summary",
  "prefix": "ZT",
  "startDate": "2026-07-01T00:00:00.000Z",
  "deadline": "2026-12-31T00:00:00.000Z",
  "ownerId": "cmqy12345abcde",
  "isPrivate": true,
  "deletedAt": null,
  "statuses": [
    { "id": "s-1", "name": "Backlog" }
  ]
}
```

### Delete a Project
* **`DELETE /api/admin/projects/[id]`**

#### Response Example (200 OK)
```json
{
  "message": "Project soft-deleted successfully"
}
```

---

## 4. Task CRUD APIs

### List Tasks
* **`GET /api/admin/tasks`** or **`GET /api/admin/tasks?projectId=cmqzif8py000ujnnwr4myoilk`**

#### Response Example (200 OK)
```json
[
  {
    "id": "task-uuid-999",
    "ticketId": "ZT-1",
    "title": "Setup repository structure",
    "description": "Basic folder routing structure",
    "type": "TASK",
    "priority": "MEDIUM",
    "storyPoints": 3,
    "startDate": null,
    "deadline": null,
    "status": { "id": "s-1", "name": "Backlog" },
    "assignee": null,
    "owner": { "id": "cmqy12345abcde", "name": "Lead Developer", "email": "dev1@digisprint.local" },
    "project": { "id": "cmqzif8py000ujnnwr4myoilk", "name": "ZTrip Taxi Platform", "prefix": "ZT" }
  }
]
```

### Create a Task
* **`POST /api/admin/tasks`**

#### Request Payload Example
```json
{
  "projectId": "cmqzif8py000ujnnwr4myoilk",
  "statusId": "s-1",
  "title": "Create User Profiles",
  "description": "Enable user settings changes",
  "type": "USER_STORY",
  "priority": "HIGH",
  "storyPoints": 8,
  "assigneeId": "cmqy67890fghij",
  "ownerId": "cmqy12345abcde"
}
```

#### Response Example (200 OK)
```json
{
  "id": "task-uuid-888",
  "ticketId": "ZT-2",
  "title": "Create User Profiles",
  "description": "Enable user settings changes",
  "type": "USER_STORY",
  "category": null,
  "priority": "HIGH",
  "blockedReason": null,
  "storyPoints": 8,
  "startDate": null,
  "deadline": null,
  "statusId": "s-1",
  "projectId": "cmqzif8py000ujnnwr4myoilk",
  "sprintId": null,
  "assigneeId": "cmqy67890fghij",
  "parentId": null,
  "epicId": null,
  "ownerId": "cmqy12345abcde",
  "status": { "id": "s-1", "name": "Backlog" },
  "assignee": { "id": "cmqy67890fghij", "name": "Frontend Engineer", "email": "dev2@digisprint.local" }
}
```

### Get Task Details
* **`GET /api/admin/tasks/[id]`**

#### Response Example (200 OK)
```json
{
  "id": "task-uuid-888",
  "ticketId": "ZT-2",
  "title": "Create User Profiles",
  "description": "Enable user settings changes",
  "type": "USER_STORY",
  "priority": "HIGH",
  "storyPoints": 8,
  "status": { "id": "s-1", "name": "Backlog" },
  "assignee": { "id": "cmqy67890fghij", "name": "Frontend Engineer", "email": "dev2@digisprint.local" }
}
```

### Update a Task
* **`PATCH /api/admin/tasks/[id]`**

#### Request Payload Example
```json
{
  "statusId": "s-2",
  "storyPoints": 5
}
```

#### Response Example (200 OK)
```json
{
  "id": "task-uuid-888",
  "title": "Create User Profiles",
  "storyPoints": 5,
  "statusId": "s-2",
  "status": { "id": "s-2", "name": "To Do" }
}
```

### Delete a Task
* **`DELETE /api/admin/tasks/[id]`**

#### Response Example (200 OK)
```json
{
  "message": "Task deleted successfully"
}
```
