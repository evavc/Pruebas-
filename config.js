'use strict';
const dotenv = require('dotenv');
dotenv.config();


//Config Server configuration
const {PORT, HOST, HOST_URL} = process.env;

//config MSSQL de vias
const {sql_user,sql_password,sql_db,sql_server, PA01A, PA01B, PA02A, PA02B,PA03A, PA03B} = process.env;
const sqlencrypt = process.env.ENCRYPT === "true";

//config MSSQL propia
const {sv_user,sv_password,sv_db,sv_server} = process.env;
const svencrypt = process.env.ENCRYPT === "true";


//Config ActiveMQ
const {HOST_AMQ,HOST_AMQ2, PORT_AMQ, TIMEOUT_AMQ, DESTINATION} = process.env;

//Config Knex
const {CLIENT} = process.env;

module.exports = {
    
    port: PORT,
    host : HOST,
    url: HOST_URL,
    sql:{
        user: sql_user,
        password: sql_password,
        database: sql_db,
        server: sql_server,
        options: {
            encrypt: sqlencrypt,
            enableArithAbort: true
        }
    },  
    amq:{
        destination: DESTINATION,
        host: [HOST_AMQ, HOST_AMQ2],
        port: PORT_AMQ,
        //timeout: TIMEOUT_AMQ
    },
    knex:{
        client: CLIENT,
        connection: {
            host: sv_server,
            user: sv_user,
            password: sv_password,
            database: sv_db,
        },
        // debug:{
        //     packet: true,
        //     payload: true,
        // },
        options: {
            encrypt: false,
        },
        pool:{
            min: 0,
            max: 100000000,
        }
    }
}
