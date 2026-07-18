require("dotenv").config();

const express = require("express");
const cors = require("cors");

const Groq = require("groq-sdk");

const multer = require("multer");

const pdfParse = require("pdf-parse");

const mammoth = require("mammoth");

const app = express();

const upload = multer({
  storage: multer.memoryStorage()
});

app.use((req, res, next) => {

  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  next();

});

app.use(cors({
  origin: "*"
}));

// app.use(express.json());

app.use(express.json({ limit: "20mb" }));

app.use(express.urlencoded({
  limit: "20mb",
  extended: true
}));
// app.options("*", cors());

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

app.post("/chat", async (req, res) => {

  try {

    const userMessage = req.body.message;

    const completion =
      await groq.chat.completions.create({

        messages: [
          {
            role: "user",
            content: userMessage
          }
        ],

        model: "llama-3.3-70b-versatile"

      });

    const reply =
      completion.choices[0].message.content;

    res.json({
      reply: reply
    });

  } catch (error) {

    console.log(error);

    res.json({
      reply: "Error"
    });
  }
});


app.post("/analyze", upload.single("resume"), async (req, res) => {

  try {

    let resume = "";

const goal = req.body.goal;

if (req.file) {

  if (req.file.mimetype === "application/pdf") {

    const data = await pdfParse(req.file.buffer);

    resume = data.text;
  }

  else if (
    req.file.mimetype ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {

    const data =
      await mammoth.extractRawText({
        buffer: req.file.buffer
      });

    resume = data.value;
  }

}

else {

  resume = req.body.resume;
}

    const prompt = `
  Analyze this resume.

  Resume:
  ${resume}

  Career Goal:
  ${goal}

  Skills:
  Show the skills already present in the resume.

  Missing Skills:
  Show important missing skills for the career goal.

  Roadmap:
  Give step-by-step roadmap to become a ${goal}.

  Interview Questions:
  Give important interview questions for ${goal}.

  Keep the response clean and properly formatted.
  `;

    const completion =
      await groq.chat.completions.create({

        messages: [
          {
            role: "user",
            content: prompt
          }
        ],

        model: "llama-3.3-70b-versatile"

      });

    const reply =
      completion.choices[0].message.content;

    res.json({
      message: reply
    });

  } catch (error) {

  console.log(error);

  res.json({
    message: error.message
  });
}

});

app.get("/", (req, res) => {
  res.send("Server Running");
});



const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Server Running on Port ${PORT}`);
  });
}

module.exports = app;