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
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views"));

app.use(express.static(path.join(__dirname, "public")));

const hostname = "localhost";
const port = 3000;

app.get("/", (req, res) => {
 res.sendFile(path.join(__dirname, "./html/prueba.html"));
});

app.use("/", getList);


app
  .route("/seleccionVias")
  .get(async (req, res) => {
    let vias = await funcionP.ObtenerActivas();
    console.log(vias);
    res.send(vias);
  })
  .put(async (req, res) => {
    let seleccionados = req.body;
    await funcionP.ActualizarActivas(seleccionados);
    res.send(seleccionados);
  });

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
  exec(`cd C:\Users\emvaldespino\OneDrive - Indra\Escritorio\Proy_Prueba`, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);
  });
});

