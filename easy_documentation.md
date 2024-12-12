# Simple Guide to the Chat App Server

This guide will help you use the server code of the chat app to create a mobile version using Flutter. The server is built with Node.js and uses tools like Express and Socket.IO for features like real-time messaging.

## What the Server Does

The server provides these features:

- Registering and logging in users
- Sending and receiving notifications
- Real-time chat
- Checking if users are online

It runs on **localhost:3000** by default.

## How to Get the Server Running

### What You Need

1. **Node.js** installed on your computer.
2. Install the required tools by running this in the server folder:
   ```bash
   npm install express socket.io cors
   ```
3. Start the server with:
   ```bash
   node server.js
   ```

## Talking to the Server: API Endpoints

### 1. `GET /`

**What it does:** Sends back "Hello World!" to confirm the server is working.

### 2. `POST /register`

**What it does:** Lets new users sign up.

- **Send this data:**
  ```json
  {
    "name": "User Name",
    "username": "unique_username",
    "password": "secure_password"
  }
  ```
- **You’ll get back:**
  ```json
  {
    "me": {
      "id": 1001,
      "username": "unique_username",
      "name": "User Name",
      "password": "secure_password",
      "notifications": []
    },
    "contacts": []
  }
  ```

### 3. `POST /login`

**What it does:** Logs in users who already signed up.

- **Send this data:**
  ```json
  {
    "username": "unique_username",
    "password": "secure_password"
  }
  ```
- **You’ll get back:**
  ```json
  {
    "id": 1001,
    "username": "unique_username",
    "name": "User Name",
    "password": "secure_password",
    "notifications": []
  }
  ```

### 4. `GET /checkUsernameAvailability`

**What it does:** Checks if a username is taken.

- **Send this:** `username=desired_username`
- **You’ll get back:**
  ```json
  { "available": true }
  ```

### 5. `GET /checkStatus`

**What it does:** Tells if a user is online or offline.

- **Send this:** `id=user_id`
- **You’ll get back:**
  - If online: `"online"`
  - If offline: `"offline"`

### 6. `GET /getContactsID`

**What it does:** Lists the IDs of the user’s contacts.

- **Send this:** `id=user_id`
- **You’ll get back:**
  ```json
  [1002, 1003]
  ```

### 7. `GET /getContact`

**What it does:** Gets details about a specific contact.

- **Send this:** `id=contact_id`
- **You’ll get back:**
  ```json
  {
    "id": 1002,
    "name": "Contact Name",
    "username": "contact_username",
    "messages": [],
    "haveUnreadMessages": false
  }
  ```

### 8. `POST /notification`

**What it does:** Sends a notification to someone.

- **Send this:**
  ```json
  {
    "receiverId": 1002,
    "sender": {
      "id": 1001,
      "name": "User Name"
    },
    "type": "Request",
    "status": "Pending"
  }
  ```
- **You’ll get back:**
  ```json
  true
  ```

## Using Real-time Messaging with Socket.IO

### How It Works

1. **Server Address:** `http://localhost:3000`
2. **Authentication:** When connecting, send the user’s info like this:
   ```json
   {
     "id": userId,
     "username": username,
     "password": password
   }
   ```

### What You Can Do with Sockets

1. **Connect:** The app connects to the server and gets any undelivered messages.
2. **Send Messages:** Share messages with this format:
   ```json
   {
     "to": 1002,
     "message": "Hello!",
     "timestamp": "2024-12-12T10:00:00Z"
   }
   ```
3. **Receive Notifications:** Get notifications in real time.
4. **Disconnect:** Updates the server when a user goes offline.

## How to Make the Mobile App

1. **Send API Requests:** Use Flutter packages like `http` or `dio` to call the server endpoints.
2. **Use Real-time Messaging:** Add the `socket_io_client` package in Flutter:
   ```dart
   import 'package:socket_io_client/socket_io_client.dart' as IO;

   IO.Socket socket = IO.io('http://localhost:3000', <String, dynamic>{
     'transports': ['websocket'],
     'auth': {
       'user': {
         'id': userId,
         'username': username,
         'password': password
       }
     }
   });

   socket.on('connect', (_) {
     print('Connected');
   });

   socket.on('message', (data) {
     print('New message: $data');
   });
   ```

## Extra Tips

- If you’re using the app over the internet, host the server with a public IP or set up port forwarding.
- Always use HTTPS for safety when your app is live.