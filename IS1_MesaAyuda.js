/*-----------------------------------------------------------------------------------------------------------------
//*  MesaAyuda.js debe copiarse al directorio del proyecto express como index.js
//*
//*  REST API 
//*  UADER - FCyT - Ingenieria de Software I 
//*  Caso de estudio MesaAyuda
//*
//*  Dr. Pedro E. Colla 2023,2025
 *----------------------------------------------------------------------------------------------------------------*/
//AWS_SDK_JS_SUPPRESS_MAINTENANCE_MODE_MESSAGE=1

import express from 'express'; // Libreria para crear la api de forma censilla
import crypto from 'crypto'; // Generar ID unicos
import cors from 'cors'; // Permitir comunicacion entre backend y frontend
import AWS from 'aws-sdk'; // Conectarse a la base de datos

import accessKeyId from '../accessKeyId.js'; // Importa las Keys
import secretAccessKey from '../secretAccessKey.js';

console.log('Comenzando servidor');

console.log('crypto Ok!');

const app = express(); // Crea una instancia de express
const PORT = 8080;

console.log('express ready!');
console.log('cors ok!');
app.use(cors()); // Para que express use cors
console.log('CORS ready!');
console.log('aws-sdk ready!');

/*----
   Genera la configuracion de conexion con AWS
*/

let awsConfig = {
	region: 'us-east-1',
	endpoint: 'http://dynamodb.us-east-1.amazonaws.com',
	accessKeyId: accessKeyId,
	secretAccessKey: secretAccessKey,
};

AWS.config.update(awsConfig);
console.log('Servidor listo!');
let docClient = new AWS.DynamoDB.DocumentClient();

/*----
   Application server in LISTEN mode
*/

app.listen(
	PORT,
	() => console.log(`Servidor listo en http://localhost:${PORT}`) // Hace esto cuando esta listo
);

app.use(express.json()); // Recibir las respuestas en json

/*-------------------------------------------------------------------------------------------
                            Funciones y Servicios
 *-------------------------------------------------------------------------------------------*/

/*-----------
función para hacer el parse de un archivo JSON (convierte json a objeto)
*/
function jsonParser(keyValue, stringValue) {
	var string = JSON.stringify(stringValue);
	var objectValue = JSON.parse(string);
	return objectValue[keyValue];
}

function updateDate(id, date) {
	// Actualiza la fecha de cambio de contrasena o ingreso de secion
	let hoy = new Date();
	const dd = String(hoy.getDate()).padStart(2, '0');
	const mm = String(hoy.getMonth() + 1).padStart(2, '0'); //January is 0!
	const yyyy = hoy.getFullYear();
	hoy = dd + '/' + mm + '/' + yyyy;

	const paramsUpdate = {
		// Parametros para modificar valores en la db
		ExpressionAttributeNames: {
			// Establece el nombre (key) de los atributos a cambiar
			'#f': date,
		},
		ExpressionAttributeValues: {
			// Al atributo #f le asigna :f (la fecha de hoy)
			':f': hoy,
		},
		Key: {
			// Busca al usuario por id
			id: id,
		},
		ReturnValues: 'ALL_NEW',
		TableName: 'cliente', // La tabla donde busca
		UpdateExpression: 'SET #f = :f', // Realiza la asignacion
	};
	docClient.update(paramsUpdate, function (err, data) {
		// Se conecta a la db y ejecuta la funcion segun paramsUpdate
		if (err) {
			console.error('DB access error ' + err);
			return;
		} else {
			console.log({
				response: 'OK',
				message: 'updated',
				data: data,
			});
		}
	});
}

/*---------
Función para realizar el SCAN de un DB de cliente usando contacto como clave para la búsqueda (no es clave formal del DB)
*/

// async: cuando se llama a la funcion con await se espera a que retorne algo antes de continuar
async function scanDb(contacto) {
	var docClient = new AWS.DynamoDB.DocumentClient(); // Instancia de AWS
	const scanKey = contacto; // Crea una constante con el contacto
	const paramsScan = {
		// Parametros de busqueda
		// ScanInput
		TableName: 'cliente', // Selecciona la tabla donde se va a buscar
		// Selecciona todos los atributos
		Select:
			'ALL_ATTRIBUTES' ||
			'ALL_PROJECTED_ATTRIBUTES' ||
			'SPECIFIC_ATTRIBUTES' ||
			'COUNT',
		FilterExpression: 'contacto = :contacto', // Filtra por contacto
		ExpressionAttributeValues: { ':contacto': scanKey }, // Retorna los usuarios con ese contacto
	};
	var objectPromise = await docClient
		.scan(paramsScan) // Pide un scan con los parametros ya definidos
		.promise()
		.then((data) => {
			// then: espera a que termine y ejecuta una funcion con el resultado
			return data.Items;
		});
	return objectPromise; // retorna todos los usuarios con el mismo contacto
}

