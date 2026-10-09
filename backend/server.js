require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Order = require('./models/Order');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const User = require('./models/user');
const jwt = require("jsonwebtoken");
const multer = require("multer");
const B2BVerification = require("./models/B2BVerification");
const SparePart = require('./models/sparepart'); 
const app = express();
// JWT Authentication Middleware
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Authentication required"
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;

        next();
    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
}
// Middleware
app.use(express.json());
app.use(cors()); 

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected Successfully!"))
    .catch((err) => console.error('Database Connection Error:', err));

// 1. REGISTER ROUTE 
app.post('/api/register', async (req, res) => {
    try {
        const {
    username,
    email,
    password,
    phone,
    address,
    city,
    pincode
} = req.body;

        
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
            password: hashedPassword,
            phone,
            address,
            city,
            pincode
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

//  LOGIN ROUTE 
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

       const token = jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
);

res.status(200).json({
    message: "Login successful",
    username: user.username,
    token: token
});

    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});
//  GET USER PROFILE ROUTE
app.get('/api/user/profile', authMiddleware, async (req, res) => {
    try {
        // Find user by ID from the decoded JWT token (excluding password)
        const user = await User.findById(req.user.id).select('-password');
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Send user details to the frontend
        res.status(200).json({
            name: user.username, // mapping username to name for frontend
            email: user.email,
            phone: user.phone || "N/A",
            profilePic: user.profilePic || "" // if profile picture exists
        });

    } catch (error) {
        console.error("PROFILE ERROR:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
});
// 1. SELL / SUBMIT SPARE PART ROUTE
app.post('/api/sell-spare-part', authMiddleware, async (req, res) => {
    try {
        const { item_name, category, condition, expected_price } = req.body;

        const newPart = new SparePart({
            userId: req.user.id, // logged-in user ki ID
            item_name: item_name,
            category,
            condition,
            expected_price
        });

        await newPart.save();
        res.status(201).json({ 
            message: "Spare part submitted successfully", 
            _id: newPart._id 
        });
    } catch (error) {
        console.error("SELL PART ERROR:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
});

// 2. UPDATE PICKUP DETAILS ROUTE
app.put('/api/update-pickup/:id', authMiddleware, async (req, res) => {
    try {
        const { ewasteType, quantity, pickupDate, pickupTime, address, note, pickup_status } = req.body;

        const updatedPart = await SparePart.findByIdAndUpdate(
            req.params.id,
            {
                ewasteType,
                quantity,
                pickup_date: pickupDate,
                pickup_time: pickupTime,
                pickup_address: address,
                pickup_status
            },
            { new: true }
        );

        if (!updatedPart) {
            return res.status(404).json({ message: "Spare part item not found" });
        }

        res.status(200).json({ message: "Pickup details updated successfully", updatedPart });
    } catch (error) {
        console.error("PICKUP UPDATE ERROR:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
});
// B2B Status Check Route
app.get('/api/b2b/check-status', authMiddleware, async (req, res) => {
    try {
        const b2bData = await B2BVerification.findOne({ userId: req.user.id });
        if (!b2bData) {
            return res.status(404).json({ status: "Not_Registered" });
        }
        res.status(200).json({ status: b2bData.status });
    } catch (error) {
        console.error("B2B STATUS ERROR:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// B2B Verification Route 
app.post(
    "/submit-b2b-docs",
    authMiddleware,
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
                return res.status(400).json({ message: "Please fill all details and upload both documents." });
            }

            //check kare ki user ne pehle se B2B verification submit kiya hai ya nahi
            const existing = await B2BVerification.findOne({ userId: req.user.id });
            if (existing) {
                return res.status(400).json({ message: "You have already submitted B2B verification details." });
            }

            const verification = new B2BVerification({
                userId: req.user.id, //user id from JWT token
                company_name,
                gstin,
                cpcb_id,
                status: "Pending", // डिफ़ॉल्ट स्टेटस पेंडिंग रहेगा
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

            res.status(201).json({ message: "Documents submitted successfully! Status: Pending." });
        } catch (error) {
            console.error("B2B VERIFICATION ERROR:", error);
            res.status(500).json({ message: "Could not submit documents." });
        }
    }
);
// Buy Item API Route (Saves order with connected User ID)
app.post('/api/buy-item', authMiddleware, async (req, res) => {
    try {
        const { device_type, part_name, model_name, payment_method } = req.body;

        if (!device_type || !part_name || !model_name) {
            return res.status(400).json({ message: "All fields are required!" });
        }

        const newOrder = new Order({
            userId: req.user.id, // Linked to the logged-in user via JWT token
            device_type,
            part_name,
            model_name,
            payment_method: payment_method || "UPI"
        });

        await newOrder.save();
        res.status(201).json({ message: "Order placed successfully and saved to Database!" });
    } catch (error) {
        console.error("ORDER ERROR:", error);
        res.status(500).json({ message: "Server error while placing order", error: error.message });
    }
});
// ==========================================
// B2B BULK BUY API ROUTE (With Verification Check)
// ==========================================
app.post('/api/buy-bulk', authMiddleware, async (req, res) => {
    try {
        // 1. Check if user's B2B verification is Approved
        const b2bRecord = await B2BVerification.findOne({ userId: req.user.id });
        if (!b2bRecord || b2bRecord.status !== "Approved") {
            return res.status(403).json({ 
                message: "Access Denied! Your B2B account is not verified or pending approval." 
            });
        }

        // 2. Get data from request body
        const { part_name, quantity, total_price, payment_method } = req.body;

        if (!part_name || !quantity || !total_price) {
            return res.status(400).json({ message: "All required fields for bulk order must be provided!" });
        }

        // 3. Save to Unified Order Model with order_type 'bulk'
        const newBulkOrder = new Order({
            userId: req.user.id,
            order_type: 'bulk',
            part_name,
            quantity,
            total_price,
            payment_method: payment_method || "Bank Transfer"
        });

        await newBulkOrder.save();
        res.status(201).json({ message: "B2B Bulk order saved successfully to Database!" });
    } catch (error) {
        console.error("Bulk Order Error:", error);
        res.status(500).json({ message: "Server error while saving bulk order", error: error.message });
    }
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));