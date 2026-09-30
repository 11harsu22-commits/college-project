require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const User = require('./models/user');

const multer = require("multer");
const B2BVerification = require("./models/B2BVerification");

const app = express();

// Middleware
app.use(express.json());
app.use(cors()); 

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Connected Successfully!'))
    .catch(err => console.error('Database Connection Error:', err));

// 1. REGISTER ROUTE 
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        
        let userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        //(Encrypt)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

    
        const newUser = new User({
            username,
            email,
            password: hashedPassword
        });

        await newUser.save();
        res.status(201).json({ message: 'User registered successfully!' });

   } catch (error) {
    console.error("REGISTER ERROR:", error);

    res.status(500).json({
        message: "Server Error",
        error: error.message
    });
}
});

// 2. LOGIN ROUTE 
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid Email or Password' });
        }

        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid Email or Password' });
        }

        res.status(200).json({ message: 'Login successful!', username: user.username });

    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// B2B Verification Route
app.post(
    "/submit-b2b-docs",
    upload.fields([
        { name: "gst_cert", maxCount: 1 },
        { name: "cpcb_cert", maxCount: 1 }
    ]),
    async (req, res) => {
        try {
            const { company_name, gstin, cpcb_id } = req.body;

            const gstFile = req.files?.gst_cert?.[0];
            const cpcbFile = req.files?.cpcb_cert?.[0];

            if (!company_name || !gstin || !cpcb_id || !gstFile || !cpcbFile) {
                return res.status(400).send("Please fill all details and upload both documents.");
            }

            const verification = new B2BVerification({
                company_name,
                gstin,
                cpcb_id,

                gst_cert: {
                    filename: gstFile.originalname,
                    contentType: gstFile.mimetype,
                    data: gstFile.buffer
                },

                cpcb_cert: {
                    filename: cpcbFile.originalname,
                    contentType: cpcbFile.mimetype,
                    data: cpcbFile.buffer
                }
            });

            await verification.save();

            res.status(201).send("Documents submitted successfully! Status: Pending.");
        } catch (error) {
            console.error("B2B VERIFICATION ERROR:", error);
            res.status(500).send("Could not submit documents.");
        }
    }
);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));