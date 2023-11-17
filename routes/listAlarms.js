const config = require("./../config");
const knex = require("knex");
const express = require("express");
const router = express.Router();
const http = require("http");
const socketIo = require("socket.io");
const funcion = require("./../funcionesGenerales");
const sql = require("mssql");

const server = http.createServer();
const io = socketIo(server);

function handleUpdateAlarms(data) {
  io.emit("updateAlarms", data);
}

// Escucha eventos de actualización de alarmas
io.on("connection", (socket) => {
  console.log("A client connected");
  socket.on("disconnect", () => {
    console.log("A client disconnected");
  });
  socket.on("updateAlarms", (data) => {
    handleUpdateAlarms(data);
  });
});

async function listAlarms(req, res) {
  try {
    const knexConnection = await knex(config.knex);
    const [queryResult] = await funcion.Seleccionar("SV_QUERIES", "QUERY", {
      NAME: "Lista_Alarmas",
    });
    console.log(queryResult);

    if (!queryResult) {
      throw new Error(`La consulta no se encontró en la base de datos.`);
    }

    const {QUERY} = queryResult;
    const results = await knexConnection.raw(QUERY);

    console.log(results);
    // Guarda los resultados de las alarmas entrantes
    const activeAlarms = {};

    // Verifica las alarmas entrantes con el estado de la alarma, place y el tipo de alarma
    results.forEach((result) => {
      const statusAlarm = parseInt(result.STATUS_ALARM);
      const id_place = parseInt(result.ID_PLACE);
      const type_alarm = parseInt(result.TYPE_ALARM);

      const alarmK = `${id_place}-${type_alarm}`;

      if (statusAlarm === 1) {
        activeAlarms[alarmK] = result;
      } else if (statusAlarm === 0 && activeAlarms[alarmK]) {
        delete activeAlarms[alarmK];
      }
    });

    // Emite eventos de actualización de alarmas al cliente
    io.emit("updateAlarms", Object.values(activeAlarms));

    res.render("listAlarms", { results: Object.values(activeAlarms) });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
}

router.get("/listAlarms", listAlarms);

module.exports = router;
