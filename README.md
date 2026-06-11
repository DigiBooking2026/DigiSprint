# 🚀 DigiSprint

DigiSprint is a self-hosted, performance-focused Agile Project Management platform inspired by Jira and Linear. It provides software teams with robust tools to plan sprints, track issues, log work, and collaborate seamlessly.

---

## ✨ Key Features

* **📦 Agile Project & Sprint Planning:**
  * Define projects with unique prefixes (e.g., `DEMO-WEB`) for ticket indexing.
  * Plan, start, and complete sprints (`PLANNED`, `ACTIVE`, `COMPLETED`) with custom goals and deadlines.
* **🎫 Rich Issue & Task Management:**
  * Interactive Kanban/Sprint boards with drag-and-drop mechanics.
  * Multiple ticket types (e.g., `TASK`, `BUG`, `STORY`) and categories.
  * Deep hierarchies using **Subtasks** and customizable relationships via **Task Links** (e.g., `BLOCKS`, `DUPLICATES`, `RELATES_TO`).
* **⏳ Accurate Time & Progress Tracking:**
  * Logging of work hours (`Worklog`) on individual tasks.
  * Automatically generated change logs (`TaskHistory`) showing status transitions and ownership changes over time.
* **💬 Real-Time Collaboration:**
  * Rich-text comments powered by Tiptap (bold, underline, link, inline images).
  * Multipart file uploads for attachments on projects, tasks, or comments.
