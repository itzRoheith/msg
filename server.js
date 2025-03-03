const express = require("express");
const mongoose = require("mongoose");
const admin = require("firebase-admin");
const cors = require("cors");

// 🔹 Initialize Express App
const app = express();
app.use(express.json());  // Enable JSON body parsing
app.use(cors());          // Enable Cross-Origin Resource Sharing

// 🔹 Connect to MongoDB (Replace with your Railway MongoDB URI)
mongoose.connect("mongodb+srv://itzrth:Roheith1979@clus.ke3bg.mongodb.net/?retryWrites=true&w=majority&appName=Clus", { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

// 🔹 Define Message Schema
const MessageSchema = new mongoose.Schema({
    text: String,
    timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model("Message", MessageSchema);

// 🔹 Firebase Admin SDK Setup
const serviceAccount = require("./mongodbnotificationapp-firebase-adminsdk-fbsvc-2bf5f90213.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// 🔹 API to Receive Messages from Users
app.post("/send", async (req, res) => {
    const { text } = req.body;

    if (!text) return res.status(400).json({ error: "Message text is required" });

    const newMessage = new Message({ text });
    await newMessage.save();
    
    console.log("✅ Message Saved:", text);
    res.json({ success: true, message: "Message saved!" });
});

// 🔹 Watch MongoDB for New Messages & Trigger Firebase
const changeStream = Message.watch();
changeStream.on("change", async (change) => {
    if (change.operationType === "insert") {
        const newMessage = change.fullDocument;

        // 🔥 Firebase Notification Payload
        const payload = {
            notification: {
                title: "New Message!",
                body: newMessage.text,
                sound: "default",
                priority: "high"
            },
            data: { message: newMessage.text }
        };

        try {
            await admin.messaging().sendToTopic("messages", payload);
            console.log("✅ Firebase Notification Sent:", newMessage.text);
        } catch (err) {
            console.error("❌ Error Sending Firebase Notification:", err);
        }
    }
});

// 🔹 Start the Express Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
