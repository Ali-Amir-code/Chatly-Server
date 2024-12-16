const express = require('express');
const http = require('http');
const cors = require('cors');

const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);

const { Server } = require('socket.io');;
const io = new Server(server);

app.use(express.json())
app.use(cors());

const PORT = 3000;

const admin = {
    id: 1000,
    username: 'admin',
    password: 'admin'
}
let users = [];

const filePath = path.join(__dirname, 'users.json');

const onlineUserIDs = new Map();

let id = 1001;

loadData();

function loadData() {
    try {
        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            if (fileContent.trim()) {
                users = JSON.parse(fileContent); // Load data from the file
            } else {
                console.log('Error: File is empty.');
            }
        } else {
            console.log('File does not exist.');
        }
    } catch (err) {
        console.log('Error loading data:', err);
    }
    try {
        if (fs.existsSync(path.join(__dirname, 'currentId.json'))) {
            const fileContent = fs.readFileSync(path.join(__dirname, 'currentId.json'), 'utf8');
            if (fileContent.trim()) {
                id = JSON.parse(fileContent);
            }
        }
    } catch (err) {
        console.log('Error loading data:', err);
    }
}



function saveUsers() {
    fs.writeFileSync(filePath, JSON.stringify(users));
}

function getKeyByValue(map, searchValue) {
    for (let [key, value] of map.entries()) {
        if (value === searchValue) {
            return key;
        }
    }
    return undefined; // Return undefined if no match found
}

function getNewId() {
    return id++;
}

function saveId() {
    fs.writeFileSync(path.join(__dirname, 'currentId.json'), JSON.stringify(id));
}

function extractPropertyValues(arr, property) {
    return arr.map(obj => obj[property]);
}

function getUser(data, propertyName) {
    return users.find(user => user[propertyName] === data);
}

function isValidUser(data) {
    const user = getUser(data.id, 'id');
    return user && user.username === data.username && user.password === data.password;
}

