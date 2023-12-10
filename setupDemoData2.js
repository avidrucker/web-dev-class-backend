// note: because server.js is running constantly on the single thread,
// setupDemoData2.js will not be run concurrently/after

require('dotenv').config();
const { Pool } = require('pg');
const fetch = require('node-fetch');

console.log("setting up user data w/ users, posts, and likes");

// Database Connection Configuration
const dbConfig = {
    connectionString: process.env.DATABASE_URL, // PostgreSQL connection string
};

const SERVER_URL = process.env.SERVER_URL || "https://web-dev-class-backend.onrender.com/";

const demoUsers = [
    {
        "username": "Alice",
        "f_name": "Alice",
        "m_name": "",
        "l_name": "Alphabet",
        "password": "123",
        "profile_color": "red"
    },
    {
        "username": "Bob",
        "f_name": "Billy",
        "m_name": "Joe",
        "l_name": "Bob",
        "password": "123",
        "profile_color": "purple"
    },
    {
        "username": "Cindy",
        "f_name": "Cindy",
        "m_name": "",
        "l_name": "Cypress",
        "password": "123",
        "profile_color": "orange"
    },
    {
        "username": "Darwin",
        "f_name": "Darwin",
        "m_name": "",
        "l_name": "Daring",
        "password": "123",
        "profile_color": "green"
    }
];

async function createDemoUsers() {
    console.log("creating demo users...");
    for (const user of demoUsers) {
        try {
            const response = await fetch(`${SERVER_URL}/register`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    username: user.username,
                    fname: user.f_name,
                    mname: user.m_name,
                    lname: user.l_name,
                    password: user.password
                })
            });

            if (response.ok) {
                console.log(`User ${user.username} created successfully.`);
            } else {
                console.error(`Error creating user ${user.username}:`, await response.text());
            }
        } catch (error) {
            console.log("hi");
            console.error(`Error creating user ${user.username}:`, error);
        }
    }
}

// Define demo posts data
const demoPosts = [
    { userId: 1, content: "Hello, this is Alice!" },
    { userId: 3, content: "Cindy's the name, web dev's the game." },
    { userId: 4, content: "👋😃✨" },
    { userId: 1, content: "Another post by Alice" },
    { userId: 3, content: "Cindy's first post." },    
    { userId: 2, content: "Bob here, checking in." },
    { userId: 2, content: "It's-a me, Bob." },
    { userId: 3, content: "Cindy so sleepy." },
];

async function createDemoPosts() {
    console.log("creating demo posts...");
    for (const post of demoPosts) {
        try {
            const response = await fetch(`${SERVER_URL}/demo/posts`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    userId: post.userId,
                    content: post.content
                })
            });

            if (response.ok) {
                console.log(`Post by User ID ${post.userId} created successfully.`);
            } else {
                console.error(`Error creating post by User ID ${post.userId}:`, await response.text());
            }
        } catch (error) {
            console.error(`Error creating post by User ID ${post.userId}:`, error);
        }
    }
}

const demoLikes = [
    { userId: 1, postId: 3 },
    { userId: 1, postId: 7 },
    { userId: 1, postId: 4 },
    { userId: 1, postId: 1 },
    
    { userId: 2, postId: 1 },
    { userId: 2, postId: 2 },
    { userId: 2, postId: 4 },
    { userId: 2, postId: 5 },

    { userId: 3, postId: 7 },
    { userId: 3, postId: 1 },
    { userId: 3, postId: 3 },

    { userId: 4, postId: 2 },
    { userId: 4, postId: 7 }
];

async function createDemoLikes() {
    console.log("creating demo likes...");
    for (const like of demoLikes) {
        try {
            const response = await fetch(`${SERVER_URL}/demo/toggleLike/${like.postId}`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({userId: like.userId})
            });

            if (response.ok) {
                console.log(`Like by User ID ${like.userId} for Post ID ${like.postId} created successfully.`);
            } else {
                console.error(`Error creating like by User ID ${like.userId} for Post ID ${like.postId}:`, await response.text());
            }
        } catch (error) {
            console.error(`Error creating like by User ID ${like.userId} for Post ID ${like.postId}:`, error);
        }
    }
}


async function updateProfileColors() {
    for (const user of demoUsers) {
        try {
            const response = await fetch(`${SERVER_URL}/demo/updateProfileColor`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    username: user.username,
                    profile_color: user.profile_color
                })
            });

            if (response.ok) {
                console.log(`Profile color for ${user.username} updated successfully.`);
            } else {
                console.error(`Error updating profile color for ${user.username}:`, await response.text());
            }
        } catch (error) {
            console.error(`Error updating profile color for ${user.username}:`, error);
        }
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// drop the tables and recreate them
(async () => {
    await sleep(1000);  // Wait for 1 second
    await createDemoUsers();
    await sleep(1000);  // Wait for 1 second
    await updateProfileColors();
    await createDemoPosts();
    await sleep(1000);  // Wait for 1 second
    await createDemoLikes();
})();

