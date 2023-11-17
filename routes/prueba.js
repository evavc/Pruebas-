const funcion = require("./../funcionesGenerales");

async function ObtenerActivas() {
    try {
      const queryVias = await funcion.Seleccionar("sv_vias", ["VIA", "ACTIVE"]);
      vias = Array.isArray(queryVias) ? queryVias : [queryVias];
  
      vias.forEach((via) => {
        via.checked = via.ACTIVE === 1;
      });
      return vias;
    } catch (err) {
      console.error("Error al obtener los nombres de las vías", err);
      return null;
    }
  }
  
  async function ActualizarActivas(seleccionados) {
    try {
      console.log(seleccionados);
      const prueba = await funcion.Actualizar("sv_vias", {ACTIVE: "0" });
      for(activa of seleccionados){
        let nombreVia = activa.VIA;
        const viasActivas = await funcion.Actualizar("sv_vias",{ACTIVE: "1" },{VIA: nombreVia });    
      }
  
      return seleccionados;
    } catch (err) {
      console.error("Error al obtener los nombres de las vías", err);
      return null;
    }
  }
module.exports = {ObtenerActivas, ActualizarActivas}