async function register(req, res) {
    const { name, username, password } = req.body;

    if (!name || !username || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const data = {
        id: getNewId(),
        name: name,
        username: username,
        password: password,
        addedUsers: [],
        unDeliveredMessages: [],
        notifications: [],
        pendingRequests: [],
    };
    saveId();
    const dataForClient = {
        me: {
            id: data.id,
            username: data.username,
            name: data.name,
            password: data.password,
            notifications: [],
        },
        contacts: []
    }
    users.push(data);
    saveUsers();
    res.json(dataForClient);
}

function loadContact(id) {
    const user = users.find(user => user.id === id);
    return {
        id: user.id,
        username: user.username,
        name: user.name,
        messages: user.unDeliveredMessages,
        haveUnreadMessages: user.unDeliveredMessages.length > 0,
    }
}

async function login(req, res) {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const user = users.find(user => user.username === username && user.password === password);
    if (user) {
        const dataForClient = {
            me: {

                id: user.id,
                username: user.username,
                name: user.name,
                password: user.password,
                notifications: [],
            },
            contacts: user.addedUsers.map(id => loadContact(id))
        }
        if (user.pendingRequests.length > 0) {
            user.pendingRequests.forEach(id => {
                dataForClient.me.notifications.push({
                    type: 'Request',
                    status: 'pending',
                    sender: {
                        id: id,
                        username: users.find(user => user.id === id).username,
                        name: users.find(user => user.id === id).name
                    },
                    receiverId: user.id
                })
            })
        }
        user.pendingRequests = [];
        res.json(dataForClient);
    } else {
        res.status(401).json({ message: "Invalid username or password" });
    }
}

function isOnline(id) {
    return onlineUserIDs.has(id);
}

function handleNotification(req, res) {
    const notification = req.body;
    if (!notification) {
        return res.status(400).json('Please send a valid notification'); // Send response and exit function
    }

    const receivingUser = users.find(user => user.id === notification.receiverId);
    const sendingUser = users.find(user => user.id === notification.sender.id);

    if (receivingUser && sendingUser) {
        if (notification.type.toLowerCase() === 'request') {
            if (sendingUser.pendingRequests.includes(notification.receiverId)) {
                return res.status(400).json('He already sent you the request. Respond to it first');
            }
            if (receivingUser.pendingRequests.includes(notification.sender.id)) {
                return res.status(400).json('You already sent a request to this user. Wait for him to respond');
            }

            receivingUser.pendingRequests.push(notification.sender.id);

            if (receivingUser.addedUsers.includes(notification.sender.id)) {
                return res.status(400).json('You already added this user');
            }
        }
        if (receivingUser === sendingUser) {
            return res.status(400).json('You cannot add yourself');
        }
        if (notification.type.toLowerCase() === 'response') {
            sendingUser.pendingRequests = sendingUser.pendingRequests.filter(id => id !== notification.receiverId);
            if (notification.status.toLowerCase() === 'accepted') {
                sendingUser.addedUsers.push(notification.receiverId);
                receivingUser.addedUsers.push(notification.sender.id);
            }
        }
        if (notification.type.toLowerCase() === 'info' && notification.status.toLowerCase() === 'removed') {
            sendingUser.addedUsers = sendingUser.addedUsers.filter(id => id !== notification.receiverId);
            receivingUser.addedUsers = receivingUser.addedUsers.filter(id => id !== notification.sender.id);
        }
    } else {
        return res.status(400).json('That user is not registered on Chatly');
    }

    if (isOnline(notification.receiverId)) {
        io.to(onlineUserIDs.get(notification.receiverId)).emit('notification', notification);
        return res.status(200).json(true); // Send response and exit function
    } else {
        receivingUser.notifications.push(notification);
        saveUsers();
        return res.status(200).json(true); // Send response and exit function
    }
}

function deleteAccount(req, res) {
    const { id, password } = req.body;
    const userTobeDeleted = users.find(user => user.id === id && user.password === password);
    if (userTobeDeleted) {
        userTobeDeleted.addedUsers.forEach(addedUserId => {
            getUser(addedUserId, 'id').addedUsers = getUser(addedUserId, 'id').addedUsers.filter(id => id !== userTobeDeleted.id);
            if (isOnline(addedUserId)) {
                io.to(onlineUserIDs.get(addedUserId)).emit('notification', {
                    type: 'Info',
                    status: 'deleted',
                    sender: {
                        id: userTobeDeleted.id,
                        username: userTobeDeleted.username,
                        name: userTobeDeleted.name
                    },
                    receiverId: addedUserId,
                });
            } else {
                const receivingUser = users.find(user => user.id === addedUserId);
                receivingUser.notifications.push({
                    type: 'Info',
                    status: 'deleted',
                    sender: {
                        id: userTobeDeleted.id,
                        username: userTobeDeleted.username,
                        name: userTobeDeleted.name
                    },
                    receiverId: addedUserId,
                });
            }
        });
        users = users.filter(user => user.id !== userTobeDeleted.id);
        saveUsers();
        return res.status(200).json(true);
    } else {
        return res.status(401).json({ message: "Invalid id or password" });
    }
}

function isAdmin(user) {
    return user.id === admin.id && user.username === admin.username && user.password === admin.password;
}

function getUsersHandler(req, res) {
    if (isAdmin(req.body)) {
        res.json(users);
    }

}

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/checkUsernameAvailability', (req, res) => {
    const username = req.query.username ? req.query.username.toLowerCase() : undefined;
    if (!username) {
        return res.status(400).json({ message: 'Username is required' });
    }
    if (username === admin.username) {
        return res.json({ available: false });
    }
    const usernames = extractPropertyValues(users, 'username');
    const isAvailable = !usernames.includes(username);
    res.json({ available: isAvailable });
});

app.get('/checkStatus', (req, res) => {
    const id = Number(req.query.id);
    const result = onlineUserIDs.has(id);
    if (result) {
        res.json('online');
    } else {
        res.json('offline');
    }
});

app.post('/register', register);

app.post('/login', login);

app.post('/notification', handleNotification);

app.post('/deleteAccount', deleteAccount);

app.post('/getUsers', getUsersHandler);

server.listen(PORT, () => {
    console.log(`Listening of localhost:${PORT}`);
});

// Socket Logic

io.use((socket, next) => {
    const data = socket.handshake.auth.user;
    if (!data || !data.id || !data.username || !data.password) {
        return next(new Error('Authentication data is missing'));
    }
    if (isValidUser(data)) {
        onlineUserIDs.set(data.id, socket.id);
        return next();
    }
    next(new Error('Authentication error'));
});

io.on('connection', (socket) => {
    const userId = getKeyByValue(onlineUserIDs, socket.id);
    const user = getUser(userId, 'id');
    if (user.unDeliveredMessages.length > 0) {
        socket.emit('unDeliveredMessages', user.unDeliveredMessages);
        user.unDeliveredMessages = [];
    }

    if (user.notifications.length > 0) {
        socket.emit('unDeliveredNotifications', user.notifications);
        user.notifications = [];
    }

    socket.on('message', (data) => {
        const receiverSocket = onlineUserIDs.get(data.to);
        if (receiverSocket) {
            io.to(receiverSocket).emit('message', data);
        } else {
            const receivingUser = users.find(user => user.id === data.to);
            receivingUser.unDeliveredMessages.push(data);
        }
    });

    socket.on('disconnect', () => {
        if (userId) {
            onlineUserIDs.delete(userId);
            saveUsers();
        }
    });
});