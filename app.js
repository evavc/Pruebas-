const morgan = require("morgan");
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const app = express();
const http = require("http");
const server = http.createServer(app);
const funcionP = require("./routes/prueba");
const getList = require("./routes/listAlarms");
const funcionC = require("./child");
app.use(bodyParser.json());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(express.static(path.join(__dirname, "public")));

const hostname = "localhost";
const port = 3000;

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "./html/prueba.html"));
});

app.use("/", getList);

app.route("/seleccionVias")
  .get(async (req, res) => {
    let vias = await funcionP.ObtenerActivas();
    //console.log(vias);
    res.send(vias);  
  })
  .put(async (req, res) => {
    let seleccionados = req.body;
    await funcionP.ActualizarActivas(seleccionados);
    res.send(seleccionados);
  });






server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});


// const { fork } = require("child_process");
//   var program = path.resolve("child.js");
//   const parameters = [];
//   const options = {
//     stdio: ["pipe", "pipe", "pipe", "ipc"],
//   }
// const child = fork(program, parameters, options);

const { spawn } = require("child_process");
const command = "node";
const program = path.resolve("child.js");
const options = {
  stdio: ["pipe", "pipe", "pipe", "ipc"],
  detached: true,
}

let child = spawn(command,[program], options);


child.on("message", (message) => {
  if (message.tipo == 1){
    console.log(message.dato);
  }else if(message.tipo ==2){
    console.log(message.dato);
  }else if(message.tipo ==3){
    clientChild = message.dato;
  }
}); 

child.on("close", function(code){
  console.log("proceso hijo cerrado", code);
});

child.on("error", (err) =>{
  console.error(err); 
})

process.on("SIGINT", () => {
  console.log("Recibida señal SIGINT en el proceso padre");
  child.kill("SIGTERM");
  process.exit();
});

app.route("/pruebacierre")
.get(async (req, res) => {
  console.log("Cerrando proceso");
  child.kill("SIGTERM");
  setTimeout(() => {
    console.log("Cierre del proceso hijo");
    res.send("proceso cerrado");
    process.exit();
  }, 1000);
});



async function Reinicio(){
  // console.log('Reiniciando');	
  // child.kill("SIGKILL"); 
  //child = fork(program, parameters, options);

}
