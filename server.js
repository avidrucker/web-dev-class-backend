require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt'); // password encryption
// const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT;

app.use(cors({
    origin: 'https://cosmic-hotteok-101592.netlify.app',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.get('/', (req, res) => {
  res.send('Server is up and running!');
});

app.use(bodyParser.json());

app.set("trust proxy", 1);

// Session configuration
app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: true, // set to true if using https
        sameSite: 'none', // set to 'none' if dealing with cross-origin requests
        // TIL: note: the absence of domain and/or path were causing issues with the session not being saved
        domain: "web-dev-class-backend.onrender.com", // Replace with your domain name
        path: '/',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Initialize Passport and its session support
app.use(passport.initialize());
app.use(passport.session());

const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    host: process.env.SERVER, //'localhost'
    user: process.env.DB_USERNAME, //'root'
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect(err => {
    if(err) throw err;
    console.log('Connected to the database.');
});

// Error Mapping Object
const errorMap = {
    'BAD_REQUEST': { statusCode: 400, message: 'Bad Request' },
    'UNAUTHORIZED': { statusCode: 401, message: 'Unauthorized' },
    'NOT_FOUND': { statusCode: 404, message: 'Not Found' },
    'METHOD_NOT_ALLOWED': { statusCode: 405, message: 'Method Not Allowed' },
    'CONFLICT': { statusCode: 409, message: 'Conflict' },
    'INTERNAL_SERVER_ERROR': { statusCode: 500, message: 'Internal Server Error'},
};

////////////////////////////////
// DEMO ROUTES START
// Special endpoint for demo data setup to modify demo users' avatar colors w/o authentication
app.put('/demo/updateProfileColor', (req, res) => {
    const { username, profile_color } = req.body;

    if (!username || !profile_color) {
        return res.status(400).json({ success: false, message: 'Username and profile color are required.' });
    }

    const updateColorSql = 'UPDATE users SET profile_color = $1 WHERE username = $2';
    db.query(updateColorSql, [profile_color, username], (err, result) => {
        if (err) {
            // console.log(err);
            return res.status(500).json({ success: false, message: 'Server error' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, message: 'Profile color updated successfully' });
    });
});

// Special endpoint for demo data setup to create posts without authentication
app.post('/demo/posts', (req, res) => {
    const { userId, content } = req.body;

    if (!userId || !content) {
        return res.status(400).json({ message: 'userId and content are required.' });
    }

    const sql = 'INSERT INTO posts (user_id, content) VALUES ($1, $2)';
    db.query(sql, [userId, content], (err, results) => {
        if (err) {
            res.status(500).json({ message: "Error creating post" });
        } else {
            res.status(200).json({ message: "Post created successfully" });
        }
    });
});

// Special endpoint for demo data setup to add likes without authentication
app.post('/demo/toggleLike/:postId', (req, res) => {
    const postId = req.params.postId;
    const { userId } = req.body; // We'll get the userId from the request body for the demo version

    if (!userId) {
        return res.status(400).json({ message: 'userId is required.' });
    }

    // Handle the liking logic
    const insertQuery = "INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)";
    db.query(insertQuery, [postId, userId], (err, result) => {
        if (err) {
            return res.status(500).json({ message: "Error liking the post." });
        }
        res.json({ success: true, action: "liked" });
    });
});
// DEMO ROUTES END
////////////////////////////

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    
    res.status(errorMap['UNAUTHORIZED'].statusCode).json({ 
        message: 'Please log in to view this content' });
}

app.get('/currentUserId', ensureAuthenticated, (req, res) => {
    if (req.user && req.user.id) {
        res.json({ userId: req.user.id });
    } else {
        res.status(errorMap['UNAUTHORIZED'].statusCode).json('Not logged in');
    }
});

// Fetch all posts except those by a given userId
app.get('/posts', ensureAuthenticated, (req, res) => {
    // note: these two consts are kept separate for modularity and clarity
    // but *could* be combined in this one case into one const

    const userIdToExclude = req.query.excludeUserId; // Get the user ID from query params
    const currentUserId = req.session.passport.user;
    console.log("fetching posts except for by user: " + userIdToExclude);
    console.log("currentUserId: " + currentUserId);

    let sql = `
        SELECT 
            posts.*,
            users.f_name,
            users.m_name,
            users.l_name,
            users.initials,
            users.profile_color,
            COUNT(post_likes.id) AS like_count,
            SUM(CASE WHEN post_likes.user_id = $1 THEN 1 ELSE 0 END) AS liked_by_current_user
        FROM posts
        LEFT JOIN users ON posts.user_id = users.id
        LEFT JOIN post_likes ON posts.id = post_likes.post_id
    `;

    if (userIdToExclude) {
        sql += ' WHERE posts.user_id != $2';
    }

    sql += ' GROUP BY posts.id, users.f_name, users.m_name, users.l_name, users.initials, users.profile_color';
    sql += ' ORDER BY posts.created_at DESC, posts.id DESC';

    try {
        db.query(sql, [currentUserId, userIdToExclude], (err, results) => {
            if (err) {
                console.error('Database query error:', err);
                return res.status(errorMap['INTERNAL_SERVER_ERROR'].statusCode).json('Server error');
            }
            res.json(results);
        });   
    } catch (err) {
        console.error('Error fetching posts:', err);
        return res.status(errorMap['INTERNAL_SERVER_ERROR'].statusCode).json('Server error');
    }
});

// Fetch posts of a specific user
app.get('/posts/:userId', ensureAuthenticated, (req, res) => {
    // Q: What is the diff between currentUserId and userId?
    // A: currentUserId is the user who is currently logged in
    //   userId is the user whose posts we are fetching
    const userId = req.params.userId;
    const currentUserId = req.session.passport.user;
    console.log("fetching posts by user of id " + currentUserId)

    const sql = `
        SELECT 
            posts.*,
            users.f_name,
            users.m_name,
            users.l_name,
            users.initials,
            users.profile_color,
            COUNT(post_likes.id) AS like_count,
            SUM(CASE WHEN post_likes.user_id = $1 THEN 1 ELSE 0 END) AS liked_by_current_user
        FROM posts
        LEFT JOIN users ON posts.user_id = users.id
        LEFT JOIN post_likes ON posts.id = post_likes.post_id
        WHERE posts.user_id = $2
        GROUP BY posts.id, users.f_name, users.m_name, users.l_name, users.initials, users.profile_color
        ORDER BY posts.created_at DESC, posts.id DESC
    `;

    try {
        db.query(sql, [currentUserId, userId], (err, results) => {
            if (err) {
                console.error('Database query error:', err);
                return res.status(errorMap['INTERNAL_SERVER_ERROR'].statusCode).json('Server error');
            }
            res.json(results);
        });
    } catch (err) {
        console.error('Error fetching posts:', err);
        return res.status(errorMap['INTERNAL_SERVER_ERROR'].statusCode).json('Server error');
    }
});

// Passport local strategy configuration
passport.use(new LocalStrategy(
    async (username, password, done) => {
        // console.log("Attempting authentication for username:", username);
        // console.log("with password: " + password);

        try {
            const sql = 'SELECT * FROM users WHERE username = $1';
            const { rows } = await db.query(sql, [username]);

            if (rows.length === 0) {
                console.log("Username not found in database");
                return done(null, false, { message: 'Incorrect username.' });
            }

            // console.log("rows", rows);

            const user = rows[0];
            const isMatch = await bcrypt.compare(password, user.password);

            if (isMatch) {
                console.log("Password matches. Authentication successful.");
                return done(null, user);
            } else {
                console.log("Password doesn't match. Authentication failed.");
                return done(null, false, { message: 'Incorrect password.' });
            }
        } catch (err) {
            console.error("Authentication error:", err);
            return done(err);
        }
    }
));

// Serialization and deserialization for Passport sessions
passport.serializeUser((user, done) => {
    console.log("Serializing user:", user);
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    console.log("attempting to deserialize user");
    try {
        const sql = 'SELECT * FROM users WHERE id = $1';
        const { rows } = await db.query(sql, [id]);
        
        if (rows.length > 0) {
            console.log("user found:", rows[0]);
            done(null, rows[0]);
        } else {
            done(new Error("User not found"), null);
        }
    } catch (err) {
        console.error("Error in deserialization:", err);
        done(err, null);
    }
});


const genInitials = (f_name, m_name, l_name) => {
    let initials = "";
    initials += f_name[0];
    if(m_name) {
	initials += m_name[0];
    }
    initials += l_name[0];
    return initials;
};

const colors = ["black", "dark-gray", "dark-red", "red", "purple", "dark-pink", "dark-green",
		"green", "dark-blue", "navy", "light-gray", "white", "orange", "yellow", "pink",
		"light-pink", "light-green", "blue", "light-blue"];

const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

// User registration endpoint
app.post('/register', async (req, res) => {
    try {
        // password encryption
        // comment next line if you need to turn password hashing off
        // console.log("confirming that password is present and in the correct format for bcrypt:");
        // console.log(req.body);
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const user = { username: req.body.username, f_name: req.body.fname,
		       m_name: req.body.mname, l_name: req.body.lname,
		       password: hashedPassword }; // or req.body.password for non-encrypted passwords

	    const initials = genInitials(user.f_name, user.m_name, user.l_name);

	    const avatar_color = getRandomItem(colors);
        
        const sql = 'INSERT INTO users (username, f_name, m_name, l_name, initials, profile_color, password) VALUES ($1, $2, $3, $4, $5, $6, $7)';

        db.query(sql, [user.username, user.f_name, user.m_name, user.l_name,
		       initials, avatar_color, user.password], (err, result) => {
            if (err) {
                // Check if the error is due to a duplicate entry
                if (err.errno === 1062) {
                    return res.status(errorMap['CONFLICT'].statusCode).json({success: false, 
                        message: 'Username already exists'});
                } else {
                    throw err;
                }
            }
            res.status(201).json({success: true, message: 'User registered'});
        });
    } catch (err) {
        console.error("Registration error:", err);
        console.log()
        res.status(errorMap['INTERNAL_SERVER_ERROR'].statusCode).json({success: false, message: 'Error registering the user: ' + err.message});
    }
});

// User login endpoint
app.post('/login', passport.authenticate('local', {
    successRedirect: '/successLogin',
    failureRedirect: '/failureLogin'
}));


// User logout endpoint
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(errorMap['INTERNAL_SERVER_ERROR'].statusCode).json('Internal Server Error');
        }
        res.json('Logged out');
    });
});

