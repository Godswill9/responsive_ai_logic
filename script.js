const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();
const cors=require("cors")
const processFile = require('./fileProcessor'); // Import the file processing module
const acceptData = require('./acceptData'); // Import the file processing module

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
    origin: ['http://127.0.0.1:5500'] // Replace with your allowed origins
  }));

app.use(bodyParser.json());

app.use('/api', acceptData);


app.get('/', async (req, res) => {
  try {
    res.status(200).send('welcome.');
  } catch (error) {
    console.error('Error');
  }
});




app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