* **🛡️ Admin & User Governance:**
  * Role-based access control (`ADMIN` vs `USER`).
  * Direct user activation, role-updating, and admin-override capabilities (such as changing any user's password directly from the user list).

---

## 🛠️ Technology Stack

* **Frontend:** React 19, Next.js 16 (Pages Router), TypeScript.
* **Styling:** Tailwind CSS v4, `@tailwindcss/postcss`, Lucide Icons, and custom CSS variables for light/dark themes.
* **Database & ORM:** MySQL database with Prisma ORM (client output compiled into `src/generated/prisma`).
* **Authentication:** Stateless JWT-based authentication using the `jose` library, stored securely in HTTP-only cookies.
* **Core Libraries:**
  * `@dnd-kit/core` & `@dnd-kit/sortable` (for board drag-and-drop layout).
  * `@tiptap/*` extension suite (for WYSIWYG comment editor).
  * `formidable` (multipart parsing for file uploads).
  * `bcryptjs` (password hashing).
  * `cmdk` (global search command menu).

---

## 📂 Project Structure

```bash
DigiSprint/
├── prisma/                    # Database Configuration & Seeds
│   ├── schema.prisma          # Prisma schema definition (MySQL)
│   ├── jira_db.sql            # Core SQL backup
│   └── seed-demo.cjs          # Demo seeder script (generates test users/projects)
│
├── public/                    # Static Assets
│   └── uploads/               # Directory for user-uploaded attachments
│
└── src/
    ├── generated/prisma/      # Compiled typed Prisma client output
    ├── lib/                   # Config and Shared Helpers
    │   ├── auth.ts            # JWT verification, cookies, and session management
    │   ├── prisma.ts          # Singleton PrismaClient instance
    │   └── utils.ts           # Styling and layout class merges
    │
    ├── components/            # Reusable UI & Complex Components
    │   ├── ui/                # Base Shadcn UI primitives (Buttons, Dialogs, Tables, Select, etc.)
    │   ├── Header.tsx         # Global navigation bar & notifications
    │   ├── FileUpload.tsx     # Drag-and-drop file upload with preview
    │   ├── RichTextEditor.tsx # Tiptap WYSIWYG editor
    │   └── CommandMenu.tsx    # Global search panel (accessible via Cmd/Ctrl + K)
    │
    ├── pages/                 # Routing, View Pages, and Endpoints
    │   ├── index.tsx          # Main Dashboard
    │   ├── login.tsx          # Login Page
    │   ├── register.tsx       # User Registration Page
    │   ├── activity.tsx       # Activity stream of status/comment updates
    │   ├── stats.tsx          # Analytical graphs, workloads, and charts
    │   ├── tasks.tsx          # Master task list & Backlog view
    │   │
    │   ├── admin/
    │   │   └── users.tsx      # Admin User Management Board
    │   │
    │   ├── projects/
    │   │   └── [id].tsx       # Dynamic Kanban Board & Sprint Board
    │   │
    │   └── api/               # Next.js Serverless API Router
    │       ├── auth/          # Login, Register, Logout, Me endpoints
    │       ├── admin/         # Admin API (user deletion, role, status, and password updates)
    │       ├── projects/      # Project CRUD operations
    │       ├── sprints/       # Sprint creation & state updates
    │       ├── attachments/   # Multipart file uploads handler
    │       └── tasks/         # Ticket CRUD, Worklogs, Comments, and Links
    │
    └── styles/
        └── globals.css        # Core stylesheet and layout variable overrides
```

---

## 💾 Database Schema

Below is an overview of the primary database models and their relational mappings:

```mermaid
erDiagram
    USER ||--o{ TASK : "assignee"
    USER ||--o{ TASK : "owner"
    USER ||--o{ COMMENT : "writes"
    USER ||--o{ WORKLOG : "logs"
    USER ||--o{ NOTIFICATION : "receives"
    USER ||--o{ TASKHISTORY : "performs"
    
    PROJECT ||--o{ TASK : "contains"
    PROJECT ||--o{ SPRINT : "has"
    PROJECT ||--o{ TASKSTATUS : "has"
    PROJECT ||--o{ ATTACHMENT : "hosts"

    SPRINT ||--o{ TASK : "groups"

    TASK ||--o{ ATTACHMENT : "has"
    TASK ||--o{ COMMENT : "has"
    TASK ||--o{ WORKLOG : "has"
    TASK ||--o{ TASKHISTORY : "has"
    TASK ||--o{ TASKLINK : "source/target"
    TASK ||--o{ TAG : "tagged"
    
    COMMENT ||--o{ ATTACHMENT : "has"
```

### Models & Attributes

1. **`User`**: Account info, emails, hashed password, role (`ADMIN` | `USER`), and status (`isActive`).
2. **`Project`**: Core project metrics, deadline, description, unique prefix (e.g. `DEMO`).
3. **`Sprint`**: Name, goals, start/end dates, status (`PLANNED`, `ACTIVE`, `COMPLETED`).
4. **`Task`**: Title, storyPoints, ticketId (e.g. `DEMO-10`), type (`TASK`, `BUG`, `STORY`), category, priority (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), blockedReason, assignee/owner relations, and hierarchical parent task linkage.
5. **`TaskLink`**: Relational joins showing ticket dependencies (e.g. `BLOCKS`, `DUPLICATES`).
6. **`Comment`**: Plain & Rich HTML strings for task discussion.
7. **`Worklog`**: Recorded work logs detailing logged hours and performing-dates.
8. **`Notification`**: Real-time alerts for assignments, reads, and status changes.

---

## 🚀 Local Development Setup

Follow these steps to configure your local DigiSprint environment:

### Prerequisites
* **Node.js** (v18.x or above recommended)
* **MySQL** Server

### 1. Installation
Clone your repository and install dependencies:
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory (based on `.env.example`):
```env
DATABASE_URL="mysql://root:password@localhost:3306/digisprint"
JWT_SECRET="generate_a_secure_random_string"
```

### 3. Database Sync & Generation
Build the typed client definitions and initialize schema tables:
```bash
npx prisma generate
```

*(Optional)* If starting with an empty database, apply migrations or use a SQL seed to create the tables.

### 4. Seed Demo Data
DigiSprint includes an interactive seeder that populates test metrics, workflows, sprints, and tasks:
```bash
npm run seed:demo
```

### 5. Launch the Server
Run the Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the application.

---

## 🔒 Demo Credentials

If you seed your local database using `npm run seed:demo`, the following accounts are created automatically. The default password for all demo accounts is **`demo1234`**:

| Account Email | User Name | Role |
| :--- | :--- | :--- |
| **`admin.demo@digibooking.local`** | محمد بن علي | `ADMIN` |
| **`frontend.demo@digibooking.local`** | أحمد الهاشمي | `USER` |
| **`backend.demo@digibooking.local`** | ليلى منصور | `USER` |
| **`qa.demo@digibooking.local`** | سارة بن يوسف | `USER` |

---

## 📡 API Reference

### Authentication (`/api/auth`)
* `POST /api/auth/register` - Creates a new user profile.
* `POST /api/auth/login` - Authenticates credentials and issues an HTTP-only JWT cookie.
* `POST /api/auth/logout` - Clears the session cookie.
* `GET /api/auth/me` - Retrieves session data of the currently logged-in user.

### Administration (`/api/admin`)
* `GET /api/admin/users` - Fetch full lists of registered user profiles (Admin exclusive).
* `PATCH /api/admin/users` - Modify a user's role, toggle their activation status (`isActive`), or securely **reset their password** (`password`).
* `DELETE /api/admin/users` - Delete a user account from the system.

### Projects & Sprints
* `GET /api/projects` - Retrieves all active projects.
* `POST /api/projects` - Formulates a new project with default statuses.
* `POST /api/projects/[id]/sprints` - Create a sprint under a project.
* `PATCH /api/sprints/[id]` - Start, stop, or edit a sprint's meta properties.

### Tasks & Worklogs
* `GET /api/tasks` - Returns backlogs and filtered ticket lists.
* `POST /api/tasks` - Generates a new task ticket.
* `PATCH /api/tasks/[id]` - Update task statuses, priorities, descriptions, or parent assignments.
* `POST /api/tasks/[id]/worklogs` - Submit log hours worked on a task.
* `POST /api/tasks/[id]/links` - Link tasks together (blocks, relates, duplicates).

---

## 🏗️ Available Scripts

Execute these scripts from the package root:

* `npm run dev` - Starts the Next.js development server.
* `npm run build` - Compiles the frontend for production delivery.
* `npm run start` - Launches the compiled build in server-hosting mode.
* `npm run lint` - Runs ESLint syntax and formatting validation.
* `npm run seed:demo` - Drops existing demo projects and seeds fresh sample workloads.