app.get('/successLogin', (req, res) => {
    // Debugging: Log session and user data
    console.log("Session data:", req.session);
    console.log("User data:", req.user);
    console.log("Passport data:", req.session.passport);

    if (req.session.passport && req.session.passport.user) {
        res.json({ 
            success: true, 
            message: 'Login successful', 
            userId: req.session.passport.user 
        });
    } else {
        // Handle cases where session data might not be available
        console.error("Error: Session data is not available.");
        res.status(500).json({ 
            success: false, 
            message: 'Internal Server Error. Session data is not available.' 
        });
    }
});

app.get('/failureLogin', (req, res) => {
    res.json({ success: false, message: 'Login failed' });
});


// Create new post endpoint
app.post('/posts', ensureAuthenticated, (req, res) => {
    const { content } = req.body;
    const userId = req.user.id;

    const sql = 'INSERT INTO posts (user_id, content) VALUES ($1, $2)';
    db.query(sql, [userId, content], (err, results) => {
        if (err) {
            res.status(errorMap['INTERNAL_SERVER_ERROR'].statusCode).json("Error creating post");
        } else {
            res.status(200).json("Post created successfully");
        }
    });
});

// Delete user endpoint
app.delete('/users/:userId', ensureAuthenticated, (req, res) => {
    const userId = req.user.id;

    const sql = 'DELETE FROM users WHERE id = $1';
    db.query(sql, [userId], (err, results) => {
        if (err) {
            // console.error("Error deleting user:", err);
            res.status(errorMap['INTERNAL_SERVER_ERROR'].statusCode).json("Error deleting account");
        } else {
            req.session.destroy(err => {
                if (err) {
                    // console.error('Error destroying session:', err);
                    return res.status(errorMap['INTERNAL_SERVER_ERROR'].statusCode).json('Internal Server Error');
                }
                res.json('Account deleted successfully');
            });
        }
    });
});

