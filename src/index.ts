import express, { json, urlencoded } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import rateLimit from "express-rate-limit";
import jobRouter from "./routes/jobs/index.js";
import authRouter from "./routes/auth/index.js";
import companyRouter from "./routes/company/index.js";
import recuriterRouter from "./routes/recuriter/index.js";
import candidateRouter from "./routes/candidate/index.js";
import applicationRouter from "./routes/application/index.js";
import uploadRouter from "./routes/uploads/index.js";

const app = express();
const PORT = 3000;
app.set("trust proxy", 1);
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
const allowedOrigins = (
  process.env.CORS_ORIGIN ||
  "http://localhost:8081,http://127.0.0.1:8080,http://localhost:5173,http://127.0.0.1:5173,https://stackhirejobs.vercel.app"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

app.use(urlencoded({ extended: true }));

app.use(json());
app.use(cookieParser());
app.use(apiLimiter);

app.get("/", (req, res) => {
  res.send("Hello world");
});

app.use("/jobs", jobRouter);
app.use("/auth", authRouter);
app.use("/company", companyRouter);
app.use("/recuriter", recuriterRouter);
app.use("/candidate", candidateRouter);
app.use("/application", applicationRouter);
app.use("/uploads", uploadRouter);

app.listen(3000, () => {
  console.log(`server is running port - ${PORT}`);
});
