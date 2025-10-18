
// SELECTORES (buscan en el HTML)

const form = document.getElementById('ruta-form');
const origenInput = document.getElementById('origen');
const destinoInput = document.getElementById('destino');
const rutasContainer = document.getElementById('rutas-container');
const listaFavoritas = document.getElementById('lista-favoritas');
const alertasContainer = document.querySelector('#alertas-container ul');
const comparadorTableBody = document.querySelector('#comparador tbody');


// (variables)

let rutas = [];     // rutas cargadas desde rutas.json
let alertas = [];   // alertas cargadas desde alertas.json
let favoritas = []; // rutas guardadas por el usuario


// (para que no busque en cada tecla, lo hace luego de 300ms)

function debounce(funcion, tiempo = 300) {
  let temporizador;
  return function() {
    clearTimeout(temporizador);
    temporizador = setTimeout(funcion, tiempo);
  };
}


// convertidor a minutos

function mostrarTiempo(minutos) {
  if (minutos >= 60) {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas}h ${mins}min`;
  } else {
    return `${minutos} min`;
  }
}


// guarda y carga las favoritas

  function cargarFavoritas() {
  const data = localStorage.getItem('favoritas');
  if (data) {
    favoritas = JSON.parse(data);
  }
}

function guardarFavoritas() {
  localStorage.setItem('favoritas', JSON.stringify(favoritas));
}


// Calcular ruta con alertas
// Esta función calcula el tiempo y el costo final de una ruta,
// tomando en cuenta si hay alertas (como lluvia o tráfico).

function calcularRuta(ruta) {

  // Suma todos los minutos de los tramos de la ruta.
  // Si no tiene tramos, usa un arreglo vacío [].
  const tiempoBase = (ruta.tramos || []).reduce((suma, t) => suma + (t.tiempo_min || 0), 0);

  // Suma todos los costos de los tramos.
  // Si no tiene costo en algún tramo, toma 0.
  const costoBase = (ruta.tramos || []).reduce((suma, t) => suma + (t.costo || 0), 0);

  // Filtra las alertas que afectan esta ruta.
  // Afectan si incluyen 'all', el origen o el destino.
  const alertasAfectan = alertas.filter(a =>
    a.targets.includes('all') ||                // afecta a todas las rutas
    a.targets.includes(ruta.origen) ||          // afecta al origen
    a.targets.includes(ruta.destino)            // afecta al destino
  );

  // Guardamos el tiempo y costo base para modificarlos.
  let tiempoTotal = tiempoBase;
  let costoTotal = costoBase;

  // Recorremos todas las alertas que afectan
  alertasAfectan.forEach(a => {
    // Aumenta el tiempo según el porcentaje de la alerta.
    // Ejemplo: +10% = tiempo * 1.10
    tiempoTotal = tiempoTotal * (1 + (a.tiempo_pct / 100));

    // Suma el costo extra de la alerta al total.
    costoTotal = costoTotal + a.costo_extra;
  });

  // Redondea los resultados (quita decimales)
  tiempoTotal = Math.round(tiempoTotal);
  costoTotal = Math.round(costoTotal);

  // Devuelve un objeto con los resultados finales
  // Ejemplo: { tiempoTotal: 158, costoTotal: 450 }
  return { tiempoTotal, costoTotal };
}


// mostrar las alertas

function mostrarAlertas() {
  alertasContainer.innerHTML = "";
  if (alertas.length === 0) {
    alertasContainer.innerHTML = "<li>No hay alertas disponibles.</li>";
    return;
  }

  alertas.forEach(a => {
    const li = document.createElement('li');
    li.textContent = `${a.titulo}: ${a.mensaje}`;
    alertasContainer.appendChild(li);
  });
}


// mosrtrar las rutas

function mostrarRutas(lista) {
  rutasContainer.innerHTML = "";

  if (lista.length === 0) {
    rutasContainer.innerHTML = "<p>No se encontraron rutas con esos datos 😢</p>";
    return;
  }

  const ul = document.createElement('ul');

  lista.forEach(ruta => {
    const datos = calcularRuta(ruta);
    const texto = `${ruta.origen} → ${ruta.destino} | ⏱ ${mostrarTiempo(datos.tiempoTotal)} | 💰 RD$${datos.costoTotal}`;
    const li = document.createElement('li');
    li.textContent = texto;
    li.style.cursor = "pointer";

    // Agregar a favoritas
    li.addEventListener("click", () => {
      if (!favoritas.includes(texto)) {
        favoritas.push(texto);
        guardarFavoritas();
        mostrarFavoritas();
        alert("Ruta agregada a favoritas ✅");
      } else {
        alert("Esta ruta ya está en favoritas 😅");
      }
    });

    ul.appendChild(li);
  });

  rutasContainer.appendChild(ul);
  mostrarComparador(lista);
}


// rutas favoritas

function mostrarFavoritas() {
  listaFavoritas.innerHTML = "";

  if (favoritas.length === 0) {
    listaFavoritas.innerHTML = "<li>No tienes rutas favoritas aún.</li>";
    return;
  }

  favoritas.forEach(f => {
    const li = document.createElement('li');
    li.textContent = f;
    li.style.cursor = "pointer";
    li.addEventListener("click", () => {
      if (confirm("¿Eliminar de favoritas?")) {
        favoritas = favoritas.filter(x => x !== f);
        guardarFavoritas();
        mostrarFavoritas();
      }
    });
    listaFavoritas.appendChild(li);
  });
}


// comparador

function mostrarComparador(lista) {
  comparadorTableBody.innerHTML = "";
  lista.forEach(r => {
    const datos = calcularRuta(r);
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${r.origen} → ${r.destino}</td>
      <td>${mostrarTiempo(datos.tiempoTotal)}</td>
      <td>RD$${datos.costoTotal}</td>
    `;
    comparadorTableBody.appendChild(fila);
  });
}


// busqueda de als rutass

function buscarRutas() {
  const origen = origenInput.value.trim().toLowerCase();
  const destino = destinoInput.value.trim().toLowerCase();

  if (!origen || !destino) {
    rutasContainer.innerHTML = "<p>Por favor escribe el origen y destino.</p>";
    return;
  }

  const resultados = rutas.filter(r =>
    r.origen.toLowerCase().includes(origen) &&
    r.destino.toLowerCase().includes(destino)
  );

  mostrarRutas(resultados);
}

const buscarConRetraso = debounce(buscarRutas, 300);

// carga de los archivos json

async function cargarDatos() {
  try {
    const [rutasResp, alertasResp] = await Promise.all([
      fetch("rutas.json"),
      fetch("alertas.json")
    ]);

    rutas = await rutasResp.json();
    alertas = await alertasResp.json();

    cargarFavoritas();
    mostrarAlertas();
    mostrarFavoritas();
    mostrarRutas(rutas);
  } catch (error) {
    rutasContainer.innerHTML = "<p style='color:red'>Error al cargar los archivos JSON.</p>";
  }
}


// los eventos

form.addEventListener("submit", (e) => {
  e.preventDefault();
  buscarConRetraso();
});

origenInput.addEventListener("input", buscarConRetraso);
destinoInput.addEventListener("input", buscarConRetraso);


// carga de datos

cargarDatos();