// Delete a specific post
app.delete('/posts/:postId', ensureAuthenticated, (req, res) => {
    const postId = req.params.postId;

    // Check if the post exists and if the logged-in user is the author
    const fetchPostSql = 'SELECT id FROM posts WHERE id = $1 AND user_id = $2';
    db.query(fetchPostSql, [postId, req.user.id], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(errorMap['INTERNAL_SERVER_ERROR'].statusCode).json('Server error');
        }

        if (results.length === 0) {
            return res.status(errorMap['NOT_FOUND'].statusCode).json('Post not found or not authorized to delete');
        }

        // If the user is the author, proceed to delete the post
	const deletePostSql = 'DELETE FROM posts WHERE id = $1';
        db.query(deletePostSql, [postId], (err, _) => {
            if (err) {
                console.error(err);
                return res.status(errorMap['INTERNAL_SERVER_ERROR'].statusCode).json('Server error');
            }
            res.json({success: true, message:'Post deleted successfully'});
        });
    });
});

// Edit a specific post
app.put('/posts/:postId', ensureAuthenticated, (req, res) => {
    const postId = req.params.postId;
    const { content } = req.body;

    // Check if the post exists and if the logged-in user is the author
    const fetchPostSql = 'SELECT id FROM posts WHERE id = $1 AND user_id = $2';
    db.query(fetchPostSql, [postId, req.user.id], (err, results) => {
        if (err) {
            return res.status(errorMap['INTERNAL_SERVER_ERROR'].statusCode).json('Server error');
        }

        if (results.length === 0) {
            return res.status(errorMap['NOT_FOUND'].statusCode).json('Post not found or not authorized to edit');
        }

        // If the user is the author, proceed to edit the post, and mark post as "edited"
        const editPostSql = 'UPDATE posts SET content = $1, edited = true WHERE id = $2';
        db.query(editPostSql, [content, postId], (err, _) => {
            if (err) {
                return res.status(errorMap['INTERNAL_SERVER_ERROR'].statusCode).json('Server error');
            }
            res.json({success: true, message:'Post updated successfully'});
        });
    });
});

