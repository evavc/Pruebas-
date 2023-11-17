const express = require("express");
const router = express.Router();
const stompit = require("stompit");
const xml2js = require("xml2js");
const config = require("./config");
const knex = require("knex");
const knexConnection = knex(config.knex);
const path = require("path");
const funcion = require("./funcionesGenerales");



// router.get("/Alarmas", async (req, res) => {
//   try {
//     res.sendFile(path.resolve("public", "html", "alarmas.html"));

//     // lista de hosts desde la función de conexión
//     const hosts = await connectHostsAMQ();

//     // manejar todas las conexiones y suscripciones
//     const connections = hosts.map((host) => connectAMQ(host));

//     // Esperar a que todas las conexiones y suscripciones se completen
//     await Promise.all(connections);
//   } catch (error) {
//     console.error(error);
//   }
// });

console.log("ejecutando al hijo");

let contador = 0;


async function connectHostsAMQ() {
  const [servers] = await funcion.Seleccionar("SV_QUERIES", "QUERY", { NAME: "getHosts" }); 
  return servers;     
}


async function connectAMQ() {
  
  const {QUERY} = await connectHostsAMQ();
  const hosts  = await knexConnection.raw(QUERY); 

  console.log(hosts.map(row => row.HOST));
  

  hosts.forEach((_host) => {
    return new Promise((resolve, reject) => {
    
      // Configuración de conexión
      const connectionConfig = {
        destination: config.amq.destination,
        host: _host.HOST,
        port: config.amq.port,
      };
  
      // Conexión al servidor
      
      stompit.connect(connectionConfig, (err, client) => {
        if (err) {
          console.error(`No se pudo establecer conexión con el servidor ${_host.HOST}`);
          console.error(err);
          reject(err);
          return;
        }

        // Suscripción al servidor
        client.subscribe(connectionConfig, (err, msg) => {
          if (err) {
            console.error(`Error en la conexión con el servidor ${_host.HOST}: ${err}`);
            reject(err); 
            return;
          }
  
          // Lectura del mensaje
          msg.readString("UTF-8", async (err, body) => {
            if (err) {
              console.error(`Error al leer mensaje del servidor ${_host.HOST}: ${err}`);
              reject(err); 
              return;
            }
  
            console.log(`Mensaje recibido de ${_host.HOST}`);
            parseBody(body); // Procesar el cuerpo del mensaje
            resolve(); // Resolver la promesa después de procesar el mensaje
          });
          
        });

      });
    });
  });

  console.log("Obtuve las ip para las conexiones AMQ");
  
}



function parseBody(body, res) {
  try {
    contador++;
    console.log(contador);
    parseXml(body);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error al analizar el XML");
  }
}

async function parseXml(body) {
  try {
    const result = await xml2js.parseStringPromise(body);
    const json = JSON.stringify(result);
    console.log("\x1b[32m%s\x1b[0m", json);

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
        await insertAlarmas(ins_alarmas, knexConnection);
      } else {
        await insertParametros(ins_parametro, knexConnection);
      }
    }
  } catch (err) {
    console.log(err);
  }
}

function ParametrosObj(elemento, parametros) {
  const ins_parametro = {
    ID_PLACE: elemento.Id,
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
    ID_PLACE: elemento.Id,
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

//Funcion solo para comparacion de place y type_elem en el caso de ser parametro, la diferencia esta en el tipo de elementos que toma
async function checkTypeElem(id_place, type, knexConnection) {
  try {
    const [checkPlaces, checkTypeElemt] = await Promise.all([
      knexConnection("SV_VIAS")
        .where("ID_PLACE", id_place.substring(0, 8))
        .first(),
      knexConnection("TYPES_ELEMENTS")
        .where("TYPE", type)
        .first()
    ]);

    return !!checkPlaces && !!checkTypeElemt;
  } catch (err) {
    console.error("Error al verificar el ID en la tabla", err);
    return false;
  }
}

//Funcion para la insercion de los parametros si cumplen con la comparacion del lugar y el elemento
async function insertParametros(ins_parametro, knexConnection) {
  try {
    const checkTypeE = await checkTypeElem(
      ins_parametro.ID_PLACE,
      ins_parametro.TYPE_ELEM,
      knexConnection
    );

    if (checkTypeE) {
      const dupliparams = await knexConnection("H_PARAMS_ALARMS")
        .where({
          ID_PLACE: ins_parametro.ID_PLACE,
          TYPE_ELEM: ins_parametro.TYPE_ELEM,
          ID_PARAM: ins_parametro.ID_PARAM,
          VALUE_PARAM: ins_parametro.VALUE_PARAM,
        })
        .first();
      if (dupliparams) {
        return; 
      }

      await knexConnection.transaction(async (trx) => {
        await trx("H_PARAMS_ALARMS").insert(ins_parametro);
      });
    } else {
      console.log(`El ID ${ins_parametro.ID_PLACE} no existe en la tabla`);
    }
    
  } catch (err) {
    
  } finally {
    knexConnection.destroy();
  }
}


//Funcion solo para comparacion de place y type_elem en el caso de ser alarmas
async function checkTypeF(type_alarm, id_place, knexConnection) {
  try {
    const [checkType, checkPlaces] = await Promise.all([
      knexConnection("TYPES_ELEMENTS")
        .where("ID_ELEM", type_alarm)
        .first(),
      knexConnection("SV_VIAS")
        .where("ID_PLACE", id_place.substring(0, 8))
        .first(),
    ]);

    return !!checkType && !!checkPlaces;
  } catch (err) {
    console.error("Error al verificar el ID en la tabla", err);
    return false;
  }
}

//Funcion para la insercion de alarmas si cumplen con las comparaciones de place y type_elem
async function insertAlarmas(ins_alarmas, knexConnection) {
  try {
    const checkTypeE = await checkTypeF(ins_alarmas.TYPE_ALARM, ins_alarmas.ID_PLACE, knexConnection
    );

    if (checkTypeE) {
      await knexConnection.transaction(async (trx) => {
        await trx("H_ALARMS").insert(ins_alarmas);
      });
    } else {
      console.log(
        `El ID ${ins_alarmas.TYPE_ALARM} o ${ins_alarmas.ID_PLACE} no existen en la tabla`
      );
    }
  } catch (err) {
    console.error(err);
  } finally {
    knexConnection.destroy();
  }
}

module.exports ={connectAMQ, };