document.addEventListener('DOMContentLoaded', () => {
  // Referencias a elementos del DOM
  const purchaseForm = document.getElementById('purchase-form');
  const purchasesTableBody = document.querySelector('#purchases-table tbody');
  const summaryContainer = document.getElementById('summary-container');
  const logoutButton = document.getElementById('logout-button');
  const filterCard = document.getElementById('filter-card');

  // Cerrar sesión usando Firebase Auth
  logoutButton.addEventListener('click', () => {
    firebase.auth().signOut().then(() => {
      window.location.href = 'login.html';
    });
  });

  // Variable para almacenar las compras obtenidas de Firestore
  let purchases = [];

  // Función para formatear montos en CLP
  function formatCurrency(amount) {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
  }

  // Actualiza la tabla de compras filtrando por la tarjeta seleccionada
  function updatePurchasesTable() {
    const selectedCard = filterCard.value;
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

    // Agregar eventos a los botones de eliminar
    document.querySelectorAll('.delete-btn').forEach(button => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-id');
        // Eliminar el documento de Firestore
        db.collection('purchases').doc(id).delete()
          .then(() => {
            console.log('Compra eliminada correctamente');
          })
          .catch(error => {
            console.error("Error al eliminar la compra:", error);
          });
      });
    });
  }

  // Actualiza el resumen mensual de pagos filtrado por tarjeta
  function updateSummary() {
    const selectedCard = filterCard.value;
    const filteredPurchases = purchases.filter(p => p.tarjeta === selectedCard);
    const totalCard = filteredPurchases.reduce((acc, purchase) => acc + purchase.montoTotal, 0);

    // Acumular pagos mensuales
    const summary = {};
    filteredPurchases.forEach(purchase => {
      const { montoTotal, cuotas, mesPrimeraCuota } = purchase;
      const pagoMensual = montoTotal / cuotas;
      let [year, month] = mesPrimeraCuota.split('-').map(Number);
      for (let i = 0; i < cuotas; i++) {
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

    const sortedMonths = Object.keys(summary).sort();
    let tableHTML = '<table>';
    tableHTML += '<thead><tr>';
    sortedMonths.forEach(month => {
      tableHTML += `<th>${month}</th>`;
    });
    tableHTML += '</tr></thead>';
    tableHTML += '<tbody><tr>';
    sortedMonths.forEach(month => {
      tableHTML += `<td>${formatCurrency(summary[month])}</td>`;
    });
    tableHTML += '</tr></tbody>';
    tableHTML += '</table>';

    // Calcular la próxima fecha de facturación (día 24)
    let today = new Date();
    let billingYear = today.getFullYear();
    let billingMonth = today.getMonth() + 1;
    if (today.getDate() >= 24) {
      billingMonth++;
      if (billingMonth > 12) {
        billingMonth = 1;
        billingYear++;
      }
    }
    const nextBillingKey = `${billingYear}-${billingMonth.toString().padStart(2, '0')}`;
    const nextBillingTotal = summary[nextBillingKey] || 0;

    let billingSummaryHTML = `
      <div id="billing-summary">
        <h4>Próxima fecha de facturación: 24 de ${nextBillingKey}</h4>
        <h3>Total a pagar: ${formatCurrency(nextBillingTotal)}</h3>
      </div>
    `;
    let totalHTML = `<div id="total-card"><h4>Total acumulado para ${selectedCard}: ${formatCurrency(totalCard)}</h4></div>`;
    summaryContainer.innerHTML = totalHTML + billingSummaryHTML + tableHTML;
  }

  // Función para actualizar la interfaz (tabla y resumen)
  function updateUI() {
    updatePurchasesTable();
    updateSummary();
  }

  // Escucha en tiempo real los cambios en la colección "purchases" del usuario autenticado
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      db.collection('purchases')
        .where('userId', '==', user.uid)
        .onSnapshot(snapshot => {
          purchases = []; // Reinicia el array
          snapshot.forEach(doc => {
            let data = doc.data();
            data.id = doc.id; // Guardar el ID del documento
            purchases.push(data);
          });
          updateUI();
        });
    }
  });

  // Manejar el envío del formulario para agregar una compra a Firestore
  purchaseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) {
      alert("Usuario no autenticado");
      return;
    }
    const data = {
      tarjeta: document.getElementById('tarjeta').value,
      montoTotal: parseFloat(document.getElementById('montoTotal').value),
      cuotas: parseInt(document.getElementById('cuotas').value),
      mesPrimeraCuota: document.getElementById('mesPrimeraCuota').value,
      detalle: document.getElementById('detalle').value,
      userId: currentUser.uid
    };

    // Validar campos
    if (!data.tarjeta.trim() || !data.detalle.trim() || data.montoTotal <= 0 || data.cuotas < 1 || !data.mesPrimeraCuota) {
      alert('Por favor, complete todos los campos correctamente.');
      return;
    }

    db.collection('purchases').add(data)
      .then(() => {
        console.log("Compra agregada correctamente");
        purchaseForm.reset();
      })
      .catch(error => {
        console.error("Error al agregar la compra:", error);
      });
  });

  // Actualiza la interfaz cuando se cambia el filtro de tarjeta
  filterCard.addEventListener('change', () => {
    updateUI();
  });
});