/*-------------------------------------------------------------------------------------------
                            SERVER API 
 *-------------------------------------------------------------------------------------------*/
/*==*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*
 *                       API REST Cliente                                                   *
 *=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*==*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*/

// Endpoint para comprobar el funcionamiento de la api
app.get('/api/cliente', (req, res) => {
	res.status(200).send({ response: 'OK', message: 'API Ready' });
	console.log('API cliente: OK');
});

/*---
  /api/loginCliente
  Esta API permite acceder a un cliente por ID y comparar la password pasada en un JSON en el cuerpo con la indicada en el DB
*/
app.post('/api/loginCliente', (req, res) => {
	const { id } = req.body; // req.body => Obtiene los datos del request
	const { password } = req.body;

	console.log('loginCliente: id(' + id + ') password (' + password + ')');

	if (!password) {
		res
			.status(400)
			.send({ response: 'ERROR', message: 'Password no informada' });
		return;
	}

	if (!id) {
		res.status(400).send({ response: 'ERROR', message: 'id no informado' });
		return;
	}

	let getClienteByKey = function () {
		var params = {
			// Parametros para buscar en la base de datos
			TableName: 'cliente',
			Key: {
				id: id,
			},
		};
		docClient.get(params, function (err, data) {
			// .get => obtener datos
			if (err) {
				res.status(400).send(
					JSON.stringify({
						response: 'ERROR',
						message: 'DB access error ' + err,
					})
				);
			} else {
				if (Object.keys(data).length == 0) {
					// Verifica si no existe el ususario
					res
						.status(400)
						.send({ response: 'ERROR', message: 'Cliente invalido' });
				} else {
					const paswd = jsonParser('password', data.Item);
					const activo = jsonParser('activo', data.Item);
					const id = jsonParser('id', data.Item);
					const contacto = jsonParser('contacto', data.Item);
					if (password == paswd) {
						// Verifica que coincidan las conrtaseñas
						if (activo == true) {
							const nombre = jsonParser('nombre', data.Item);
							const fecha_ultimo_ingreso = jsonParser(
								'fecha_ultimo_ingreso',
								data.Item
							);
							res.status(200).send(
								JSON.stringify({
									response: 'OK',
									id: id,
									nombre: nombre,
									contacto: contacto,
									fecha_ultimo_ingreso: fecha_ultimo_ingreso,
								})
							);
						} else {
							// Si no esta activo
							res.status(400).send(
								JSON.stringify({
									response: 'ERROR',
									message: 'Cliente no activo',
								})
							);
						}
					} else {
						// Si las contraseñas no coinciden
						res.status(400).send(
							JSON.stringify({
								response: 'ERROR',
								message: 'usuario incorrecto',
							})
						);
					}
				}
			}
		});
	};
	getClienteByKey(); // Llama a la funcion
});

app.post('/api/loginClienteEmail', async (req, res) => {
	const { contacto } = req.body;
	const { password } = req.body;

	console.log(
		'loginCliente: contacto(' + contacto + ') password (' + password + ')'
	);

	if (!password) {
		res
			.status(400)
			.send({ response: 'ERROR', message: 'Password no informada' });
		return;
	}

	if (!contacto) {
		res
			.status(400)
			.send({ response: 'ERROR', message: 'contacto no informado' });
		return;
	}

	const items = await scanDb(contacto); // Retorna un array con los usuarios obtenidos

	if (items.length != 1) {
		// Verifica que existan usuarios con ese correo
		res.status(400).send(
			JSON.stringify({
				response: 'ERROR',
				message: 'Cliente invalido',
			})
		);
	}

	const paswd = items[0].password;

	if (password != paswd) {
		// Hace todos las comprobaciones igual que /api/loginCliente
		res.status(400).send(
			JSON.stringify({
				response: 'invalido',
				message: 'Contraseña incorrecta',
			})
		);
	} else if (items[0].activo != true) {
		res.status(400).send(
			JSON.stringify({
				response: 'ERROR',
				message: 'Cliente no activo',
			})
		);
	} else {
		updateDate(items[0].id, 'fecha_ultimo_ingreso'); // Actualiza la fecha de ingreso
		const response = {
			// Genera el objeto que sera retornado
			response: 'OK',
			id: items[0].id,
			nombre: items[0].nombre,
			contacto: items[0].contacto,
			fecha_ultimo_ingreso: items[0].fecha_ultimo_ingreso,
		};
		res.status(200).send(response);
	}
});

