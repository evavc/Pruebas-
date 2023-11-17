const morgan = require("morgan");
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const app = express();
const http = require("http");
const server = http.createServer(app);
const funcionP = require("./routes/prueba");
const getList = require("./routes/listAlarms");
const { fork } = require("child_process");
const { exec } = require("child_process");

app.use(bodyParser.json());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración del motor de vistas y directorios de vistas

app.use(express.static(path.join(__dirname, "public")));

const hostname = "localhost";
const port = 7000;

server.listen(port, hostname, () => {
  const child = fork("./child.js");
  console.log("Corriendo child_server");
  console.log(`Server running at http://${hostname}:${port}/`);
  child.on("exit",(code) => {
    console.log("Server exited",code);
  })
});

