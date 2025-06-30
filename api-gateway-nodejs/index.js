const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Login Route
app.post("/login", async (req, res) => {
    try {
        const response = await axios.post("http://order-processor-python:5002/validateuser", req.body);
        res.json(response.data);
    } catch (error) {
        console.error("Login error:", error.message);
        res.status(401).json({ message: "Login failed" });
    }
});

// ✅ Get Products Route
app.get("/products", async (req, res) => {
    try {
        const response = await axios.get("http://order-processor-python:5002/products");
        res.json(response.data);
    } catch (error) {
        console.error("Product fetch error:", error.message);
        res.status(500).json({ message: "Could not fetch products" });
    }
});

// ✅ Submit Order Route
app.post("/submitorder", async (req, res) => {
    try {
        const { user_id, items, total } = req.body;

        if (!user_id || !Array.isArray(items) || items.length === 0 || typeof total !== 'number') {
            return res.status(400).json({ message: "Missing or invalid order fields" });
        }

        const allItemsValid = items.every(item =>
            item.product_id != null && item.name && item.quantity > 0 && typeof item.price === 'number'
        );

        if (!allItemsValid) {
            return res.status(400).json({ message: "Invalid item in order" });
        }

        const response = await axios.post("http://order-processor-python:5002/submitorder", req.body);
        res.json(response.data);
    } catch (error) {
        console.error("Submit order error:", error.message);
        res.status(500).json({ message: "Could not submit order" });
    }
});

// ✅ Initiate Payment Route with fixed field for .NET Compliance
app.post('/initiatepayment', async (req, res) => {
    const { user_id, amount } = req.body;

    if (!user_id || typeof amount !== 'number') {
        return res.status(400).json({ error: "Missing or invalid user_id or amount" });
    }

    try {
        // 🔄 FIXED: Send "id" instead of "user_id"
        const complianceResponse = await axios.post('http://compliance:80/ComplianceCheck', {
            id: user_id
        });

        if (complianceResponse.data.status !== 'Approved') {
            return res.status(400).json({ error: 'Compliance check failed' });
        }

        // 🔄 Optional: processpayment only if implemented
        // const orderResponse = await axios.post('http://order-processor-python:5002/processpayment', {
        //     user_id,
        //     amount
        // });

        return res.json({ message: 'Payment successful' });
    } catch (error) {
        console.error("Payment error:", error.message);
        return res.status(500).json({ error: 'Payment processing failed' });
    }
});

app.listen(3001, () => console.log('🌐 API Gateway running on port 3001'));

