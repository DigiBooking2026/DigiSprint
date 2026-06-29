const http = require('http');

const payload = JSON.stringify({
  epics: [
    {
      title: "Mobile App Launch V1",
      description: "Deliver the core YallaNamrah mobile app for localized goods shopping.",
      startDate: "2026-07-01",
      deadline: "2026-09-01",
      assigneeEmail: "admin.demo@digibooking.local"
    }
  ],
  sprints: [
    {
      name: "Sprint 1: Core E-commerce",
      goal: "Implement product browsing and cart functionality.",
      startDate: "2026-07-01",
      endDate: "2026-07-14",
      status: "ACTIVE",
      tasks: [
        {
          title: "As a user, I want to browse products by category",
          type: "USER_STORY",
          storyPoints: 5,
          status: "In Progress",
          priority: "HIGH",
          epicTitle: "Mobile App Launch V1",
          assigneeEmail: "admin.demo@digibooking.local"
        },
        {
          title: "Implement Category API Endpoint",
          type: "TASK",
          storyPoints: 3,
          status: "Done",
          priority: "MEDIUM",
          epicTitle: "Mobile App Launch V1",
          assigneeEmail: "backend.demo@digibooking.local"
        },
        {
          title: "As a user, I want to add items to my shopping cart",
          type: "USER_STORY",
          storyPoints: 8,
          status: "To Do",
          priority: "HIGH",
          epicTitle: "Mobile App Launch V1",
          assigneeEmail: "frontend.demo@digibooking.local"
        },
        {
          title: "Fix crash when adding out-of-stock item",
          type: "BUG",
          storyPoints: 2,
          status: "To Do",
          priority: "CRITICAL",
          epicTitle: "Mobile App Launch V1",
          assigneeEmail: "backend.demo@digibooking.local"
        },
        {
          title: "As a user, I want to search for local goods by name",
          type: "USER_STORY",
          storyPoints: 5,
          status: "Backlog",
          priority: "MEDIUM",
          epicTitle: "Mobile App Launch V1",
          assigneeEmail: "frontend.demo@digibooking.local"
        },
        {
          title: "Setup Elasticsearch for product search",
          type: "TASK",
          storyPoints: 13,
          status: "Backlog",
          priority: "HIGH",
          epicTitle: "Mobile App Launch V1",
          assigneeEmail: "backend.demo@digibooking.local"
        },
        {
          title: "Design product details screen",
          type: "TASK",
          storyPoints: 5,
          status: "Done",
          priority: "HIGH",
          epicTitle: "Mobile App Launch V1",
          assigneeEmail: "frontend.demo@digibooking.local"
        },
        {
          title: "As a user, I want to read reviews on products",
          type: "USER_STORY",
          storyPoints: 3,
          status: "To Do",
          priority: "LOW",
          epicTitle: "Mobile App Launch V1"
        },
        {
          title: "Database schema for Reviews and Ratings",
          type: "TASK",
          storyPoints: 2,
          status: "Review",
          priority: "MEDIUM",
          epicTitle: "Mobile App Launch V1",
          assigneeEmail: "backend.demo@digibooking.local"
        },
        {
          title: "QA: Test search functionality with typos",
          type: "TASK",
          storyPoints: 2,
          status: "QA",
          priority: "MEDIUM",
          epicTitle: "Mobile App Launch V1",
          assigneeEmail: "qa.demo@digibooking.local"
        }
      ]
    }
  ],
  tasks: [
    { title: "As a vendor, I want to upload a product image", type: "USER_STORY", storyPoints: 5, status: "Backlog", priority: "HIGH" },
    { title: "Configure AWS S3 bucket for images", type: "TASK", storyPoints: 3, status: "To Do", priority: "MEDIUM" },
    { title: "Implement image compression on upload", type: "TASK", storyPoints: 5, status: "Backlog", priority: "LOW" },
    { title: "As a user, I want to securely checkout", type: "USER_STORY", storyPoints: 13, status: "Backlog", priority: "CRITICAL" },
    { title: "Integrate Stripe payment gateway", type: "TASK", storyPoints: 8, status: "Backlog", priority: "HIGH" },
    { title: "Add Apple Pay support", type: "TASK", storyPoints: 5, status: "Backlog", priority: "LOW" },
    { title: "As a user, I want to track my order status", type: "USER_STORY", storyPoints: 5, status: "Backlog", priority: "MEDIUM" },
    { title: "Send order confirmation emails", type: "TASK", storyPoints: 3, status: "Backlog", priority: "MEDIUM" },
    { title: "Fix order history loading spinner", type: "BUG", storyPoints: 1, status: "Backlog", priority: "LOW" },
    { title: "Setup push notifications for delivery updates", type: "TASK", storyPoints: 8, status: "Backlog", priority: "HIGH" }
  ]
});

const options = {
  hostname: '127.0.0.1',
  port: 3001,
  path: '/api/projects/cmqzif8qp001kjnnwm633bjle/bulk-import',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'vBqUs2lfI5fMcaMXRbvsonmfxELwtPel',
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log('Headers:', res.headers);
    console.log('Response:', data);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(payload);
req.end();
