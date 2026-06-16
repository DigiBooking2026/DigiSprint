- [ ] Admin can change the password from the user list
- [ ] User can change their own password from the profile button (needs to be created)
- [ ] Create SUPER ADMIN role that controls admin:
  - [ ] Rename roles: call "admin" as "PM" (Project Manager) and "SUPER ADMIN" as simply "Admin"
  - [ ] PMs can create projects and view only their own projects
  - [ ] Admins (formerly SUPER ADMIN) can view all projects
- [ ] Admin can reassign the project to another PM

## Future Jira Features
- [ ] **Project Memberships**: Currently, any user in the system can be assigned to a task. In Jira, projects have "Members" and only members can access the board or be assigned tasks.
- [ ] **Dedicated Backlog View**: Right now, Backlog tasks and Sprint tasks are filtered via a dropdown on the Kanban board. A true Jira setup has a dedicated "Backlog" page where you can drag and drop tasks into upcoming sprints before activating them.
- [ ] **Releases / Fix Versions**: There is no way to group completed tasks into a "Release" or "Version" to track what features shipped and when.
- [ ] **Activity Stream / Mentions**: The commenting system does not currently support tagging users (`@username`) which is crucial for team collaboration.
