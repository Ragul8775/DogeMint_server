import express from "express";
import routes from "./routes.js";

const app = express();

app.use(express.json());
app.use(routes);
app.use(express.json());

const port = 8000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
