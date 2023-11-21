const express = require("express");
const stompit = require("stompit");
const xml2js = require("xml2js");
const config = require("./config");
const knex = require("knex");
const knexConnection = knex(config.knex);
const path = require("path");
const funcion = require("./funcionesGenerales");
const app = express();
const http = require("http");
const server = http.createServer(app);

const hostname = "localhost";
const port = 7000;

var checkID = 0;
var checkType = 0;
var arrID_PLACE = [];
var arrID = [];
var arrType = [];



server.listen(
  port, hostname, async () => {
    console.log(`Server running at http://${hostname}:${port}/`);
    connectAMQ();
    await RevisionInicial();
  }
);

async function RevisionInicial() {
  try {
    checkID = await funcion.Seleccionar("SV_VIAS", ["ID_PLACE"], {
      ACTIVE: "1",
    });
    for (item of checkID) {
      arrID_PLACE.push(item.ID_PLACE);
    }

    checkType = await funcion.Seleccionar("TYPES_ELEMENTS", [
      "ID_ELEM",
      "TYPE",
    ]);
    for (item of checkType) {
      arrID.push(item.ID_ELEM);
      arrType.push(item.TYPE);
    }
  } catch (err) {
    console.error("Error al verificar el ID en la tabla", err);
    return false;
  }
}

async function connectHostsAMQ() {
  const [servers] = await funcion.Seleccionar("SV_QUERIES", "QUERY", {
    NAME: "getHosts",
  });
  return servers;
}

async function connectAMQ() {
  const { QUERY } = await connectHostsAMQ();
  const hosts = await knexConnection.raw(QUERY);

  console.log(hosts.map((row) => row.HOST));

  hosts.forEach((_host) => {
    // Configuración de conexión
    const connectionConfig = {
      destination: config.amq.destination,
      host: _host.HOST,
      port: config.amq.port,
    };

    // Conexión al servidor
    stompit.connect(connectionConfig, (err, client) => {
      if (err) {
        console.error(
          `No se pudo establecer conexión con el servidor ${_host.HOST}`
        );
        console.error(err);
        return;
      }

      // process.send({tipo: 1,dato: `Iniciando conexión con el servidor: ${_host.HOST}`});
      //process.stdout.write("conexion iniciada");
      
      // Suscripción al servidor
      client.subscribe(connectionConfig, (err, msg) => {
        if (err) {
          console.error(
            `Error en la conexión con el servidor ${_host.HOST}: ${err}`
          );

          return;
        }
        // Lectura del mensaje
        msg.readString("UTF-8", async (err, body) => {
          if (err) {
            console.error(
              `Error al leer mensaje del servidor ${_host.HOST}: ${err}`
            );

            return;
          }
          console.log(`Mensaje recibido de ${_host.HOST}`);
          // process.send({ tipo: 1, dato: `Mensaje recibido de ${_host.HOST}` });
          parseXml(body);
        });
      });
      
    });
    return;
  });
}

// async function reinicioConexion(client) {
//   console.log(`en proceso a cerrar conexion`);
//   client.disconnect(() => {
//     console.log("Desconectando...");
//     process.send({ tipo: 1, dato: "Desconectando..." });
//     return;
//   });
// }


async function parseXml(body) {
  try {
    const result = await xml2js.parseStringPromise(body);
    const json = JSON.stringify(result);
    //console.log("\x1b[32m%s\x1b[0m", json);

    const datos = JSON.parse(json);

    if (datos) {
      const elemento = datos["Elements"]["Element"][0]["$"];
      const parametros = datos["Elements"]["Element"][0]["Params"];
      const alarmas = datos["Elements"]["Element"][0]["Alarms"];

      const id_elemento = elemento.Id;
      const tipo_elemento = elemento.Type;
      const estado_elemento = elemento.State;

      const ins_parametro = ParametrosObj(elemento, parametros);
      const ins_alarmas = AlarmasObj(elemento, alarmas);

      const knexConnection = await knex(config.knex);

      if (alarmas != undefined) {
        await RevisionAlarmas(ins_alarmas);
      } else {
        await RevisionParametros(ins_parametro);
      }
    }
  } catch (err) {
    console.log(err);
  }
}

async function RevisionAlarmas(alarma) {
  if (arrID_PLACE.indexOf(alarma.ID_PLACE) >= 0) {
    if (arrType.indexOf(parseInt(alarma.TYPE_ALARM)) >= 0) {
      await funcion.Insertar("H_ALARMS", {
        ID_PLACE: alarma.ID_PLACE,
        TYPE_ELEM: alarma.TYPE_ELEM,
        TYPE_ALARMS: alarma.TYPE_ALARM,
        ID_ALARM: alarma.ID_ALARM,
        STATUS_ALARM: alarma.STATUS_ALARM,
        DATE_UTC: alarma.DATE_UTC,
        ID_PARAM: alarma.ID_PARAM,
        VALUE_PARAM: alarma.VALUE_PARAM,
      });

      // process.send({ tipo: 1, dato: alarma });
    }
  }
}

async function RevisionParametros(parametro) {
  if (arrID_PLACE.indexOf(parametro.ID_PLACE) >= 0) {
    if (arrType.indexOf(parseInt(parametro.TYPE_ELEM)) >= 0) {
      await funcion.Insertar("H_PARAMS_ALARMS", {
        ID_PLACE: parametro.ID_PLACE,
        TYPE_ELEM: parametro.TYPE_ELEM,
        STATUS_ELEM: parametro.STATUS_ELEM,
        ID_PARAM: parametro.ID_PARAM,
        VALUE_PARAM: parametro.VALUE_PARAM,
        TYPE_PARAM: parametro.TYPE_PARAM,
      });
      // process.send({ tipo: 1, dato: parametro });
    }
  }
}

function ParametrosObj(elemento, parametros) {
  const ins_parametro = {
    ID_PLACE: elemento.Id.substring(0, 8),
    TYPE_ELEM: elemento.Type,
    STATUS_ELEM: elemento.State,
  };

  if (parametros != undefined) {
    const parametro = parametros[0]["Param"][0]["$"];
    const id_parametro = parametro.Id;
    const value_parametro = parametro.Value;
    const type_parametro = parametro.Type;

    ins_parametro.ID_PARAM = id_parametro;
    ins_parametro.VALUE_PARAM = value_parametro;
    ins_parametro.TYPE_PARAM = type_parametro;
  }
  return ins_parametro;
}

function AlarmasObj(elemento, alarmas) {
  const ins_alarmas = {
    ID_PLACE: elemento.Id.substring(0, 8),
    TYPE_ELEM: elemento.Type,
  };

  if (alarmas != undefined) {
    const alarma = alarmas[0]["Alarm"][0]["$"];
    const type_alarm = alarma.Type;
    const id_alarma = alarma.Id;
    const estado_alarma = alarma.State;
    const fecha_alarma = alarma.Date;

    const parametro_alarmado =
      alarmas[0]["Alarm"][0]["Params"][0]["Param"][0]["$"];
    const parametro_alarmado_id = parametro_alarmado.Id;
    const parametro_alarmado_valor = parametro_alarmado.Value;

    ins_alarmas.TYPE_ALARM = type_alarm;
    ins_alarmas.ID_ALARM = id_alarma;
    ins_alarmas.STATUS_ALARM = estado_alarma;
    ins_alarmas.DATE_UTC = fecha_alarma;
    ins_alarmas.ID_PARAM = parametro_alarmado_id;
    ins_alarmas.VALUE_PARAM = parametro_alarmado_valor;
  }
  return ins_alarmas;
}

module.exports = { connectAMQ, /*reinicioConexion*/ };
