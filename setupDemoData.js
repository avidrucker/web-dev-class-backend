require('dotenv').config();
const { Pool } = require('pg');
const fetch = require('node-fetch');

// Database Connection Configuration
const dbConfig = {
    connectionString: process.env.DATABASE_URL, // PostgreSQL connection string
};

// instead of deleting the entire database, instead, 
// deleting the tables is a way to clear the data
async function deleteTables() {
    const pool = new Pool(dbConfig);

    try {
        // Drop the tables
        await pool.query(`DROP TABLE IF EXISTS post_likes;`);
        await pool.query(`DROP TABLE IF EXISTS posts;`);
        await pool.query(`DROP TABLE IF EXISTS users;`);
        console.log("Tables dropped successfully.");

    } catch (error) {
        console.error("Error resetting database tables:", error);
    }
}


async function createTables() {
    const pool = new Pool(dbConfig);
    try {
        // Create the users table
        await pool.query(`
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) NOT NULL UNIQUE,
                f_name VARCHAR(255) NOT NULL,
                m_name VARCHAR(255),
                l_name VARCHAR(255) NOT NULL,
                initials VARCHAR(255) NOT NULL,
                profile_color VARCHAR(255) NOT NULL,
                password VARCHAR(255) NOT NULL
            );
        `);
        console.log("Users table created successfully.");

        // Create the posts table
        await pool.query(`
            CREATE TABLE posts (
                id SERIAL PRIMARY KEY,
                user_id INT,
                content TEXT,
                edited BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);
        console.log("Posts table created successfully.");

        // Create the post_likes table
        await pool.query(`
            CREATE TABLE post_likes (
                id SERIAL PRIMARY KEY,
                post_id INT,
                user_id INT,
                UNIQUE(post_id, user_id),
                FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);
        console.log("Post likes table created successfully.");
    } catch (error) {
        console.error("Error creating tables:", error);
    }
}

// ... [Existing code for database reset, demo user creation, and demo post creation] ...
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
            console.log("hey");
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
//    await resetDatabase(); // disabled for now
    await deleteTables();
    await sleep(1000);  // Wait for 1 second
    await createTables();
    await sleep(1000);  // Wait for 1 second
    await createDemoUsers();
    await sleep(1000);  // Wait for 1 second
    await updateProfileColors();
    await createDemoPosts();
    await sleep(1000);  // Wait for 1 second
    await createDemoLikes();
})();

