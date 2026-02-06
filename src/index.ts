import express, { json, urlencoded } from "express";
import jobRouter from "./routes/jobs";
import authRouter from "./routes/auth";
import companyRouter from "./routes/company";
import recuriterRouter from "./routes/recuriter";
import candidateRouter from "./routes/candidate";
import applicationRouter from "./routes/application";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";

const app = express();
const PORT = 3000;

app.use(urlencoded({ extended: true }));

app.use(json());

app.get("/", (req, res) => {
  res.send("Hello world");
});

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/jobs", jobRouter);
app.use("/auth", authRouter);
app.use("/company", companyRouter);
app.use("/recuriter", recuriterRouter);
app.use("/candidate", candidateRouter);
app.use("/application", applicationRouter);

app.listen(3000, () => {
  console.log(`server is running port - ${PORT}`);
});
