const http = require('http');

const payload = JSON.stringify({
  projectId: "cmqzif8qp001kjnnwm633bjle",
  epics: [
    { title: "Authentication Flow", description: "All tasks related to user login and registration", status: "To Do" },
    { title: "Shopping Cart", description: "Cart management and checkout", status: "To Do" }
  ],
  sprints: [
    {
      name: "Sprint 1: Core Foundation",
      goal: "Setup basic e-commerce functionality",
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      tasks: [
        { title: "As a user, I want to sign up with my email", type: "USER_STORY", storyPoints: 5, status: "To Do", epicTitle: "Authentication Flow", priority: "HIGH" },
        { title: "Create login API endpoint", type: "TASK", storyPoints: 3, status: "In Progress", epicTitle: "Authentication Flow", priority: "HIGH" },
        { title: "Design homepage mockup", type: "TASK", storyPoints: 5, status: "Done", priority: "MEDIUM" },
        { title: "Fix signup button alignment", type: "BUG", storyPoints: 1, status: "To Do", epicTitle: "Authentication Flow", priority: "LOW" },
        { title: "As a user, I want to add items to my cart", type: "USER_STORY", storyPoints: 8, status: "To Do", epicTitle: "Shopping Cart", priority: "HIGH" },
        { title: "Create cart database schema", type: "TASK", storyPoints: 3, status: "To Do", epicTitle: "Shopping Cart", priority: "MEDIUM" },
        { title: "Implement cart state with Redux", type: "TASK", storyPoints: 5, status: "To Do", epicTitle: "Shopping Cart", priority: "HIGH" },
        { title: "Add unit tests for cart logic", type: "TASK", storyPoints: 3, status: "To Do", epicTitle: "Shopping Cart", priority: "LOW" },
        { title: "Fix cart item duplication bug", type: "BUG", storyPoints: 2, status: "To Do", epicTitle: "Shopping Cart", priority: "MEDIUM" },
        { title: "As a vendor, I want to upload a product image", type: "USER_STORY", storyPoints: 5, status: "To Do", priority: "HIGH" }
      ]
    }
  ],
  tasks: [
    { title: "Configure AWS S3 bucket for images", type: "TASK", storyPoints: 3, status: "To Do", priority: "MEDIUM" },
    { title: "Implement image compression on upload", type: "TASK", storyPoints: 5, status: "To Do", priority: "LOW" },
    { title: "As a user, I want to securely checkout", type: "USER_STORY", storyPoints: 13, status: "To Do", priority: "CRITICAL" },
    { title: "Integrate Stripe payment gateway", type: "TASK", storyPoints: 8, status: "To Do", priority: "HIGH" },
    { title: "Add Apple Pay support", type: "TASK", storyPoints: 5, status: "To Do", priority: "LOW" },
    { title: "As a user, I want to track my order status", type: "USER_STORY", storyPoints: 5, status: "To Do", priority: "MEDIUM" },
    { title: "Send order confirmation emails", type: "TASK", storyPoints: 3, status: "To Do", priority: "MEDIUM" },
    { title: "Fix order history loading spinner", type: "BUG", storyPoints: 1, status: "To Do", priority: "LOW" },
    { title: "Setup push notifications for delivery updates", type: "TASK", storyPoints: 8, status: "To Do", priority: "HIGH" }
  ]
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/bulk-import',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'vBqUs2lfI5fMcaMXRbvsonmfxELwtPel',
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log('Headers:', res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(payload);
req.end();