// TODO: refactor to indicate that this is an operation on /likes/:likeId
// adding and removing of user likes on posts
app.post('/toggleLike/:postId', toggleLikeHandler);  // for liking the post
app.delete('/toggleLike/:postId', toggleLikeHandler);  // for unliking the post

function toggleLikeHandler(req, res) {
    const postId = req.params.postId;
    const userId = req.session.passport.user;  // Assuming user ID is stored in session

    if (req.method === 'POST') {
        // Handle the liking logic
        const insertQuery = "INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)";
        db.query(insertQuery, [postId, userId], (err, result) => {
            if (err) {
                return res.status(errorMap['INTERNAL_SERVER_ERROR'].statusCode).json({ error: "Error liking the post." });
            }
            res.json({ success: true, action: "liked" });
        });
    } else if (req.method === 'DELETE') {
        // Handle the unliking logic
        const deleteQuery = "DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2";
        db.query(deleteQuery, [postId, userId], (err, result) => {
            if (err) {
                return res.status(errorMap['INTERNAL_SERVER_ERROR'].statusCode).json({ error: "Error unliking the post." });
            }
            res.json({ success: true, action: "unliked" });
        });
    } else {
        res.status(errorMap['METHOD_NOT_ALLOWED'].statusCode).json({ error: "Method not allowed." });
    }
}

