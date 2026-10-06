const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    device_type: { type: String, required: true },
    part_name: { type: String, required: true },
    model_name: { type: String, required: true },
    payment_method: { type: String, default: "UPI" },
    purchase_date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);