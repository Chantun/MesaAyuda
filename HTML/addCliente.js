const formE1 = document.querySelector('.form');

formE1.addEventListener('submit', async (event) => {
	event.preventDefault();
	const formData = new FormData(formE1);
	const data = {
		...Object.fromEntries(formData),
	};
	// console.log('Application Server: Revisa el valor del form:');
	// console.log(data);

	if (data.nombre == '' || data.contacto == '' || data.password == '') {
		console.log('debe indicar usuario');
		document.getElementById('resultado1').style.color = 'RED';
		document.getElementById('resultado1').style.textAlign = 'center';
		document.getElementById('resultado1').textContent =
			'Debe informar usuario, nombre y password para completar el acceso';
		return;
	}

	if (data.contacto == 'pec') {
		console.log('pec no es bienvenido en éste sistema');
		const m = '<li>El usuario <pec> no es bienvenido en éste sistema</li>';
		document.getElementById('resultado2').style.color = 'RED';
		document.getElementById('resultado2').style.textAlign = 'center';
		document.getElementById('resultado2').textContent =
			'El usuario <pec> no es bienvenido en éste sistema';
		return;
	}

	if (data.termscondition != 'on') {
		console.log('no aceptó los T&C no se puede loggear');
		document.getElementById('resultado2').style.textAlign = 'center';
		document.getElementById('resultado2').style.color = 'RED';
		document.getElementById('resultado2').textContent =
			'Debe aceptar los T&C para poder usar el sistema';
		return;
	}

	// Exepcion cliente ya existente

	/*---
        Genera objeto HTML a ser actualizado en el tag identificado como "app"
        */

	const HTMLResponse = document.querySelector('#app');
	const ul = document.createElement('ul');

	const tpl = document.createDocumentFragment();

	const systemURL = {
		listarTicket: 'http://127.0.0.1:5500/HTML/listarTicket.html',
		loginCliente: 'http://127.0.0.1:5500/HTML/loginClient.html',
		addCliente: 'http://127.0.0.1:5500/HTML/addCliente.html',
	};

	const RESTAPI = {
		loginCliente: 'http://localhost:8080/api/loginClienteEmail',
		listarTicket: 'http://localhost:8080/api/listarTicket',
		addCliente: 'http://localhost:8080/api/addCliente',
	};

	/*-----
    Define el URI para realizar el acceso en base al acceso a un servidor local
*/
	const MODE =
		'LOCAL'; /*-- Instrucción a cambiar opciones LOCAL, TYPICODE o AWS --*/

	if (MODE == 'LOCAL') {
		/*-----
        Crea estructuras para acceder a data del cliente
        */
		const registrar = {
			contacto: data.contacto,
			nombre: data.nombre,
			password: data.password,
		};

		const options = {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(registrar),
		};

		console.log('API REST:' + RESTAPI.addCliente);
		// console.log(login);
		// console.log('login(' + JSON.stringify(login) + ')');
		// console.log('options ' + JSON.stringify(options));
		var API = RESTAPI.addCliente;
		var APIoptions = options;
	}

	/*----------------------------------------------------------------------*/
	/*---- Typicode utilizar id 803a62c8-78c8-4b63-9106-73af216d504b -------*/
	/*                                                                      */
	/* El siguiente código es utilizado para resolver la validación de      */
	/* cliente utilizando un "fake" API REST server en Typicode             */
	/* para realizar la validación con el REST API server correcto          */
	/* deberá cambiar la instrucción para que                               */
	/*              const tipycode=false;                                   */
	/*----------------------------------------------------------------------*/

	if (MODE == 'TYPICODE') {
		console.log('Acceso usando Typicode como application server');
		API =
			'https://my-json-server.typicode.com/lu7did/MesaAyuda/posts/' +
			data.contacto;
		APIoptions = { method: 'GET' };
	}

	/*----------------------------------------------------------------------*/
	/*---- AWS Accede con URL de Lambda loginUserGET                 -------*/
	/*                                                                      */
	/* cliente: 803a62c8-78c8-4b63-9106-73af216d504b                        */
	/*                                                                      */
	/* Para activar el acceso mediante AWS hacer const aws=true;            */
	/*----------------------------------------------------------------------*/
	if (MODE == 'AWS') {
		console.log('Acceso usando AWS lambda como application server');
		API =
			'https://fmtj0jrpp9.execute-api.us-east-1.amazonaws.com/default/loginUserGET?ID=' +
			data.id +
			'&PASSWORD=' +
			data.password;
		APIoptions = { method: 'GET' };
	}

	fetch(`${API}`, APIoptions)
		.then((res) => {
			return res.json();
		})
		.then((users) => {
			console.log(
				'Datos en respuesta del application server=' + JSON.stringify(users)
			);
			console.log('users.response=' + users.password);
			if (users.response == 'OK') {
				//<==Habilitar esto para dejar que el API REST verifique sin exponer la password
				console.log('La registración ha sido exitosa');
				document.getElementById('resultado1').style.color = 'GREEN';
				document.getElementById('resultado1').textContent =
					'La registración ha sido exitosa';

				// window.location.href = systemURL.loginCliente; //redireccionamiento del boton Registrar al loginCliente sin segundos
				setTimeout(() => {
					window.location.href = systemURL.loginCliente;
				}, 2000); //redireccionamiento del boton Registrar al loginCliente con segundos
			} else if (users.message == 'Cliente ya existe') {
				console.log('La registración no se pudo completar');
				document.getElementById('resultado1').style.color = 'RED';
				document.getElementById('resultado1').textContent =
					'El correo ya esta en uso';
			} else {
				console.log(users);
				console.log('La registración no se pudo completar');
				document.getElementById('resultado1').style.color = 'RED';
				document.getElementById('resultado1').textContent =
					'La registración no se pudo completar';
			}
		});
});
