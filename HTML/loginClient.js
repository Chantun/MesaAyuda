const formE1 = document.querySelector('.form'); // document => accede al dom
// .querySelector() agarrar el primer elemento .form

/*---
    Intercepta el submit del formulario
    */

formE1.addEventListener('submit', async (event) => {
	// addEventListener => Agrega eventos a los elementos
	event.preventDefault(); // Que no haga nada si se envia vacio
	const formData = new FormData(formE1);
	const data = Object.fromEntries(formData); // Saca los datos del form
	// console.log('Application Server: Revisa el valor del form:');
	// console.log(data);

	/*---
        Realiza validaciones en los datos del formulario antes de procesar
        */

	if (data.contacto == '' || data.password == '') {
		console.log('debe indicar usuario');
		document.getElementById('resultado1').style.color = 'RED'; // .getElementById() => retorna el elemento con ese id
		document.getElementById('resultado1').style.textAlign = 'center';
		document.getElementById('resultado1').textContent = // asigna texto al elemento
			'Debe informar usuario y password para  completar el acceso';
		return;
	}

	if (data.contacto == 'pec') {
		/*--Fix hecho por  Germán Lombardi IS1-2025 */
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

	/*---
        Genera objeto HTML a ser actualizado en el tag identificado como "app"
        */

	// const HTMLResponse = document.querySelector('#app');
	// const ul = document.createElement('ul'); // .createElement => crea un elmento del tipo especificado

	// const tpl = document.createDocumentFragment(); // Crea un fragmento de Documento en memoria

	const systemURL = {
		// Las distintas urls de la pagina
		listarTicket: 'http://127.0.0.1:5500/HTML/listarTicket.html',
		loginCliente: 'http://127.0.0.1:5500/HTML/loginClient.html',
		addCliente: 'http://127.0.0.1:5500/HTML/addCliente.html',
	};

	const RESTAPI = {
		// Los distintos endpoints a usar
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
		const login = {
			// Lo recibe del formulario
			contacto: data.contacto,
			password: data.password,
		};

		const options = {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(login), // El json que le pasamos a postman
		};

		console.log('API REST:' + RESTAPI.loginCliente);
		// console.log(login);
		// console.log('login(' + JSON.stringify(login) + ')');
		// console.log('options ' + JSON.stringify(options));
		var API = RESTAPI.loginCliente; // Strting con la url de la api que va a usar
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
	/*-----
    Realiza el acceso al API Rest utilizando gestión de sincronización mediante promesas
	utiliza URL y options definidos en los pasos anteriores
    */

	fetch(`${API}`, APIoptions) // Se conecta con la API, dependiendo del modo la url del API cambia
		.then((res) => {
			return res.json();
		})
		.then((users) => {
			// users es la respuesta de la api (json -> objeto)
			console.log(
				'Datos en respuesta del application server=' + JSON.stringify(users) // JSON.stringify() pasa un json a string
			);
			if (users.response == 'OK') {
				// verifica que la response sea OK
				console.log('La password es correcta');
				console.log(
					'nombre(' +
						users.nombre +
						') fecha_ultimo_ingreso(' +
						users.fecha_ultimo_ingreso +
						')' +
						'mode(' +
						MODE +
						')'
				);
				console.log(
					'id=' +
						users.id +
						' nombre=' +
						users.nombre +
						' ultimo=' +
						users.fecha_ultimo_ingreso
				);
				console.log(
					'changing to ' +
						systemURL.listarTicket +
						'?id=' +
						users.id +
						'&contacto=' +
						users.contacto +
						'&nombre=' +
						users.nombre +
						'&fecha_ultimo_ingreso=' +
						users.fecha_ultimo_ingreso +
						'&mode=' +
						MODE
				);
				window.location.href = // Te redirecciona a la pagina de listar tickets
					systemURL.listarTicket +
					'?id=' +
					users.id +
					'&contacto=' +
					users.contacto +
					'&nombre=' +
					users.nombre +
					'&fecha_ultimo_ingreso=' +
					users.fecha_ultimo_ingreso +
					'&mode=' +
					MODE;
			} else if (users.message == 'Cliente invalido') {
				// Si users.response != OK
				const register = document.getElementById('register'); // Desbloquea el boton de registrar
				register.classList.remove('dissable'); // Le quita la classe dissable al boton
				register.setAttribute(
					// Agrega un atributo a un elemento
					// Le agrega la url al boton
					'href',
					systemURL.addCliente
				);
				document.getElementById('resultado1').style.color =
					'RED'; /*--Fix hecho por  Germán Lombardi IS1-2025 */
				document.getElementById('resultado1').textContent =
					'Error de login, intente nuevamente'; /*--Fix hecho por  Germán Lombardi IS1-2025 */
				console.log('Cliente invalido');
			} else {
				console.log('La password no es correcta');
				document.getElementById('resultado1').style.color =
					'RED'; /*--Fix hecho por  Germán Lombardi IS1-2025 */
				document.getElementById('resultado1').textContent =
					'Error de login, intente nuevamente'; /*--Fix hecho por  Germán Lombardi IS1-2025 */
			}
		});
});
