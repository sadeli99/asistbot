const fetch = require("node-fetch");
const FormData = require("form-data");

const BOT_TOKEN = "8108031553:AAHNSX7hd62CC3GIrd3APT-2ccXm0IK15O4"; // Ganti dengan token bot Anda
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const API_ENDPOINT = "https://nitahai.vercel.app/asisten";

// Fungsi untuk mengirim pesan ke pengguna Telegram
async function sendMessage(chatId, text) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

// Fungsi untuk mengunggah file ke API dan mengambil bagian `text` dari respons
async function uploadToApi(fileBuffer, fileName) {
  const formData = new FormData();
  formData.append("file", fileBuffer, fileName);

  const response = await fetch(API_ENDPOINT, { method: "POST", body: formData });
  const jsonResponse = await response.json();

  if (jsonResponse.ok && jsonResponse.text) {
    return jsonResponse.text; // Mengambil bagian `text`
  } else {
    throw new Error("Respons dari API tidak valid atau gagal.");
  }
}

// Webhook handler
async function handleWebhook(req, res) {
  const { message } = req.body;

  if (message && message.text === "/start") {
    // Penanganan perintah /start
    const chatId = message.chat.id;
    await sendMessage(chatId, "Halo Pelajar, silakan upload foto soal kamu.");
  } else if (message && message.photo) {
    // Penanganan jika pengguna mengirim foto
    const chatId = message.chat.id;
    const fileId = message.photo[message.photo.length - 1].file_id;

    try {
      // Mendapatkan URL file dari Telegram
      const fileResponse = await fetch(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
      const fileData = await fileResponse.json();

      if (!fileData.ok) throw new Error("Gagal mendapatkan file dari Telegram");

      const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`;
      const fileBuffer = await fetch(fileUrl).then((res) => res.buffer());

      // Mengunggah file ke API dan memeriksa apakah hasilnya berhasil
      const apiText = await uploadToApi(fileBuffer, fileData.result.file_path);

      // Hanya mengirim pesan jika respons API OK dan terdapat 'text'
      if (apiText) {
        await sendMessage(chatId, `Hasil API: ${apiText}`);
      } else {
        await sendMessage(chatId, "Tidak ada hasil dari API.");
      }
    } catch (error) {
      console.error(error);
      await sendMessage(chatId, "Terjadi kesalahan saat memproses gambar.");
    }
  } else if (message) {
    // Penanganan untuk pesan teks lainnya
    const chatId = message.chat.id;
    await sendMessage(chatId, "Harap kirimkan gambar/foto ke bot.");
  }

  res.status(200).send("OK");
}

// Ekspor handler untuk Vercel
module.exports = async (req, res) => {
  if (req.method === "POST") {
    await handleWebhook(req, res);
  } else {
    res.status(200).send("Bot Telegram aktif!");
  }
};
