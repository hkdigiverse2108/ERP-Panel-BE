import server from "./src";

const PORT = process.env.PORT || 80;

server.listen(PORT, () => {
  console.log(`server started at port http://localhost:${PORT}`);
});
