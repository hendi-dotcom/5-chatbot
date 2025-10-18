import "dotenv/config";
import express from "express";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();

// Validasi API Key saat startup
if (!process.env.GENAI_API_KEY) {
  // Server akan berhenti jika .env tidak dikonfigurasi dengan benar
  throw new Error("GENAI_API_KEY is not defined in the .env file");
}

const genAI = new GoogleGenerativeAI(process.env.GENAI_API_KEY);
const GEMINI_MODEL = "gemini-2.5-flash";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "static")));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server Ready on http://localhost:${PORT}`);
});

/**
 * Validates the conversation payload from the request.
 * @param {any} conversation - The conversation payload from req.body.
 * @throws {Error} If the validation fails.
 */
function validateConversation(conversation) {
  if (!Array.isArray(conversation)) {
    throw new Error("Payload 'conversation' harus berupa array.");
  }
  if (conversation.length === 0) {
    throw new Error("Payload 'conversation' tidak boleh kosong.");
  }

  for (const message of conversation) {
    if (
      !message ||
      typeof message.role !== "string" ||
      !["user", "model"].includes(message.role) ||
      typeof message.text !== "string" ||
      message.text.trim() === ""
    ) {
      throw new Error(
        "Setiap pesan dalam 'conversation' harus berupa objek dengan format { role: 'user'|'model', text: '...' } yang valid."
      );
    }
  }
}

app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    // Basic validation for the new structure
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: "Invalid 'messages' payload." });
    }

    // Transform for Gemini API - assuming single message for now as per frontend
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== 'user' || !lastMessage.content) {
        return res.status(400).json({ message: "Invalid message structure." });
    }

    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const result = await model.generateContent(lastMessage.content);
    const response = await result.response;
    const text = response.text();

    res.json({ result: text });
  } catch (error) {
    // --- Penanganan Error ---
    // LOG ERROR LENGKAP ke konsol server untuk diagnosis
    console.error("Terjadi error di /api/chat:", error);

    // Jika header sudah terkirim (stream sudah dimulai), kita tidak bisa mengirim JSON lagi
    if (res.headersSent) {
      res.end(); // Tutup koneksi stream
      return;
    }

    // Kirim respons JSON error standar jika stream belum dimulai
    const statusCode =
      error.message.includes("harus berupa") ||
      error.message.includes("Invalid")
        ? 400
        : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Terjadi kesalahan pada server.",
      data: null,
    });
  }
});
