import express, { Request, Response } from "express";
import cors from "cors";
import standingsRouter from "./routes/standings";
import teamsRouter from "./routes/teams";
import periodsRouter from "./routes/periods";
// import auctionRouter from "./routes/auction"; // for later

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/", (_req: Request, res: Response) => {
  res.send("FBST API is running 🚀");
});

app.use("/api/standings", standingsRouter);
app.use("/api/teams", teamsRouter);
app.use("/api/periods", periodsRouter);
// app.use("/api/auction", auctionRouter); // later

app.listen(PORT, () => {
  console.log(`🔥 FBST server listening on http://localhost:${PORT}`);
});

export default app;