/*-----------
  /api/getCliente
  Esta API permite acceder a un cliente dado su id
*/

app.post('/api/getCliente/:id', (req, res) => {
	const { id } = req.params; // Saca el id del :id de la url
	console.log('getCliente: id(' + id + ')');

	var params = {
		// Parametros de AWS
		TableName: 'cliente',
		Key: {
			id: id,
		},
	};
	docClient.get(params, function (err, data) {
		// docClient.get: Busca y retorna objetos
		if (err) {
			// Si hay un error con la db
			res.status(400).send(
				JSON.stringify({
					response: 'ERROR',
					message: 'DB access error ' + null,
				})
			);
		} else {
			// Existe el usuario
			if (Object.keys(data).length != 0) {
				res
					.status(200)
					.send(
						JSON.stringify({ response: 'OK', cliente: data.Item }),
						null,
						2
					);
			} else {
				// Si no existe el usuario
				res
					.status(400)
					.send(
						JSON.stringify({ response: 'ERROR', message: 'Cliente no existe' }),
						null,
						2
					);
			}
		}
	});
});

/*----
addCliente
Revisa si el contacto (e-mail) existe y en caso que no da de alta el cliente generando un id al azar
*/
app.post('/api/addCliente', (req, res) => {
	const { contacto } = req.body;
	const { password } = req.body;
	const { nombre } = req.body;

	console.log(
		'addCliente: contacto(' +
			contacto +
			') nombre(' +
			nombre +
			') password(' +
			password +
			')'
	);

	if (!password) {
		res
			.status(400)
			.send({ response: 'ERROR', message: 'Password no informada' });
		return;
	}

	if (!nombre) {
		res.status(400).send({ response: 'ERROR', message: 'Nombre no informado' });
		return;
	}

	if (!contacto) {
		res
			.status(400)
			.send({ response: 'ERROR', message: 'Contacto no informado' });
		return;
	}

	scanDb(contacto) // Escanea en busca de usuarios con el contacto, no usa await porque no se guarda en una variable, sino que usa .then
		.then((resultDb) => {
			if (Object.keys(resultDb).length != 0) {
				res
					.status(400)
					.send({ response: 'ERROR', message: 'Cliente ya existe' });
				return;
			} else {
				// Si existe el usuario
				var hoy = new Date();
				var dd = String(hoy.getDate()).padStart(2, '0');
				var mm = String(hoy.getMonth() + 1).padStart(2, '0'); //January is 0!
				var yyyy = hoy.getFullYear();
				hoy = dd + '/' + mm + '/' + yyyy; // Genera un string con la fecha actual

				const newCliente = {
					// Crea un objeto con los datos del nuevo cliente
					id: crypto.randomUUID(), // Genera un id aleatorio
					contacto: contacto,
					nombre: nombre,
					password: password,
					activo: true,
					registrado: true,
					primer_ingreso: false,
					fecha_alta: hoy,
					fecha_cambio_password: hoy,
					fecha_ultimo_ingreso: hoy,
				};

				const paramsPut = {
					// Parametros para agrregar el usuario a la db
					TableName: 'cliente',
					Item: newCliente, // Item: el elemento que se quiere cargar
					ConditionExpression: 'attribute_not_exists(id)', // Si el id ya existe, no se cargara
				};

				docClient.put(paramsPut, function (err, data) {
					// .put => enviar cosas al db
					// Intenta enviar el objeto a la db
					if (err) {
						// Error con la db
						res
							.status(400)
							.send(
								JSON.stringify({ response: 'ERROR', message: 'DB error' + err })
							);
					} else {
						// Si no se produce un error
						res
							.status(200)
							.send(JSON.stringify({ response: 'OK', cliente: newCliente }));
					}
				});
			}
		});
});
/*----------
/api/updateCliente
Permite actualizar datos del cliente contacto, nombre, estado de activo y registrado
*/

