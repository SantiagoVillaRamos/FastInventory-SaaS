/* ============================================================
   Catalog Module JS — modules/catalog/catalog.js
   F-28: Gestión de Catálogo
   ============================================================ */

window.catalogModule = (function () {
  /* ── Estado local ────────────────────────────────────────── */
  let categories = [];
  let products = [];
  let deleteItem = null; // { type: 'product'|'category', id: uuid }
  let isAdmin = false;

  /* ── DOM Elements ────────────────────────────────────────── */
  const el = {
    tabs: document.querySelectorAll('.tabs__btn'),
    contents: document.querySelectorAll('.tab-content'),
    
    // Categorías
    catTbody: document.getElementById('categoriesTableBody'),
    btnNewCat: document.getElementById('btnNewCategory'),
    modalCat: document.getElementById('modalCategory'),
    formCat: document.getElementById('formCategory'),
    titleCat: document.getElementById('modalCategoryTitle'),
    errCat: document.getElementById('catError'),
    
    // Productos
    prodTbody: document.getElementById('productsTableBody'),
    btnNewProd: document.getElementById('btnNewProduct'),
    modalProd: document.getElementById('modalProduct'),
    formProd: document.getElementById('formProduct'),
    titleProd: document.getElementById('modalProductTitle'),
    errProd: document.getElementById('prodError'),
    searchProd: document.getElementById('searchProduct'),
    selectProdCat: document.getElementById('prodCategory'),
    
    // Delete Modal
    modalDel: document.getElementById('modalDelete'),
    btnConfirmDel: document.getElementById('btnConfirmDelete'),
    msgDel: document.getElementById('deleteMessage'),
    errDel: document.getElementById('deleteError')
  };

  /* ── Inicialización ──────────────────────────────────────── */
  async function init() {
    // 1. RBAC: Verificar rol del usuario
    const payload = auth.getPayload();
    isAdmin = payload && (payload.role === 'admin' || payload.role === 'superadmin');

    // Ocultar botones y columnas si es empleado
    if (!isAdmin) {
      document.querySelectorAll('.admin-only').forEach(n => n.remove());
    }

    // 2. Event Listeners de Tabs
    el.tabs.forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // 3. Event Listeners de Búsqueda
    if (el.searchProd) {
      el.searchProd.addEventListener('input', (e) => renderProducts(e.target.value));
    }

    // 4. Cargar datos iniciales
    await loadCategories(); // Primero categorías (se necesitan para el select de productos)
    await loadProducts();

    // 5. Setup forms si es admin
    if (isAdmin) setupAdminEvents();
  }

  /* ── Tabs Logic ──────────────────────────────────────────── */
  function switchTab(tabId) {
    el.tabs.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
    el.contents.forEach(content => {
      content.classList.toggle('active', content.id === `tab-${tabId}`);
    });
  }

  /* ── Formatters ──────────────────────────────────────────── */
  const formatCOP = (val) => val.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
  const escapeHTML = (str) => {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
  };

  /* ============================================================
     CATEGORÍAS
     ============================================================ */
  
  async function loadCategories() {
    try {
      categories = await api.get("/categories/");
      renderCategories();
      updateCategorySelect();
    } catch (err) {
      el.catTbody.innerHTML = `<tr><td colspan="${isAdmin?3:2}" class="text-center" style="color:var(--color-danger)">Error al cargar categorías</td></tr>`;
    }
  }

  function renderCategories() {
    if (categories.length === 0) {
      el.catTbody.innerHTML = `<tr><td colspan="${isAdmin?3:2}" class="text-center">No hay categorías registradas.</td></tr>`;
      return;
    }

    el.catTbody.innerHTML = categories.map(cat => `
      <tr>
        <td><strong>${escapeHTML(cat.name)}</strong></td>
        <td>${escapeHTML(cat.description) || '<span style="color:var(--color-text-muted)">Sin descripción</span>'}</td>
        ${isAdmin ? `
        <td>
          <button class="action-btn action-btn--edit" onclick="catalogModule.editCategory('${cat.id}')">✏️</button>
          <button class="action-btn action-btn--delete" onclick="catalogModule.confirmDelete('category', '${cat.id}', '${escapeHTML(cat.name)}')">🗑️</button>
        </td>` : ''}
      </tr>
    `).join('');
  }

  function updateCategorySelect() {
    if (!el.selectProdCat) return;
    el.selectProdCat.innerHTML = '<option value="">Seleccione...</option>' + 
      categories.map(c => `<option value="${c.id}">${escapeHTML(c.name)}</option>`).join('');
  }

  /* ============================================================
     PRODUCTOS
     ============================================================ */

  async function loadProducts() {
    try {
      products = await api.get("/products/");
      renderProducts();
    } catch (err) {
      el.prodTbody.innerHTML = `<tr><td colspan="${isAdmin?6:5}" class="text-center" style="color:var(--color-danger)">Error al cargar productos</td></tr>`;
    }
  }

  function renderProducts(searchTerm = '') {
    const filtered = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (filtered.length === 0) {
      el.prodTbody.innerHTML = `<tr><td colspan="${isAdmin?6:5}" class="text-center">No se encontraron productos.</td></tr>`;
      return;
    }

    el.prodTbody.innerHTML = filtered.map(prod => {
      // Cruzar datos: buscar el nombre de la categoría
      const cat = categories.find(c => c.id === prod.category_id);
      const catName = cat ? cat.name : 'Desconocida';
      
      const isLowStock = prod.stock <= 5;
      const stockColor = isLowStock ? (prod.stock===0 ? 'var(--color-danger)' : '#d97706') : 'inherit';

      return `
        <tr>
          <td><strong>${escapeHTML(prod.name)}</strong></td>
          <td><span class="badge" style="background:var(--color-surface-2)">${escapeHTML(catName)}</span></td>
          <td>${formatCOP(prod.price)}</td>
          <td style="color:${stockColor}; font-weight:${isLowStock?'bold':'normal'}">${prod.stock}</td>
          <td>${escapeHTML(prod.unit)}</td>
          ${isAdmin ? `
          <td>
            <button class="action-btn action-btn--edit" onclick="catalogModule.editProduct('${prod.id}')">✏️</button>
            <button class="action-btn action-btn--delete" onclick="catalogModule.confirmDelete('product', '${prod.id}', '${escapeHTML(prod.name)}')">🗑️</button>
          </td>` : ''}
        </tr>
      `;
    }).join('');
  }

  /* ============================================================
     ADMIN ACTIONS (Solo si es admin)
     ============================================================ */
  
  function setupAdminEvents() {
    // Abrir modales nuevos
    if (el.btnNewCat) el.btnNewCat.addEventListener('click', () => openCategoryModal());
    if (el.btnNewProd) el.btnNewProd.addEventListener('click', () => openProductModal());

    // Submit forms
    if (el.formCat) el.formCat.addEventListener('submit', handleCategorySubmit);
    if (el.formProd) el.formProd.addEventListener('submit', handleProductSubmit);
    
    // Confirm delete
    if (el.btnConfirmDel) el.btnConfirmDel.addEventListener('click', handleDeleteItem);
  }

  // --- Modal Helpers ---
  window.closeModal = function(id) {
    document.getElementById(id).hidden = true;
  };
  
  function openCategoryModal(cat = null) {
    el.errCat.textContent = '';
    el.titleCat.textContent = cat ? 'Editar Categoría' : 'Nueva Categoría';
    document.getElementById('categoryId').value = cat ? cat.id : '';
    document.getElementById('catName').value = cat ? cat.name : '';
    document.getElementById('catDesc').value = cat ? (cat.description || '') : '';
    el.modalCat.hidden = false;
  }

  function openProductModal(prod = null) {
    el.errProd.textContent = '';
    el.titleProd.textContent = prod ? 'Editar Producto' : 'Nuevo Producto';
    document.getElementById('productId').value = prod ? prod.id : '';
    document.getElementById('prodName').value = prod ? prod.name : '';
    document.getElementById('prodCategory').value = prod ? prod.category_id : '';
    document.getElementById('prodPrice').value = prod ? prod.price : '';
    document.getElementById('prodStock').value = prod ? prod.stock : '0';
    document.getElementById('prodUnit').value = prod ? prod.unit : 'unidad';
    el.modalProd.hidden = false;
  }

  window.catalogModule = {
    editCategory: function(id) {
      const cat = categories.find(c => c.id === id);
      if (cat) openCategoryModal(cat);
    },
    editProduct: function(id) {
      const prod = products.find(p => p.id === id);
      if (prod) openProductModal(prod);
    },
    confirmDelete: function(type, id, name) {
      deleteItem = { type, id };
      el.errDel.textContent = '';
      el.msgDel.innerHTML = `¿Estás seguro de que deseas eliminar <strong>${name}</strong>? Esta acción no se puede deshacer.`;
      el.modalDel.hidden = false;
    }
  };

  // --- Submits ---
  async function handleCategorySubmit(e) {
    e.preventDefault();
    const id = document.getElementById('categoryId').value;
    const data = {
      name: document.getElementById('catName').value.trim(),
      description: document.getElementById('catDesc').value.trim() || null
    };
    
    el.errCat.textContent = 'Guardando...';
    try {
      if (id) await api.patch(`/categories/${id}`, data);
      else await api.post("/categories/", data);
      
      closeModal('modalCategory');
      await loadCategories();
      await loadProducts(); // Recargar productos por si la categoría cambió de nombre
    } catch (err) {
      el.errCat.textContent = err.detail || 'Error al guardar la categoría.';
    }
  }

  async function handleProductSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('productId').value;
    const data = {
      name: document.getElementById('prodName').value.trim(),
      category_id: document.getElementById('prodCategory').value,
      price: parseFloat(document.getElementById('prodPrice').value),
      stock: parseInt(document.getElementById('prodStock').value, 10),
      unit: document.getElementById('prodUnit').value.trim()
    };
    
    el.errProd.textContent = 'Guardando...';
    try {
      if (id) await api.patch(`/products/${id}`, data);
      else await api.post("/products/", data);
      
      closeModal('modalProduct');
      await loadProducts();
    } catch (err) {
      el.errProd.textContent = err.detail || 'Error al guardar el producto.';
    }
  }

  async function handleDeleteItem() {
    if (!deleteItem) return;
    el.errDel.textContent = 'Eliminando...';
    
    try {
      if (deleteItem.type === 'category') {
        await api.delete(`/categories/${deleteItem.id}`);
        await loadCategories();
      } else {
        await api.delete(`/products/${deleteItem.id}`);
        await loadProducts();
      }
      closeModal('modalDelete');
    } catch (err) {
      // AC-07: Error claro al borrar categoría con productos
      if (err.status === 400 && err.detail && err.detail.includes("productos asoc")) {
        el.errDel.textContent = "No puedes borrar esta categoría porque tiene productos asignados.";
      } else {
        el.errDel.textContent = err.detail || 'Error al eliminar.';
      }
    }
  }

  // --- Ejecutar Init ---
  init();

  return window.catalogModule;
})();
