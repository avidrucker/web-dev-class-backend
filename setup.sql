-- Conditionally drop the database if it exists
DROP DATABASE IF EXISTS social_media_db;

-- Create the database
CREATE DATABASE social_media_db;
USE social_media_db;

-- Create the users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    f_name VARCHAR(255) NOT NULL,
    m_name VARCHAR(255),
    l_name VARCHAR(255) NOT NULL,
    initials VARCHAR(255) NOT NULL,
    profile_color VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL
);

-- Create the posts table
-- TODO: confirm that edited values are being initialized correctly to 0
CREATE TABLE posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    content TEXT,
    edited BOOLEAN NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create the post_likes table
CREATE TABLE post_likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT,
    user_id INT,
    UNIQUE(post_id, user_id), -- Ensuring a user can only like a post once
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert demo data
-- Users
INSERT INTO users (username, f_name, l_name, initials, profile_color, password) VALUES ('Alice', 'Alice', 'Alphabet', 'AA', 'dark-red', 'alicepass');
INSERT INTO users (username, f_name, m_name, l_name, initials, profile_color, password) VALUES ('Bob', 'Billy', 'Joe', 'Bob', 'BJB', 'navy', 'bobpass');
INSERT INTO users (username, f_name, l_name, initials, profile_color, password) VALUES ('Cindy', 'Cindy', 'Cypress', 'CC', 'dark-green', 'cindypass');
INSERT INTO users (username, f_name, l_name, initials, profile_color, password) VALUES ('Darwin', 'Darwin', 'Daring', 'DD', 'purple', 'darwinpass');

-- Posts (assuming Alice has id 1 and Bob has id 2)
INSERT INTO posts (user_id, content) VALUES (1, 'Hello, this is Alice!');
INSERT INTO posts (user_id, content) VALUES (1, 'Another post by Alice');
INSERT INTO posts (user_id, content) VALUES (2, 'Bob here, checking in.');
INSERT INTO posts (user_id, content) VALUES (2, 'It''sa me, Bob.');
INSERT INTO posts (user_id, content) VALUES (3, 'Cindy''s first post.');
INSERT INTO posts (user_id, content) VALUES (3, 'Cindy''s the name, web dev''s the game.');
INSERT INTO posts (user_id, content) VALUES (3, 'Cindy so sleepy.');
