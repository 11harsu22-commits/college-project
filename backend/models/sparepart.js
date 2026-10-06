const mongoose = require('mongoose');

const sparePartSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    // Device details from homepage form
    item_name: { type: String, required: true },
    category: { type: String, required: true },
    condition: { type: String, required: true },
    expected_price: { type: Number, required: true },
    
   // Pickup details (to be filled or updated in pickup.html)
    ewasteType: { type: String },
    quantity: { type: Number },
    pickup_date: { type: Date },
    pickup_time: { type: String },
    pickup_address: { type: String },
    pickup_status: { type: String, default: "Pending" },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SparePart', sparePartSchema);