app.post('/api/updateCliente', (req, res) => {
	const { id } = req.body;
	const { nombre } = req.body;
	const { password } = req.body;

	var activo = (req.body.activo + '').toLowerCase() === 'true'; // tolowerCase pasa a minusculas
	var registrado = (req.body.registrado + '').toLowerCase() === 'true';

	console.log(
		'updateCliente: id(' +
			id +
			') nombre(' +
			nombre +
			') password(' +
			password +
			') activo(' +
			activo +
			') registrado(' +
			registrado +
			')'
	);

	if (!id) {
		res.status(400).send({ response: 'ERROR', message: 'Id no informada' });
		return;
	}

	if (!nombre) {
		res.status(400).send({ response: 'ERROR', message: 'Nombre no informado' });
		return;
	}

	if (!password) {
		res
			.status(400)
			.send({ response: 'ERROR', message: 'Password no informado' });
		return;
	}

	var params = {
		// Parametros de AWS
		TableName: 'cliente',
		Key: {
			id: id,
		},
	};

	docClient.get(params, function (err, data) {
		// Obtiene el cliente
		if (err) {
			// Error de la db
			res.status(400).send(
				JSON.stringify({
					response: 'ERROR',
					message: 'DB access error ' + null,
				})
			);
			return;
		} else {
			if (Object.keys(data).length == 0) {
				// Si no existe el cliente
				res
					.status(400)
					.send(
						JSON.stringify({ response: 'ERROR', message: 'Cliente no existe' }),
						null,
						2
					);
				return;
			} else {
				// Si existe el cliente
				const paramsUpdate = {
					// Parametros para la actualizacion
					ExpressionAttributeNames: {
						// Keys que se modificaran
						'#a': 'activo',
						'#n': 'nombre',
						'#p': 'password',
						'#r': 'registrado',
					},
					ExpressionAttributeValues: {
						// El valor que se le asignara a las keys
						':a': activo,
						':p': password,
						':n': nombre,
						':r': registrado,
					},
					Key: {
						// Busca por id
						id: id,
					},
					ReturnValues: 'ALL_NEW',
					TableName: 'cliente', // Busca en la tabla cliente
					UpdateExpression: 'SET #n = :n, #p = :p, #a = :a, #r = :r', // Operaciones que realizara la db
				};
				docClient.update(paramsUpdate, function (err, data) {
					// Actualiza la base de datos segun los parametros
					if (err) {
						// Error de la db
						res.status(400).send(
							JSON.stringify({
								response: 'ERROR',
								message: 'DB access error ' + err,
							})
						);
						return;
					} else {
						res.status(200).send(
							JSON.stringify({
								response: 'OK',
								message: 'updated',
								data: data,
							})
						);
					}
				});
			}
		}
	});
});

/*-------
/api/resetCliente
Permite cambiar la password de un cliente
*/
app.post('/api/resetCliente', async (req, res) => {
	const { contacto } = req.body;
	const { password } = req.body;

	if (!contacto) {
		res.status(400).send({ response: 'ERROR', message: 'Correo no informado' });
		return;
	}

	if (!password) {
		res
			.status(400)
			.send({ response: 'ERROR', message: 'Password no informada' });
		return;
	}

	const user = await scanDb(contacto);
	if (user.length != 1) {
		res.status(404).send({
			response: 'ERROR',
			message: 'Usuario invalido',
		});
	}
	const id = user[0].id;

	var params = {
		// Parametros de AWS
		TableName: 'cliente',
		Key: {
			id: id,
		},
	};

	docClient.get(params, function (err, data) {
		// Obtiene el usuario mediante id
		if (err) {
			// Error db
			res.status(400).send(
				JSON.stringify({
					response: 'ERROR',
					message: 'DB access error ' + null,
				})
			);
			return;
		} else {
			if (Object.keys(data).length == 0) {
				res
					.status(400)
					.send(
						JSON.stringify({ response: 'ERROR', message: 'Cliente no existe' }),
						null,
						2
					);
				return;
			} else {
				const paramsUpdate = {
					// Parametros a modificar
					ExpressionAttributeNames: {
						// Keys a cambiar
						'#p': 'password',
					},
					ExpressionAttributeValues: {
						// Valor que darle a las keys anteriores
						':p': password,
					},
					Key: {
						id: id,
					},
					ReturnValues: 'ALL_NEW',
					TableName: 'cliente',
					UpdateExpression: 'SET #p = :p', // a #p se le asigna :p
				};
				docClient.update(paramsUpdate, function (err, data) {
					// Actualiza la db
					if (err) {
						// Eror db
						res.status(400).send(
							JSON.stringify({
								response: 'ERROR',
								message: 'DB access error ' + err,
							})
						);
						return;
					} else {
						// Si no hay error
						updateDate(id, 'fecha_cambio_password');
						res.status(200).send(
							JSON.stringify({
								response: 'OK',
								message: 'updated',
								data: data,
							})
						);
					}
				});
			}
		}
	});
});
/*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*
/*                                                       API REST ticket                                                             *
/*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*/

