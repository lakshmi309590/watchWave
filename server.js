const express = require('express');
const app = express();

// Define a route to handle incoming requests
app.get('/', (req, res) => {
    res.send('Hellokmmk, Worlddldld!');
});

// Start the server and listen for incoming requests
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
