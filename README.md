# express-locallibrary-tutorial

Tutorial "Local Library" website written in Node/Express.

---

## Installation

Run the following command to install dependencies:

```
npm install
```

## Setup: Create your .env file

Create a `.env` file in the root of your project and add the following content:

```
# Environment variables for express-locallibrary-tutorial
PORT=3000
# To use a different database, change the name after the last slash:
# Example: mongodb://localhost:27017/yourdbname
MONGODB_URI=mongodb://localhost:27017/locallibrary
```

---

### Populate the database

The script `populate.js` uses the MongoDB URI from your `.env` file (`MONGODB_URI`).

To populate your local database:

```
node populate.js
```

To use MongoDB Atlas, set your Atlas URI in `.env`:

```
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/locallibrary?retryWrites=true&w=majority
```

### Start the application

```
npm start
```

Open a browser to [http://localhost:3000/](http://localhost:3000/) to view the library site.

---

## Debugging

To enable debug tracing for controllers, run the app with the following environment variable:

```
DEBUG=bookController,authorController npm start
```

You will see debug output for all controller function calls in your terminal.

---

For more information and a step-by-step guide, see the official [Mozilla Express Local Library Tutorial](https://developer.mozilla.org/en-US/docs/Learn/Server-side/Express_Nodejs/Tutorial_local_library_website).
