const http = require('http');

const SERVER_IP = '37.59.205.27';
// Use port 3000 if Next.js is running directly on the VPS, or 80 if there is an Nginx reverse proxy.
// We are trying port 80 based on the provided IP URL.
const SERVER_PORT = 80; 
const API_KEY = process.env.IMPORT_API_KEY || 'vBqUs2lfI5fMcaMXRbvsonmfxELwtPel';

const projects = [
  {
    name: "DigiBooking",
    projectId: "cmqzif8o90004jnnwls0k9j0h",
    data: {
      epics: [
        { title: "Hotel Search & Filtering", description: "Core search engine for finding hotels." },
        { title: "Booking Engine", description: "Checkout and payment integration." }
      ],
      sprints: [
        {
          name: "Sprint 1: Search MVP",
          goal: "Users can search for hotels by city and dates.",
          status: "ACTIVE",
          tasks: [
            { title: "Implement Google Maps Autocomplete", type: "TASK", epicTitle: "Hotel Search & Filtering", status: "Done", storyPoints: 5 },
            { title: "Build date range picker", type: "TASK", epicTitle: "Hotel Search & Filtering", status: "In Progress", storyPoints: 3 },
            { title: "API integration for hotel inventory", type: "TASK", epicTitle: "Hotel Search & Filtering", status: "To Do", storyPoints: 8 }
          ]
        }
      ],
      tasks: [
        { title: "Fix timezone bug in date picker", type: "BUG", epicTitle: "Hotel Search & Filtering", status: "To Do", storyPoints: 2 },
        { title: "Integrate Stripe for payments", type: "TASK", epicTitle: "Booking Engine", status: "To Do", storyPoints: 13 }
      ]
    }
  },
  {
    name: "ZTrip",
    projectId: "cmqzif8py000ujnnwr4myoilk",
    data: {
      epics: [
        { title: "Driver App", description: "Mobile app for drivers to accept rides." },
        { title: "Rider App", description: "Mobile app for riders to request rides." }
      ],
      sprints: [
        {
          name: "Sprint 1: Rider Onboarding",
          goal: "Allow users to sign up and request a ride.",
          status: "ACTIVE",
          tasks: [
            { title: "SMS verification via Twilio", type: "TASK", epicTitle: "Rider App", status: "Done", storyPoints: 5 },
            { title: "Real-time location tracking UI", type: "TASK", epicTitle: "Rider App", status: "In Progress", storyPoints: 8 }
          ]
        }
      ],
      tasks: [
        { title: "Driver background check integration", type: "TASK", epicTitle: "Driver App", status: "To Do", storyPoints: 5 }
      ]
    }
  },
  {
    name: "ZSocial(Nexus)",
    projectId: "cmqzif8r50026jnnw5d97jjqe",
    data: {
      epics: [
        { title: "News Feed Algorithm", description: "Machine learning for feed personalization." },
        { title: "Direct Messaging", description: "Real-time chat system." }
      ],
      sprints: [
        {
          name: "Sprint 1: Chat MVP",
          goal: "Users can send text messages to friends.",
          status: "ACTIVE",
          tasks: [
            { title: "Setup WebSocket server", type: "TASK", epicTitle: "Direct Messaging", status: "Done", storyPoints: 8 },
            { title: "Implement read receipts", type: "TASK", epicTitle: "Direct Messaging", status: "To Do", storyPoints: 5 }
          ]
        }
      ],
      tasks: [
        { title: "Image attachments in chat", type: "TASK", epicTitle: "Direct Messaging", status: "To Do", storyPoints: 8 }
      ]
    }
  },
  {
    name: "ZCars",
    projectId: "cmqzif8rq002wjnnwuecxulyl",
    data: {
      epics: [
        { title: "Vehicle Inventory", description: "Management of cars for sale." },
        { title: "Financing Calculator", description: "Loan calculation tools." }
      ],
      sprints: [
        {
          name: "Sprint 1: Listing Vehicles",
          goal: "Dealers can upload car details and photos.",
          status: "ACTIVE",
          tasks: [
            { title: "Build car upload form", type: "TASK", epicTitle: "Vehicle Inventory", status: "Done", storyPoints: 5 },
            { title: "Image optimization pipeline", type: "TASK", epicTitle: "Vehicle Inventory", status: "In Progress", storyPoints: 8 }
          ]
        }
      ],
      tasks: [
        { title: "Add loan amortization chart", type: "TASK", epicTitle: "Financing Calculator", status: "To Do", storyPoints: 5 }
      ]
    }
  }
];

function seedProject(project) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      projectId: project.projectId,
      ...project.data
    });

    const options = {
      hostname: SERVER_IP,
      port: SERVER_PORT,
      path: '/api/admin/bulk-import',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`✅ Successfully seeded ${project.name}`);
          resolve();
        } else {
          console.error(`❌ Failed to seed ${project.name}. Status: ${res.statusCode}. Response: ${data}`);
          reject(new Error(data));
        }
      });
    });

    req.on('error', (e) => {
      console.error(`❌ Network error for ${project.name}: ${e.message}`);
      reject(e);
    });

    req.write(payload);
    req.end();
  });
}

async function run() {
  console.log(`Seeding projects to VPS: http://${SERVER_IP}:${SERVER_PORT}/api/admin/bulk-import\n`);
  for (const project of projects) {
    try {
      await seedProject(project);
    } catch (e) {
      console.log('Continuing to next project...\n');
    }
  }
}

run();
