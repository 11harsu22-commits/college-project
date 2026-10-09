const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // Default 'retail' rakhne se purana code bilkul nahi tuteega!
    order_type: { type: String, enum: ['retail', 'bulk'], default: 'retail' },
    
    
    part_name: { type: String, required: true },
    payment_method: { type: String, default: "UPI" },
    

    device_type: { 
        type: String, 
        required: function() { return this.order_type === 'retail'; } 
    },
    model_name: { 
        type: String, 
        required: function() { return this.order_type === 'retail'; } 
    },
    
    
    quantity: { 
        type: Number, 
        required: function() { return this.order_type === 'bulk'; } 
    },
    total_price: { 
        type: Number, 
        required: function() { return this.order_type === 'bulk'; } 
    },

    purchase_date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);