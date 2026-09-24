require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const User = require('./models/user');

const app = express();

// Middleware
app.use(express.json());
app.use(cors()); // ताकि फ्रंटएंड बिना एरर के बैकएंड से जुड़ सके

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Connected Successfully!'))
    .catch(err => console.error('Database Connection Error:', err));

// 1. REGISTER ROUTE (नया यूज़र बनाने के लिए)
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // चेक करें कि यूज़र पहले से तो नहीं है
        let userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        // पासवर्ड को सुरक्षित (Encrypt) करें
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // नया यूज़र डेटाबेस में सेव करें
        const newUser = new User({
            username,
            email,
            password: hashedPassword
        });

        await newUser.save();
        res.status(201).json({ message: 'User registered successfully!' });

    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// 2. LOGIN ROUTE 
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // यूज़र को ईमेल से ढूंढें
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid Email or Password' });
        }

        // पासवर्ड मैच करें
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid Email or Password' });
        }

        res.status(200).json({ message: 'Login successful!', username: user.username });

    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));