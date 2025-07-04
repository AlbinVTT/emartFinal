const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Load Scenario Config
let scenarioConfig = {};
try {
    scenarioConfig = JSON.parse(fs.readFileSync('./scenario_config.json'));
    console.log("📖 Loaded scenario config:", scenarioConfig);
} catch (err) {
    console.error("⚠️ Could not load scenario_config.json:", err.message);
}

// ✅ Helper: Get scenario for a user
function getScenario(user_id) {
    return scenarioConfig[user_id] || "normal_flow";
}

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
    const user_id = req.body.user_id;
    const scenario = getScenario(user_id);

    if (scenario === "payment_slow") {
        console.log(`⏳ Simulating payment slowness for ${user_id}`);
        await new Promise(resolve => setTimeout(resolve, 7000)); // 7s delay
    }

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

// ✅ Initiate Payment Route (Call Submit Order)
app.post('/initiatepayment', async (req, res) => {
    const { user_id, amount, items } = req.body; // ⬅️ Added items here
    const scenario = getScenario(user_id);

    if (!user_id || typeof amount !== 'number' || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Missing or invalid user_id, amount, or items" });
    }

    // 🔥 Simulate gateway timeout
    if (scenario === "gateway_timeout") {
        console.log(`💥 Simulating gateway timeout for ${user_id}`);
        return res.status(504).json({ error: "Gateway Timeout" });
    }

    try {
        // ✅ Step 1: Compliance Check
        const complianceResponse = await axios.post('http://compliance:80/ComplianceCheck', {
            id: user_id,
            cartTotal: amount
        });

        if (complianceResponse.data.status !== 'Approved') {
            return res.status(400).json({
                error: 'Compliance check failed',
                reason: complianceResponse.data.reason || 'Unknown compliance failure'
            });
        }

        console.log(`✅ Compliance approved for user: ${user_id}`);

        // ✅ Step 2: Submit Order
        const submitOrderResponse = await axios.post("http://order-processor-python:5002/submitorder", {
            user_id,
            items,
            total: amount
        });

        console.log(`📦 Order submitted for user: ${user_id}`);

        // ✅ Return combined result
        return res.json({
            message: 'Payment and order successful',
            compliance: complianceResponse.data,
            order: submitOrderResponse.data
        });

    } catch (error) {
        console.error("Payment/Order error:", error.message);
        const fallback = error?.response?.data?.reason || error?.response?.data?.error || 'Payment/Order processing failed';
        return res.status(500).json({ error: fallback });
    }
});

app.listen(3001, () => console.log('🌐 API Gateway running on port 3001'));
