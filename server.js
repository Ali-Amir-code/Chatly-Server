const express = require('express');
const http = require('http');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const { Server } = require('socket.io');;
const io = new Server(server);

app.use(express.json())
app.use(cors());

const PORT = 3000;


const users = [
    {
        id: 9999,
        name: 'ali',
        username: 'admin',
        password: 'thunderfighter',
        addedUsers: [],
        unDeliveredMessages: [],
        notifications: [],
    }
];

const onlineUserIDs = new Map();

let id = 1000;

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
    };
    const dataForClient = {
        me: {
            id: data.id,
            username: data.username,
            name: data.name,
            password: data.password,
            contacts: [],
            notifications: [],
        },
        contacts: []
    }
    users.push(data);
    res.json(dataForClient);
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
                contacts: user.addedUsers,
                notifications: user.notifications,
            },
            contacts: user.addedUsers,
        }
        res.json(dataForClient);
    } else {
        res.status(401).json({ message: "Invalid username or password" });
    }
}

function handleNotification(req, res) {
    console.log('in handleNotification',req.body);
    const notification = req.body;

    if (!notification) {
        return res.json(false); // Send response and exit function
    }
    const onlineUser = onlineUserIDs.has(notification.receiverId);
    
    if (onlineUser) {
        io.to(onlineUserIDs.get(notification.receiverId)).emit('notification', notification);
        return res.json(true); // Send response and exit function
    }

    const receivingUser = users.find(user => user.id === notification.receiverId);
    const sendingUser = users.find(user => user.id === notification.sender.id);

    if (receivingUser && sendingUser) {
        if (notification.type.toLowerCase() === 'response' && notification.status.toLowerCase() === 'accepted') {
            sendingUser.addedUsers.push(notification.receiverId);
            receivingUser.addedUsers.push(notification.sender.id);
        }
        receivingUser.notifications.push(notification);
        return res.json(true); // Send response and exit function
    }

    return res.json(false); // Send response and exit function
}


app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/checkUsernameAvailability', (req, res) => {
    const username = req.query.username?.toLowerCase();
    if (!username) {
        return res.status(400).json({ message: 'Username is required' });
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

app.get('/getContactsID', (req, res) => {
    const id = Number(req.query.id);
    const contacts = users.find(user => user.id === id).addedUsers;
    res.json(contacts);
})

app.get('/getContact', (req, res) => {
    const id = Number(req.query.id);
    const contact = users.find(user => user.id === id);
    if (contact) {
        const contactForClient = {
            id: contact.id,
            name: contact.name,
            username: contact.username,
            messages: contact.unDeliveredMessages,
        };
        return res.json(contactForClient);
    }
    return res.status(401).json('No User Found');
});

app.post('/register', register);

app.post('/login', login);

app.post('/notification', handleNotification);

server.listen(PORT, () => {
    console.log(`Listening of localhost:${PORT}`);
});

// Socket Logic

io.use((socket, next) => {
    const data = socket.handshake.auth.user;
    if (!data || !data.id || !data.username || !data.password) {
        console.log('Authentication data is missing');
        return next(new Error('Authentication data is missing'));
    }
    if (isValidUser(data)) {
        onlineUserIDs.set(data.id, socket.id);
        console.log('Id have been set');
        return next();
    }
    console.log('Authentication error');
    next(new Error('Authentication error'));
});

io.on('connection', (socket) => {
    const userId = getKeyByValue(onlineUserIDs, socket.id);
    if(userId.unDeliveredMessages.length > 0){
        socket.emit('unDeliveredMessages', userId.unDeliveredMessages);
    }
    socket.on('disconnect', () => {
        if (userId) {
            onlineUserIDs.delete(userId);
        }
    });

    socket.on('message', (data) => {
        const receiverSocket = onlineUserIDs.get(data.to);
        if (receiverSocket) {
            io.to(receiverSocket).emit('message', data);
        }else{
            const receivingUser = users.find(user => user.id === data.to);
            receivingUser.unDeliveredMessages.push(data);
        }
    });
});