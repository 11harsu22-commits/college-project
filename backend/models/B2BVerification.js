const mongoose = require("mongoose");

const b2bVerificationSchema = new mongoose.Schema({
    company_name: { type: String, required: true },
    gstin: { type: String, required: true },
    cpcb_id: { type: String, required: true },

    gst_cert: {
        filename: String,
        contentType: String,
        data: Buffer
    },

    cpcb_cert: {
        filename: String,
        contentType: String,
        data: Buffer
    },

    status: {
        type: String,
        default: "Pending"
    },

    submittedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("B2BVerification", b2bVerificationSchema);