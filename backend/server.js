const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const invoiceRoutes = require('./routes/invoiceRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));
// app.use(express.static(path.join(__dirname, '../fontawesome-free-7.2.0-web')));

// API Routes
app.use('/api', invoiceRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Medical Invoice API is running with SQLite' });
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📋 Frontend available at http://localhost:${PORT}/`);
    console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
    console.log(`💾 Database: SQLite (database.sqlite)`);
});