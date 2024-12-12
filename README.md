# API Documentation for Electron.js-based Chat App

This document explains how to use the server code of the Electron.js chat app to create a mobile version of the app using Flutter. The server code is written in Node.js and utilizes the Express framework and Socket.IO for real-time communication.

## Server Overview

The server provides the following functionalities:

- User registration and login
- Notification handling
- Real-time messaging
- Checking user and contact statuses

The server runs on **localhost:3000** by default.

## Setup Instructions

### Prerequisites

1. **Node.js** and **npm** must be installed.
2. Install dependencies by running the following command in the server directory:
   ```bash
   npm install express socket.io cors
   ```
3. Start the server using:
   ```bash
   node server.js
   ```

## API Endpoints

### 1. `GET /`

**Description:** Returns a simple "Hello World!" message.

### 2. `POST /register`

**Description:** Registers a new user.

- **Request Body:**
  ```json
  {
    "name": "User Name",
    "username": "unique_username",
    "password": "secure_password"
  }
  ```
- **Response:**
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

**Description:** Logs in an existing user.

- **Request Body:**
  ```json
  {
    "username": "unique_username",
    "password": "secure_password"
  }
  ```
- **Response:**
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

**Description:** Checks if a username is available.

- **Query Parameter:**
  `username` (string)
- **Response:**
  ```json
  { "available": true }
  ```

### 5. `GET /checkStatus`

**Description:** Checks the online status of a user by their ID.

- **Query Parameter:**
  `id` (number)
- **Response:**
  - If online: `"online"`
  - If offline: `"offline"`

### 6. `GET /getContactsID`

**Description:** Retrieves the IDs of the contacts added by a user.

- **Query Parameter:**
  `id` (number)
- **Response:**
  ```json
  [1002, 1003]
  ```

### 7. `GET /getContact`

**Description:** Retrieves details of a specific contact by their ID.

- **Query Parameter:**
  `id` (number)
- **Response:**
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

**Description:** Sends a notification to a user.

- **Request Body:**
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
- **Response:**
  ```json
  true
  ```

## Real-time Communication

### Socket.IO Setup

- **Server Address:** `http://localhost:3000`
- Use Socket.IO for real-time communication.
- **Authentication:** Send user details in the handshake `auth` object.

### Socket Events

1. **Connect:** Establishes a connection to the server.

   - If the user has undelivered messages, they are sent immediately.

2. **Message Event:** Sends a message to another user.

   - **Event Name:** `message`
   - **Data Format:**
     ```json
     {
       "to": 1002,
       "message": "Hello!",
       "timestamp": "2024-12-12T10:00:00Z"
     }
     ```

3. **Notification Event:** Receives real-time notifications.

   - **Event Name:** `notification`
   - **Data Format:** Same as the notification endpoint.

4. **Disconnect:** Updates the user's online status.

## Integration with Flutter

1. **HTTP Requests:** Use libraries like `http` or `dio` in Flutter to make API calls.
2. **Socket.IO:** Use the `socket_io_client` package for real-time communication:
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

## Notes

- Ensure that the server is accessible to the mobile app by hosting it on a public IP or configuring port forwarding.
- Use secure methods like HTTPS for production.