// TODO: refactor to /users/:userId/profile-color
// endpoint to update a user's profile color
app.put('/updateProfileColor', ensureAuthenticated, (req, res) => {
    const { profile_color } = req.body;
    const userId = req.user.id;  // assuming req.user.id contains the logged-in user's ID

    const updateColorSql = 'UPDATE users SET profile_color = $1 WHERE id = $2';
    db.query(updateColorSql, [profile_color, userId], (err, _) => {
        if (err) {
            return res.status(errorMap['INTERNAL_SERVER_ERROR'].statusCode).json('Server error');
        }
        res.json({success: true, message:'Profile color updated successfully'});
    });
});

// TODO: refactor to /users/:userId/initials
// endpoint to update a user's initials
app.put('/updateInitials', ensureAuthenticated, (req, res) => {
    const { initials } = req.body;
    const userId = req.user.id;  // assuming req.user.id contains the logged-in user's ID

    const sql = 'UPDATE users SET initials = $1 WHERE id = $2';
    db.query(sql, [initials, userId], (err, _) => {
        if (err) {
            return res.status(errorMap['INTERNAL_SERVER_ERROR'].statusCode).json('Server error');
        }
        res.json({success: true, message:'Initials updated successfully'});
    });
});

// TODO: refactor to /users/:userId/username
// endpoint to update a user's username, this version makes sure to return a clear 
// error message if the desired username is already taken
app.put('/updateUsername', ensureAuthenticated, (req, res) => {
    const { username } = req.body;
    const userId = req.user.id;  // assuming req.user.id contains the logged-in user's ID

    // First check if the username already exists in the database
    const checkSql = 'SELECT id FROM users WHERE username = $1';
    db.query(checkSql, [username], (err, results) => {
        if (err) {
            return res.status(errorMap['INTERNAL_SERVER_ERROR'].statusCode).json('Server error');
        }
        
        // If the username exists and it doesn't belong to the current user
        if (results.length > 0 && results[0].id !== userId) {
            return res.status(errorMap['CONFLICT'].statusCode).json({success: false, 
                message: 'Username already exists'});
        }

        // Now, update the username
        const updateSql = 'UPDATE users SET username = $1 WHERE id = $2';
        db.query(updateSql, [username, userId], (err, _) => {
            if (err) {
                return res.status(errorMap['INTERNAL_SERVER_ERROR'].statusCode).json('Server error');
            }
            res.json({success: true, message:'Username updated successfully'});
        });
    });
});

// TODO: refactor rename to /users/:userId/details
// Fetch details of the currently logged-in user
app.get('/currentUser', ensureAuthenticated, (req, res) => {
    const userId = req.user.id;  // assuming req.user.id contains the logged-in user's ID

    const fetchUserDetailsSql = `
        SELECT f_name, m_name, l_name, initials, username, profile_color 
        FROM users 
        WHERE id = $1`;
    
    db.query(fetchUserDetailsSql, [userId], (err, results) => {
        if (err) {
            return res.status(errorMap['INTERNAL_SERVER_ERROR'].statusCode).json('Server error');
        }

        if (results.length === 0) {
            return res.status(errorMap['NOT_FOUND'].statusCode).json('User not found');
        }

        const user = results[0];  // Extract the first (and only) result
        res.json(user);
    });
});

app.get('/set-session', (req, res) => {
    req.session.testData = 'This is a test';
    res.send('Session data set');
});

app.get('/get-session', (req, res) => {
    const sessionData = req.session.testData || 'No session data';
    res.send(`Session data: ${sessionData}`);
});