/*---------
Función para realizar el SCAN de un DB de cliente usando contacto como clave para la búsqueda (no es clave formal del DB)
*/
async function scanDbTicket(clienteID) {
	// Funcion que retorna los tickets de un usuario segun su id
	var docClient = new AWS.DynamoDB.DocumentClient(); //Crea una instancia del cliente de DynamoDB para poder consultar la base
	const scanKey = clienteID; //guarda el parámetro recibido en una variable local, que se usará como valor del filtro.
	const paramsScan = {
		// Parametros del scan
		TableName: 'ticket', // Usa la table ticket
		Select:
			'ALL_ATTRIBUTES' ||
			'ALL_PROJECTED_ATTRIBUTES' ||
			'SPECIFIC_ATTRIBUTES' ||
			'COUNT',
		FilterExpression: 'clienteID = :clienteID',
		ExpressionAttributeValues: { ':clienteID': scanKey },
	};
	var objectPromise = await docClient // Espera la respuesta del db
		.scan(paramsScan) //inicia la busqueda
		.promise() //convierte la llamada en una promesa
		.then((data) => {
			return data.Items; //extrae el array Items que contiene los tickets encontrados
		});
	return objectPromise; //Devuelve el array con los tickets encontrados para ese clienteID
}
/*----------
  listarTicket
  API REST para obtener todos los tickets de un clienteID
*/
app.post('/api/listarTicket', (req, res) => {
	const { ID } = req.body;
	console.log('listarTicket: ID(' + ID + ')');

	if (!ID) {
		res
			.status(400)
			.send({ response: 'ERROR', message: 'ID cliente  no informada' });
		return; //detiene la ejecución del endpoint
	}

	scanDbTicket(ID).then((resultDb) => {
		// Llama a la funcion para obtener los tickets
		if (Object.keys(resultDb).length == 0) {
			// Si el usuario no tiene tickets
			res
				.status(400)
				.send({ response: 'ERROR', message: 'clienteID no tiene tickets' });
			return;
		} else {
			// si el usuario tiene tickets
			res.status(200).send(JSON.stringify({ response: 'OK', data: resultDb }));
		}
	});
});

/*---------
  getTicket
  API REST para obtener los detalles de un ticket
*/
app.post('/api/getTicket', (req, res) => {
	const { id } = req.body; // id del ticket
	console.log('getTicket: id(' + id + ')');

	if (!id) {
		res
			.status(400)
			.send({ response: 'ERROR', message: 'ticket id no informada' });
		return;
	}

	var params = {
		// Parametos de AWS
		TableName: 'ticket', // busca en la tabla 'ticket'
		Key: {
			id: id,
		},
	};
	docClient.get(params, function (err, data) {
		// Obtiene el ticket de la db
		if (err) {
			// Error db
			res.status(400).send(
				JSON.stringify({
					response: 'ERROR',
					message: 'DB access error ' + err,
				})
			);
		} else {
			if (Object.keys(data).length == 0) { //Ticket no existe
				res.status(400).send({ response: 'ERROR', message: 'ticket invalido' });
			} else {
				res.status(200).send(JSON.stringify({ response: 'OK', data: data }));
			}
		}
	});
});

