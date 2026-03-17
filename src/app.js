const express = require('express');
const cors = require('cors');

const turismoRoutes = require('./routes/turismoRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/turismo', turismoRoutes);

module.exports = app;