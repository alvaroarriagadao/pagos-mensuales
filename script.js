document.addEventListener('DOMContentLoaded', () => {
  // Si se carga este archivo sin estar logueado, redirige
  if (!localStorage.getItem('logged') && !sessionStorage.getItem('logged')) {
    window.location.href = 'login.html';
  }

  // Referencias a elementos del DOM
  const purchaseForm = document.getElementById('purchase-form');
  const purchasesTableBody = document.querySelector('#purchases-table tbody');
  const summaryContainer = document.getElementById('summary-container');
  const logoutButton = document.getElementById('logout-button');
  const filterCard = document.getElementById('filter-card');

  // Evento para cerrar sesión (elimina de ambos storages)
  logoutButton.addEventListener('click', () => {
    localStorage.removeItem('logged');
    sessionStorage.removeItem('logged');
    window.location.href = 'login.html';
  });

  // Recupera las compras almacenadas en LocalStorage o inicia un array vacío
  let purchases = JSON.parse(localStorage.getItem('purchases')) || [];

  // Función para guardar las compras en LocalStorage
  function savePurchases() {
    localStorage.setItem('purchases', JSON.stringify(purchases));
  }

  // Función para formatear montos en CLP
  function formatCurrency(amount) {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
  }

  // Función para actualizar la tabla de compras (filtrando por tarjeta)
  function updatePurchasesTable() {
    const selectedCard = filterCard.value;
    // Filtrar las compras por la tarjeta seleccionada
    const filteredPurchases = purchases.filter(p => p.tarjeta === selectedCard);
    purchasesTableBody.innerHTML = '';

    filteredPurchases.forEach((purchase) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${purchase.tarjeta}</td>
        <td>${formatCurrency(purchase.montoTotal)}</td>
        <td>${purchase.cuotas}</td>
        <td>${purchase.mesPrimeraCuota}</td>
        <td>${purchase.detalle}</td>
        <td><button class="delete-btn" data-id="${purchase.id}">Eliminar</button></td>
      `;
      purchasesTableBody.appendChild(tr);
    });

    // Agregar evento para los botones de eliminar
    document.querySelectorAll('.delete-btn').forEach(button => {
      button.addEventListener('click', () => {
        const id = parseInt(button.getAttribute('data-id'));
        purchases = purchases.filter(p => p.id !== id);
        savePurchases();
        updatePurchasesTable();
        updateSummary();
      });
    });
  }

  // Función para actualizar el resumen mensual de pagos (filtrando por tarjeta)
  function updateSummary() {
    const selectedCard = filterCard.value;
    // Filtrar las compras para la tarjeta seleccionada
    const filteredPurchases = purchases.filter(p => p.tarjeta === selectedCard);

    // Calcular el total acumulado a pagar para esa tarjeta
    const totalCard = filteredPurchases.reduce((acc, purchase) => acc + purchase.montoTotal, 0);

    // Objeto para acumular los pagos mensuales
    const summary = {};
    filteredPurchases.forEach(purchase => {
      const { montoTotal, cuotas, mesPrimeraCuota } = purchase;
      const pagoMensual = montoTotal / cuotas;
      let [year, month] = mesPrimeraCuota.split('-').map(Number);
      for (let i = 0; i < cuotas; i++) {
        // Calcular la fecha de cada cuota
        let currentDate = new Date(year, month - 1 + i, 1);
        let currentYear = currentDate.getFullYear();
        let currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, '0');
        let key = `${currentYear}-${currentMonth}`;
        if (!summary[key]) {
          summary[key] = 0;
        }
        summary[key] += pagoMensual;
      }
    });

    // Ordenar las claves (meses) de forma cronológica
    const sortedMonths = Object.keys(summary).sort();

    // Generar la tabla del resumen mensual
    let tableHTML = '<table>';
    // Encabezado con los meses
    tableHTML += '<thead><tr>';
    sortedMonths.forEach(month => {
      tableHTML += `<th>${month}</th>`;
    });
    tableHTML += '</tr></thead>';
    // Fila con los totales de pago para cada mes
    tableHTML += '<tbody><tr>';
    sortedMonths.forEach(month => {
      tableHTML += `<td>${formatCurrency(summary[month])}</td>`;
    });
    tableHTML += '</tr></tbody>';
    tableHTML += '</table>';

    // Calcular la próxima fecha de facturación (día 24 de cada mes)
    let today = new Date();
    let billingYear = today.getFullYear();
    let billingMonth = today.getMonth() + 1; // meses en base 1
    if (today.getDate() >= 24) {
      billingMonth += 1;
      if (billingMonth > 12) {
        billingMonth = 1;
        billingYear++;
      }
    }
    const nextBillingKey = `${billingYear}-${billingMonth.toString().padStart(2, '0')}`;
    const nextBillingTotal = summary[nextBillingKey] || 0;

    // Generar el bloque de resumen para la próxima fecha de facturación
    let billingSummaryHTML = `
      <div id="billing-summary">
        <h4>Próxima fecha de facturación: 24 de ${nextBillingKey}</h4>
        <h3>Total a pagar: ${formatCurrency(nextBillingTotal)}</h3>
      </div>
    `;

    // Mostrar total acumulado para la tarjeta seleccionada
    let totalHTML = `<div id="total-card"><h4>Total acumulado para ${selectedCard}: ${formatCurrency(totalCard)}</h4></div>`;

    summaryContainer.innerHTML = totalHTML + billingSummaryHTML + tableHTML;
  }

  // Evento para que al cambiar el filtro se actualicen las tablas
  filterCard.addEventListener('change', () => {
    updatePurchasesTable();
    updateSummary();
  });

  // Función para validar el formulario
  function validateForm(data) {
    if (!data.tarjeta.trim() || !data.detalle.trim()) {
      alert('Por favor, complete todos los campos de texto.');
      return false;
    }
    if (data.montoTotal <= 0) {
      alert('El monto total debe ser mayor a 0.');
      return false;
    }
    if (data.cuotas < 1 || !Number.isInteger(data.cuotas)) {
      alert('El número de cuotas debe ser un entero mayor o igual a 1.');
      return false;
    }
    if (!data.mesPrimeraCuota) {
      alert('Debe seleccionar el mes de la primera cuota.');
      return false;
    }
    return true;
  }

  // Manejo del evento submit del formulario para agregar compra
  purchaseForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const data = {
      id: Date.now(), // identificador único
      tarjeta: document.getElementById('tarjeta').value,
      montoTotal: parseFloat(document.getElementById('montoTotal').value),
      cuotas: parseInt(document.getElementById('cuotas').value),
      mesPrimeraCuota: document.getElementById('mesPrimeraCuota').value,
      detalle: document.getElementById('detalle').value
    };

    if (!validateForm(data)) return;

    purchases.push(data);
    savePurchases();
    updatePurchasesTable();
    updateSummary();
    purchaseForm.reset();
  });

  // Inicializa la interfaz
  updatePurchasesTable();
  updateSummary();
});