/*-----------------
/api/addTicket
API REST para agregar ticket (genera id)
*/
app.post('/api/addTicket', (req, res) => {
	const { clienteID } = req.body;
	const estado_solucion = 1;
	const { solucion } = req.body;
	const { descripcion } = req.body;

	var hoy = new Date();
	var dd = String(hoy.getDate()).padStart(2, '0');
	var mm = String(hoy.getMonth() + 1).padStart(2, '0');
	var yyyy = hoy.getFullYear();
	hoy = dd + '/' + mm + '/' + yyyy; // String con la fecha de hoy

	const newTicket = {
		// Objeto con los datos del nuevo ticket
		id: crypto.randomUUID(), // ID aleatoria
		clienteID: clienteID,
		estado_solucion: estado_solucion,
		solucion: solucion,
		descripcion: descripcion,
		fecha_apertura: hoy,
		ultimo_contacto: hoy,
	};

	const paramsPut = {
		// Parametros de AWS
		TableName: 'ticket',
		Item: newTicket,
		ConditionExpression: 'attribute_not_exists(id)', // asegura que no exista ya un ticket con ese mismo ID aunque es dificil porque esta en random
	};

	docClient.put(paramsPut, function (err, data) {
		// .put => enviar cosas al db
		// Envia el ticket al db
		if (err) {
			// Error de AWS
			res
				.status(400)
				.send(JSON.stringify({ response: 'ERROR', message: 'DB error' + err }));
		} else {
			res
				.status(200)
				.send(JSON.stringify({ response: 'OK', ticket: newTicket }));
		}
	});
});

/*--------
/api/updateTicket
Dado un id actualiza el ticket, debe informarse la totalidad del ticket excepto ultimo_contacto
*/
app.post('/api/updateTicket', (req, res) => {
	const { id } = req.body;
	const { clienteID } = req.body;
	const { estado_solucion } = req.body;
	const { solucion } = req.body;
	const { descripcion } = req.body;
	const { fecha_apertura } = req.body;

	if (!id) {
		res.status(400).send({ response: 'ERROR', message: 'Id no informada' });
		return;
	}

	if (!clienteID) {
		res
			.status(400)
			.send({ response: 'ERROR', message: 'clienteID no informada' });
		return;
	}

	if (!estado_solucion) {
		res
			.status(400)
			.send({ response: 'ERROR', message: 'estado_solucion no informada' });
		return;
	}

	if (!solucion) {
		res
			.status(400)
			.send({ response: 'ERROR', message: 'solucion no informado' });
		return;
	}

	if (!fecha_apertura) {
		res.status(400).send({ response: 'ERROR', message: 'fecha apertura' });
		return;
	}

	var hoy = new Date();
	var dd = String(hoy.getDate()).padStart(2, '0');
	var mm = String(hoy.getMonth() + 1).padStart(2, '0');
	var yyyy = hoy.getFullYear();
	hoy = dd + '/' + mm + '/' + yyyy; // String con la fecha actual

	const ultimo_contacto = hoy;

	var params = {
		// Parametros de AWS
		TableName: 'ticket',
		Key: {
			id: id,
		},
	};

	docClient.get(params, function (err, data) {
		// .get => obtener datos
		// Llamada a la db para obtener el ticket
		if (err) {
			// Error de la db
			res.status(400).send(
				JSON.stringify({
					response: 'ERROR',
					message: 'DB access error ' + null,
				})
			);
			return;
		} else {
			if (Object.keys(data).length == 0) {
				// Si no hay tickets
				res
					.status(400)
					.send(
						JSON.stringify({ response: 'ERROR', message: 'ticket no existe' }),
						null,
						2
					);
				return;
			} else {
				// si hay tickets
				const paramsUpdate = {
					// Parametros para la modificacion
					ExpressionAttributeNames: {
						// keys que se van a modificar
						'#c': 'clienteID',
						'#e': 'estado_solucion',
						'#s': 'solucion',
						'#a': 'fecha_apertura',
						'#u': 'ultimo_contacto',
						'#d': 'descripcion',
					},
					ExpressionAttributeValues: {
						// El valor que se le asignara a las keys
						':c': clienteID,
						':e': estado_solucion,
						':s': solucion,
						':a': fecha_apertura,
						':u': ultimo_contacto,
						':d': descripcion,
					},
					Key: {
						// Busca por id
						id: id,
					},
					ReturnValues: 'ALL_NEW',
					TableName: 'ticket', // Busca en la tabla ticket
					UpdateExpression:
						'SET #c = :c, #e = :e, #a = :a, #s = :s, #d = :d, #u = :u', // Las operaciones que realizara la db
				};
				docClient.update(paramsUpdate, function (err, data) {
					// .update => cambiar datos
					// Actualiza la db con los parametros ya establecidos
					if (err) {
						res.status(400).send(
							JSON.stringify({
								response: 'ERROR',
								message: 'DB access error ' + err,
							})
						);
						return;
					} else {
						res
							.status(200)
							.send(JSON.stringify({ response: 'OK', data: data }));
					}
				});
			}
		}
	});
});
/*-------------------------------------------------[ Fin del API REST ]-------------------------------------------------------------*/
