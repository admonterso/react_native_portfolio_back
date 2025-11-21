import { app } from "./app.ts";

const PORT = 5000;
app.listen(PORT, () => console.log("Server running on port", PORT));
