import express, { json, urlencoded } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import jobRouter from "./routes/jobs";
import authRouter from "./routes/auth";
import companyRouter from "./routes/company";
import recuriterRouter from "./routes/recuriter";
import candidateRouter from "./routes/candidate";
import applicationRouter from "./routes/application";
import uploadRouter from "./routes/uploads";

const app = express();
const PORT = 3000;
const allowedOrigins = (
  process.env.CORS_ORIGIN ||
  "http://localhost:8080,http://127.0.0.1:8080,http://localhost:5173,http://127.0.0.1:5173"
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
