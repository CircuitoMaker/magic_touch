const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
app.use(express.static(path.join(__dirname, "public")));
app.use(cors());
app.use(express.json());

const upload = multer({
  dest: path.join(__dirname, "uploads"),
  limits: {
    fileSize: 50 * 1024 * 1024 // 5MB
  },
  

fileFilter: (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const extensoesPermitidas = [".jpg", ".jpeg", ".png", ".webp"];

  const tiposPermitidos = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  // Verifica extensão
  if (!extensoesPermitidas.includes(ext)) {
    return cb(new Error("Extensão de arquivo inválida."));
  }

  // Verifica MIME type
  if (!tiposPermitidos.includes(file.mimetype)) {
    return cb(new Error("Tipo de arquivo inválido."));
  }

  // Se passou em tudo
  cb(null, true);
}
});

app.post("/upload", (req, res) => {
  upload.single("imagem")(req, res, function (err) {

    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        error: "Arquivo muito grande. Máximo 50MB."
      });
    }

    if (err) {
      return res.status(400).json({
        error: err.message
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: "Nenhuma imagem enviada."
      });
    }

    res.json({ filename: req.file.filename });
  });
});

app.post("/process", async (req, res) => {
  const { filename, brilho, contraste, cropX, cropY, cropW, cropH } = req.body;

  const inputPath = path.join(__dirname, "uploads", filename);
  const outputPath = path.join(__dirname, "uploads", "edit-" + filename + ".jpg");

  try {

    let image = sharp(inputPath);

    // Crop se existir
    if (cropW && cropH) {
      image = image.extract({
        left: parseInt(cropX) || 0,
        top: parseInt(cropY) || 0,
        width: parseInt(cropW),
        height: parseInt(cropH)
      });
    }

    await image
      .modulate({
        brightness: parseFloat(brilho),
      })
      .linear(parseFloat(contraste))
      .toFile(outputPath);

   res.download(outputPath, async (err) => {
  if (err) {
    console.error("Erro no download:", err);
    return;
  }

  // Pequeno delay para Windows liberar o arquivo
  setTimeout(() => {
    try {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    } catch (err) {
      console.log("Erro ao limpar arquivos:", err.message);
    }
  }, 500);
});

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao processar imagem" });
  }
});



app.listen(3000, () => {
  console.log("Servidor rodando em http://localhost:3000");
});