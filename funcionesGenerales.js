const config = require("./config");
const knex = require("knex");


async function Seleccionar(tabla, seleccion, condiciones) {
    const knexConnection = knex(config.knex);
  
    try {
      let result;
  
      if (condiciones) {
        result = await knexConnection(tabla)
          .where(condiciones)
          .select(seleccion);
      } else {
        result = await knexConnection(tabla)
          .select(seleccion);
      }
  
      if (!result) {
        throw new Error("No se encontraron resultados");
      }
  
      return result;
    } catch (error) {
      console.error(error);
      throw new Error("Error al realizar la consulta");
    } finally {
      if (knexConnection) {
        await knexConnection.destroy();
      }
    }
  }

  function SeleccionarSync(tabla, seleccion, condiciones) {
    const knexConnection = knex(config.knex);
  
    try {
      let result;
  
      if (condiciones) {
        result = knexConnection(tabla)
          .where(condiciones)
          .select(seleccion);
      } else {
        result =  knexConnection(tabla)
          .select(seleccion);
      }
  
      if (!result) {
        throw new Error("No se encontraron resultados");
      }
  
      return result;
    } catch (error) {
      console.error(error);
      throw new Error("Error al realizar la consulta");
    } finally {
      if (knexConnection) {
        knexConnection.destroy();
      }
    }
  }
  
  
  async function Insertar(tabla, insercion){
    const servers = await knex(config.knex);
  
     result = await servers
      .insert(insercion).into(tabla);  
  
    if (!result) {
      throw new Error("Error"); 
    }
  
  console.log(result);
  return result;
  }
  
  async function Actualizar(tabla, actualizacion, condiciones){
    const servers = await knex(config.knex);
    var result
    
    if (condiciones){
      result = await servers(tabla)
     .where(condiciones)
     .update(actualizacion);  
    }else{
      result = await servers(tabla)
    .update(actualizacion); 
    }
  console.log(result);
   if (!result) {
    throw new Error("No se encontraron resultados"); 
   }
  return result;
  }
  
  async function Eliminar(tabla, condiciones){
    const servers = await knex(config.knex);
    var result
    
    if (condiciones){
      result = await servers(tabla)
     .where(condiciones)
     .del();  
    }else{
      console.log("Accion no permitida");
    }
    
   if (!result) {
     throw new Error("Error"); 
   }
  return result;
  }
  module.exports = {
    Seleccionar,
    SeleccionarSync,
    Insertar,
    Actualizar,
    Eliminar,
  };