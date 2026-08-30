const API_BASE = "http://127.0.0.1:5000";

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        const response = await fetch(`${API_BASE}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem("user", JSON.stringify(data.user));
            window.location.href = "/dashboard-page";
        } else {
            alert(data.error);
        }
    });
}


/* 

Dashboard Page Script

*/

const dashboardShopsContainer = document.getElementById("shopsContainer");

if (dashboardShopsContainer) {

    const user = JSON.parse(localStorage.getItem("user"));

    if (!user) {
        window.location.href = "/";
    }

    const isWorker = user.role === "worker";

    document.getElementById("welcomeText").textContent =
        isWorker ? `Hello ${user.name} (Worker)` : `Hello ${user.name}`;

    document.getElementById("currentDate").textContent =
        new Date().toDateString();

    const addShopBtn = document.getElementById("showAddShopBtn");

    if (isWorker && addShopBtn) {
        addShopBtn.style.display = "none";
    }

    loadShops(user.id);

    async function loadShops(userId) {

        const response = await fetch(`${API_BASE}/shops/${userId}`);
        const shops = await response.json();

        dashboardShopsContainer.innerHTML = "";

        if (!Array.isArray(shops) || shops.length === 0) {
            dashboardShopsContainer.innerHTML = "<p>No shop assigned yet.</p>";
            return;
        }

        shops.forEach(shop => {

            const card = document.createElement("div");
            card.className = "shop-card";

            const businessLabel =
                shop.business_type === "service"
                    ? `${shop.service_category || "Service"} Business`
                    : "Product Business";

            const ownerActions = isWorker ? "" : `
                <div class="shop-action-buttons">
                    <button 
                        class="icon-btn edit-btn"
                        title="Edit"
                        onclick="editShop(
                            event, 
                            ${shop.id}, 
                            '${shop.shop_name}', 
                            '${shop.location || ""}',
                            '${shop.business_type || "product"}',
                            '${shop.service_category || ""}'
                        )"
                    >
                        ✏️
                    </button>

                    <button 
                        class="icon-btn delete-btn"
                        title="Delete"
                        onclick="deleteShop(event, ${shop.id})"
                    >
                        🗑️
                    </button>
                </div>
            `;

            card.innerHTML = `
                <div class="shop-card-content">
                    <h3>${shop.shop_name}</h3>
                    <p>${shop.location || "No location added"}</p>
                    <p>${businessLabel}</p>
                </div>

                ${ownerActions}
            `;

            card.addEventListener("click", function () {
                localStorage.setItem("selectedShop", JSON.stringify(shop));

                if (shop.business_type === "service") {
                    window.location.href = "/service-shop-page";
                } else {
                    window.location.href = "/shop-page";
                }
            });

            dashboardShopsContainer.appendChild(card);
        });
    }

    if (addShopBtn) {
        addShopBtn.addEventListener("click", function () {
            document.getElementById("addShopBox").classList.remove("hidden");
        });
    }

    document.getElementById("closePopupBtn").addEventListener("click", function () {
        document.getElementById("addShopBox").classList.add("hidden");
    });

    document.getElementById("saveShopBtn").addEventListener("click", async function () {

        const shopName = document.getElementById("shopName").value;
        const shopLocation = document.getElementById("shopLocation").value;
        const businessType = document.getElementById("businessType").value;
        const serviceCategory = document.getElementById("serviceCategory").value;

        if (!shopName) {
            alert("Please enter shop name");
            return;
        }

        if (businessType === "service" && !serviceCategory) {
            alert("Please select service type");
            return;
        }

        const response = await fetch(`${API_BASE}/shops`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                user_id: user.id,
                shop_name: shopName,
                location: shopLocation,
                business_type: businessType,
                service_category: serviceCategory
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || "Shop could not be added");
            return;
        }

        alert("Shop added successfully");

        document.getElementById("shopName").value = "";
        document.getElementById("shopLocation").value = "";
        document.getElementById("businessType").value = "product";
        document.getElementById("serviceCategory").value = "";

        document.getElementById("addShopBox").classList.add("hidden");
        loadShops(user.id);
    });

    window.editShop = function (
        event, 
        shopId, 
        shopName, 
        shopLocation,
        businessType,
        serviceCategory
    ) {

        event.stopPropagation();

        if (isWorker) {
            alert("Workers cannot edit shops");
            return;
        }

        document.getElementById("editShopId").value = shopId;
        document.getElementById("editShopName").value = shopName;
        document.getElementById("editShopLocation").value = shopLocation;
        document.getElementById("editBusinessType").value = businessType;
        document.getElementById("editServiceCategory").value = serviceCategory;

        document.getElementById("editShopBox").classList.remove("hidden");
    };

    window.deleteShop = async function (event, shopId) {

        event.stopPropagation();

        if (isWorker) {
            alert("Workers cannot delete shops");
            return;
        }

        const confirmDelete = confirm(
            "Are you sure you want to delete this shop? This may affect its records."
        );

        if (!confirmDelete) return;

        const response = await fetch(`${API_BASE}/shops/${shopId}`, {
            method: "DELETE"
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || "Shop could not be deleted");
            return;
        }

        alert("Shop deleted successfully");
        loadShops(user.id);
    };

    document.getElementById("closeEditShopPopupBtn")
        .addEventListener("click", function () {
            document.getElementById("editShopBox").classList.add("hidden");
        });

    document.getElementById("updateShopBtn")
        .addEventListener("click", async function () {

            const shopId = document.getElementById("editShopId").value;
            const shopName = document.getElementById("editShopName").value;
            const shopLocation = document.getElementById("editShopLocation").value;
            const businessType = document.getElementById("editBusinessType").value;
            const serviceCategory = document.getElementById("editServiceCategory").value;

            if (!shopName) {
                alert("Please enter shop name");
                return;
            }

            if (businessType === "service" && !serviceCategory) {
                alert("Please select service type");
                return;
            }

            const response = await fetch(`${API_BASE}/shops/${shopId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    shop_name: shopName,
                    location: shopLocation,
                    business_type: businessType,
                    service_category: serviceCategory
                })
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.error || "Shop could not be updated");
                return;
            }

            alert("Shop updated successfully");

            document.getElementById("editShopBox").classList.add("hidden");
            loadShops(user.id);
        });
}

/*

    Shop Page Script

*/

const shopTitle = document.getElementById("shopTitle");

if (shopTitle) {
    const selectedShop = JSON.parse(localStorage.getItem("selectedShop"));

    if (!selectedShop) {
        window.location.href = "/dashboard-page";
    }

    shopTitle.textContent = selectedShop.shop_name;
    document.getElementById("shopDate").textContent = new Date().toDateString();

    loadAlertsBadge();
}

async function loadAlertsBadge() {

    const selectedShop = JSON.parse(localStorage.getItem("selectedShop"));

    if (!selectedShop) return;

    const response = await fetch(`${API_BASE}/notifications`);
    const alerts = await response.json();

    const shopAlerts = alerts.filter(
        alert => alert.shop_id === selectedShop.id
    );

    const badge = document.getElementById("alertsBadge");

    if (shopAlerts.length > 0) {
        badge.textContent = shopAlerts.length;
        badge.classList.remove("hidden");
    } else {
        badge.classList.add("hidden");
    }
}


/*

inventory page script

*/

const stockList = document.getElementById("stockList");

if (stockList) {

    const selectedShop = JSON.parse(localStorage.getItem("selectedShop"));
    let allStock = [];
    let isEditingProduct = false;

    if (!selectedShop) {
        window.location.href = "/dashboard-page";
    }

    document.getElementById("stockShopName").textContent =
        `${selectedShop.shop_name} Stock`;

    document.getElementById("stockDate").textContent =
        new Date().toDateString();

    loadStock();

    async function loadStock() {

        const response = await fetch(`${API_BASE}/inventory`);
        const stock = await response.json();

        allStock = stock.filter(
            item => item.shop_id === selectedShop.id
        );

        displayStock(allStock);
    }

    function displayStock(stockItems) {

        stockList.innerHTML = "";

        if (stockItems.length === 0) {
            stockList.innerHTML = "<p>No stock found.</p>";
            return;
        }

        stockItems.forEach(item => {

            const div = document.createElement("div");
            div.className = "stock-item";

            div.innerHTML = `
                <div class="stock-product-name">${item.product_name}</div>
                <div>${item.category}</div>
                <div>Ksh ${item.price}</div>
                <div class="stock-quantity">${item.quantity}</div>

                <div class="action-buttons">
                    <button 
                        class="icon-btn edit-btn"
                        title="Edit"
                        onclick="editStockItem(${item.product_id}, ${item.id})"
                    >
                        ✏️
                    </button>

                    <button 
                        class="icon-btn delete-btn"
                        title="Delete"
                        onclick="deleteStockItem(${item.product_id})"
                    >
                        🗑️
                    </button>
                </div>
            `;

            stockList.appendChild(div);
        });
    }

    document.getElementById("stockSearch")
        .addEventListener("input", function () {

            const searchTerm = this.value.toLowerCase();

            const filteredStock = allStock.filter(item =>
                item.product_name.toLowerCase().includes(searchTerm) ||
                item.category.toLowerCase().includes(searchTerm)
            );

            displayStock(filteredStock);
        });

    document.getElementById("showAddProductBtn")
        .addEventListener("click", function () {
            openProductPopupForAdd();
        });

    document.getElementById("closeProductPopupBtn")
        .addEventListener("click", function () {
            closeProductPopup();
        });

    function openProductPopupForAdd() {
        isEditingProduct = false;

        document.getElementById("productPopupTitle").textContent = "Add Product";
        document.getElementById("addProductBtn").textContent = "Save Product";

        document.getElementById("editProductId").value = "";
        document.getElementById("editInventoryId").value = "";
        document.getElementById("productName").value = "";
        document.getElementById("productCategory").value = "";
        document.getElementById("productPrice").value = "";
        document.getElementById("productQuantity").value = "";

        document.getElementById("addProductPopup").classList.remove("hidden");
    }

    function closeProductPopup() {
        document.getElementById("addProductPopup").classList.add("hidden");
    }

    window.editStockItem = function (productId, inventoryId) {

        const item = allStock.find(stock =>
            Number(stock.product_id) === Number(productId)
        );

        if (!item) {
            alert("Product not found");
            return;
        }

        isEditingProduct = true;

        document.getElementById("productPopupTitle").textContent = "Edit Product";
        document.getElementById("addProductBtn").textContent = "Update Product";

        document.getElementById("editProductId").value = productId;
        document.getElementById("editInventoryId").value = inventoryId;
        document.getElementById("productName").value = item.product_name;
        document.getElementById("productCategory").value = item.category;
        document.getElementById("productPrice").value = item.price;
        document.getElementById("productQuantity").value = item.quantity;

        document.getElementById("addProductPopup").classList.remove("hidden");
    };

    window.deleteStockItem = async function (productId) {

        const confirmDelete = confirm("Are you sure you want to delete this product?");

        if (!confirmDelete) return;

        const response = await fetch(`${API_BASE}/products/${productId}`, {
            method: "DELETE"
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || "Product could not be deleted");
            return;
        }

        alert("Product deleted successfully");
        loadStock();
    };

    document.getElementById("addProductBtn")
        .addEventListener("click", async function () {

            const productId = document.getElementById("editProductId").value;

            const name = document.getElementById("productName").value.trim();
            const category = document.getElementById("productCategory").value.trim();
            const price = document.getElementById("productPrice").value;
            const quantity = document.getElementById("productQuantity").value;

            if (!name || !category || !price || !quantity) {
                alert("Please fill all fields");
                return;
            }

            if (isEditingProduct) {

                const productResponse = await fetch(`${API_BASE}/products/${productId}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        name: name,
                        category: category,
                        price: price
                    })
                });

                const productData = await productResponse.json();

                if (!productResponse.ok) {
                    alert(productData.error || "Product could not be updated");
                    return;
                }

                const inventoryResponse = await fetch(`${API_BASE}/inventory/${productId}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        quantity: quantity
                    })
                });

                const inventoryData = await inventoryResponse.json();

                if (!inventoryResponse.ok) {
                    alert(inventoryData.error || "Inventory could not be updated");
                    return;
                }

                alert("Product updated successfully");

            } else {

                const productResponse = await fetch(`${API_BASE}/products`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        shop_id: selectedShop.id,
                        name: name,
                        category: category,
                        price: price
                    })
                });

                const productData = await productResponse.json();

                if (!productResponse.ok) {
                    alert(productData.error || "Product could not be added");
                    return;
                }

                const inventoryResponse = await fetch(`${API_BASE}/inventory`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        shop_id: selectedShop.id,
                        product_id: productData.product_id,
                        quantity: quantity
                    })
                });

                const inventoryData = await inventoryResponse.json();

                if (!inventoryResponse.ok) {
                    alert(inventoryData.error || "Inventory could not be added");
                    return;
                }

                alert("Product added successfully");
            }

            closeProductPopup();
            loadStock();
        });
}

/*

sales page script

*/

const salesList = document.getElementById("salesList");

if (salesList) {

    const user = JSON.parse(localStorage.getItem("user"));
    const selectedShop = JSON.parse(localStorage.getItem("selectedShop"));

    if (!user) {
        window.location.href = "/";
    }

    if (!selectedShop) {
        window.location.href = "/dashboard-page";
    }

    document.getElementById("salesShopName").textContent =
        `${selectedShop.shop_name} Sales`;

    document.getElementById("salesDate").textContent =
        new Date().toDateString();

    const paymentMethod = document.getElementById("paymentMethod");
    const customerNameInput = document.getElementById("saleCustomerName");
    const phoneInput = document.getElementById("salePhone");
    const dueDateInput = document.getElementById("saleDueDate");
    const saleHint = document.getElementById("saleHint");

    paymentMethod.addEventListener("change", function () {

        customerNameInput.style.display = "none";
        phoneInput.style.display = "none";
        dueDateInput.style.display = "none";
        saleHint.textContent = "";

        if (this.value === "Debt") {
            customerNameInput.style.display = "block";
            phoneInput.style.display = "block";
            dueDateInput.style.display = "block";
            saleHint.textContent = "Debt sales need customer name, phone number and due date.";
        }

        if (this.value === "Mpesa") {
            phoneInput.style.display = "block";
            customerNameInput.style.display = "block";
            saleHint.textContent = "M-PESA prompt will be sent to the customer's phone.";
        }

        if (this.value === "Cash") {
            saleHint.textContent = "Cash sale will be recorded directly.";
        }
    });

    loadSaleProducts();
    loadSales();

    async function loadSaleProducts() {

        const response = await fetch(`${API_BASE}/inventory`);
        const stock = await response.json();

        const shopStock = stock.filter(
            item => item.shop_id === selectedShop.id
        );

        const productInput = document.getElementById("saleProductSearch");
        const productHiddenInput = document.getElementById("saleProduct");
        const productList = document.getElementById("salesProductsList");

        productList.innerHTML = "";

        shopStock.forEach(item => {

            const option = document.createElement("option");

            option.value = `${item.product_name} - Qty: ${item.quantity}`;
            option.dataset.productId = item.product_id;
            option.dataset.price = item.price;
            option.dataset.quantity = item.quantity;

            productList.appendChild(option);
        });

        productInput.addEventListener("input", function () {

            const selectedOption = Array.from(productList.options).find(
                option => option.value === productInput.value
            );

            if (selectedOption) {
                productHiddenInput.value = selectedOption.dataset.productId;
            } else {
                productHiddenInput.value = "";
            }
        });
    }

    async function loadSales() {

        const response = await fetch(`${API_BASE}/sales`);
        const sales = await response.json();

        const shopSales = sales.filter(
            sale => sale.shop_id === selectedShop.id
        );

        salesList.innerHTML = "";

        if (shopSales.length === 0) {
            salesList.innerHTML = "<p>No sales recorded yet.</p>";
            return;
        }

        shopSales.forEach(sale => {

            const div = document.createElement("div");
            div.className = "sales-item";

            div.innerHTML = `
                <div>#${sale.id}</div>
                <div>${sale.product_name || "-"}</div>
                <div>${sale.quantity || "-"}</div>
                <div class="sales-total">Ksh ${sale.total_amount}</div>
                <div>${sale.payment_method || "N/A"}</div>
                <div>${sale.customer_name || "-"}</div>
                <div>${formatDateTime(sale.sale_date)}</div>

                <div class="action-buttons">
                    <button 
                        class="icon-btn cancel-btn"
                        title="Cancel Sale"
                        onclick="cancelSale(${sale.id})"
                    >
                        ❌
                    </button>
                </div>
            `;

            salesList.appendChild(div);
        });
    }

    function formatDateTime(dateValue) {
        const date = new Date(dateValue);

        return date.toLocaleString("en-KE", {
            timeZone: "Africa/Nairobi",
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    async function calculateProductTotal(productId, quantity) {
        const response = await fetch(`${API_BASE}/inventory`);
        const stock = await response.json();

        const product = stock.find(item =>
            item.shop_id === selectedShop.id &&
            Number(item.product_id) === Number(productId)
        );

        if (!product) {
            return null;
        }

        return Number(product.price) * Number(quantity);
    }

    document.getElementById("recordSaleBtn")
        .addEventListener("click", async function () {

            const productId = document.getElementById("saleProduct").value;
            const quantity = document.getElementById("saleQuantity").value;
            const selectedPayment = paymentMethod.value;
            const customerName = customerNameInput.value.trim();
            const phone = phoneInput.value.trim();
            const dueDate = dueDateInput.value;

            if (!productId || !quantity) {
                alert("Please select a product and enter quantity");
                return;
            }

            if (!selectedPayment) {
                alert("Please select payment method");
                return;
            }

            if (selectedPayment === "Debt" && (!customerName || !phone || !dueDate)) {
                alert("Please enter customer name, phone number and due date for debt sale");
                return;
            }

            if (selectedPayment === "Mpesa" && !phone) {
                alert("Please enter phone number for M-PESA sale");
                return;
            }

            if (selectedPayment === "Mpesa") {

                const totalAmount = await calculateProductTotal(productId, quantity);

                if (!totalAmount) {
                    alert("Could not calculate product total");
                    return;
                }

                const response = await fetch(`${API_BASE}/mpesa-stk-push`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        user_id: user.id,
                        payment_type: "sale",
                        shop_id: selectedShop.id,
                        customer_name: customerName || "M-PESA Customer",
                        phone: phone,
                        amount: totalAmount,
                        service_name: "Product Sale",
                        items: [
                            {
                                product_id: Number(productId),
                                quantity: Number(quantity)
                            }
                        ]
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    console.log("Product M-PESA error:", data);
                    alert(data.error || data.errorMessage || JSON.stringify(data));
                    return;
                }

                alert("M-PESA prompt sent. Complete payment on phone.");

                clearSaleForm();

                setTimeout(function () {
                    loadSaleProducts();
                    loadSales();
                }, 5000);

                return;
            }

            const response = await fetch(`${API_BASE}/sales`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    user_id: user.id,
                    shop_id: selectedShop.id,
                    payment_method: selectedPayment,
                    customer_name: customerName,
                    phone: phone,
                    due_date: dueDate,
                    items: [
                        {
                            product_id: Number(productId),
                            quantity: Number(quantity)
                        }
                    ]
                })
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.error || "Sale could not be recorded");
                return;
            }

            alert("Sale recorded successfully");

            clearSaleForm();

            loadSaleProducts();
            loadSales();
        });

    function clearSaleForm() {
        document.getElementById("saleProductSearch").value = "";
        document.getElementById("saleProduct").value = "";
        document.getElementById("saleQuantity").value = "";
        paymentMethod.value = "";
        customerNameInput.value = "";
        phoneInput.value = "";
        dueDateInput.value = "";

        customerNameInput.style.display = "none";
        phoneInput.style.display = "none";
        dueDateInput.style.display = "none";
        saleHint.textContent = "";
    }

    window.cancelSale = async function (saleId) {

        const confirmCancel = confirm(
            "Are you sure you want to cancel this sale? Stock will be restored."
        );

        if (!confirmCancel) return;

        const response = await fetch(`${API_BASE}/sales/${saleId}/cancel`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                user_id: user.id
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || "Sale could not be cancelled");
            return;
        }

        alert("Sale cancelled successfully");

        loadSaleProducts();
        loadSales();
    };
}

/*

customers page script

*/

const customersList = document.getElementById("customersList");

if (customersList) {

    const selectedShop = JSON.parse(localStorage.getItem("selectedShop"));
    let allCustomers = [];

    if (!selectedShop) {
        window.location.href = "/dashboard-page";
    }

    document.getElementById("customersShopName").textContent =
        `${selectedShop.shop_name} Customers`;

    document.getElementById("customersDate").textContent =
        new Date().toDateString();

    loadCustomers();

    async function loadCustomers() {

        const response = await fetch(`${API_BASE}/customers`);
        const customers = await response.json();

        allCustomers = customers.filter(
            customer => customer.shop_id === selectedShop.id
        );

        displayCustomers(allCustomers);
    }

    function displayCustomers(customerItems) {

        customersList.innerHTML = "";

        if (customerItems.length === 0) {
            customersList.innerHTML = "<p>No customers found.</p>";
            return;
        }

        customerItems.forEach(customer => {

            const div = document.createElement("div");
            div.className = "customer-item";

            div.innerHTML = `
                <div class="customer-name">${customer.name}</div>
                <div>${customer.phone}</div>
                <div>${formatSimpleDate(customer.created_at)}</div>

                <div class="action-buttons">

                    <button 
                        class="icon-btn edit-btn"
                        title="Edit"
                        onclick="editCustomer(
                            ${customer.id},
                            '${customer.name}',
                            '${customer.phone}'
                        )"
                    >
                        ✏️
                    </button>

                    <button 
                        class="icon-btn delete-btn"
                        title="Delete"
                        onclick="deleteCustomer(${customer.id})"
                    >
                        🗑️
                    </button>

                </div>
            `;

            customersList.appendChild(div);
        });
    }

    function formatSimpleDate(dateValue) {

        const date = new Date(dateValue);

        return date.toLocaleDateString("en-KE", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    }

    document.getElementById("customerSearch")
        .addEventListener("input", function () {

        const searchTerm = this.value.toLowerCase();

        const filteredCustomers = allCustomers.filter(customer =>
            customer.name.toLowerCase().includes(searchTerm) ||
            customer.phone.toLowerCase().includes(searchTerm)
        );

        displayCustomers(filteredCustomers);
    });

    document.getElementById("showAddCustomerBtn")
        .addEventListener("click", function () {

        document.getElementById("addCustomerPopup")
            .classList.remove("hidden");
    });

    document.getElementById("closeCustomerPopupBtn")
        .addEventListener("click", function () {

        document.getElementById("addCustomerPopup")
            .classList.add("hidden");
    });

    document.getElementById("addCustomerBtn")
        .addEventListener("click", async function () {

        const name = document.getElementById("customerName").value;
        const phone = document.getElementById("customerPhone").value;

        if (!name || !phone) {
            alert("Please enter customer name and phone number");
            return;
        }

        const response = await fetch(`${API_BASE}/customers`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                shop_id: selectedShop.id,
                name: name,
                phone: phone
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || "Customer could not be added");
            return;
        }

        alert("Customer added successfully");

        document.getElementById("customerName").value = "";
        document.getElementById("customerPhone").value = "";

        document.getElementById("addCustomerPopup")
            .classList.add("hidden");

        loadCustomers();
    });

    document.getElementById("closeEditCustomerPopupBtn")
        .addEventListener("click", function () {

        document.getElementById("editCustomerPopup")
            .classList.add("hidden");
    });

    document.getElementById("updateCustomerBtn")
        .addEventListener("click", async function () {

        const customerId = document.getElementById("editCustomerId").value;
        const name = document.getElementById("editCustomerName").value;
        const phone = document.getElementById("editCustomerPhone").value;

        if (!name || !phone) {
            alert("Please enter customer name and phone number");
            return;
        }

        const response = await fetch(`${API_BASE}/customers/${customerId}`, {

            method: "PUT",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                name: name,
                phone: phone
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || "Customer could not be updated");
            return;
        }

        alert("Customer updated successfully");

        document.getElementById("editCustomerPopup")
            .classList.add("hidden");

        loadCustomers();
    });
}


/* GLOBAL FUNCTIONS */

function editCustomer(customerId, customerName, customerPhone) {

    document.getElementById("editCustomerId").value = customerId;
    document.getElementById("editCustomerName").value = customerName;
    document.getElementById("editCustomerPhone").value = customerPhone;

    document.getElementById("editCustomerPopup")
        .classList.remove("hidden");
}


async function deleteCustomer(customerId) {

    const confirmDelete = confirm(
        "Are you sure you want to delete this customer?"
    );

    if (!confirmDelete) return;

    const response = await fetch(`${API_BASE}/customers/${customerId}`, {
        method: "DELETE"
    });

    const data = await response.json();

    if (!response.ok) {
        alert(data.error || "Customer could not be deleted");
        return;
    }

    alert("Customer deleted successfully");

    location.reload();
}

/*

debts page script

*/

const debtsList = document.getElementById("debtsList");

if (debtsList) {

    const selectedShop = JSON.parse(localStorage.getItem("selectedShop"));
    let allDebts = [];

    if (!selectedShop) {
        window.location.href = "/dashboard-page";
    }

    document.getElementById("debtsShopName").textContent =
        `${selectedShop.shop_name} Debts`;

    document.getElementById("debtsDate").textContent =
        new Date().toDateString();

    if (selectedShop.business_type === "service") {
        document.getElementById("debtsBackLink").href = "/service-shop-page";
    }

    loadDebts();

    async function loadDebts() {

        const response = await fetch(`${API_BASE}/debts/${selectedShop.id}`);
        const debts = await response.json();

        allDebts = debts;
        displayDebts(allDebts);
    }

    function displayDebts(debtItems) {

        debtsList.innerHTML = "";

        if (debtItems.length === 0) {
            debtsList.innerHTML = "<p>No debts found.</p>";
            return;
        }

        debtItems.forEach(debt => {

            const div = document.createElement("div");
            div.className = "debt-item";

            const balance = debt.balance ?? debt.amount ?? 0;
            const totalPaid = debt.total_paid ?? 0;

            div.innerHTML = `
                <div class="debt-customer">${debt.customer_name || "Unknown"}</div>

                <div>
                    <strong>Ksh ${balance}</strong><br>
                    <small>Paid: ${totalPaid}</small>
                </div>

                <div>${formatSimpleDebtDate(debt.due_date)}</div>

                <div class="${debt.status === "paid" ? "status-paid" : "status-unpaid"}">
                    ${debt.status}
                </div>

                <div class="action-buttons">

                    <button 
                        class="icon-btn pay-btn"
                        title="Record payment"
                        onclick="openPayDebtPopup(${debt.id})"
                    >
                        💵
                    </button>

                    <button 
                        class="icon-btn edit-btn"
                        title="Edit debt"
                        onclick="editDebt(
                            ${debt.id},
                            '${debt.amount}',
                            '${formatInputDate(debt.due_date)}',
                            '${debt.status}'
                        )"
                    >
                        ✏️
                    </button>

                    <button 
                        class="icon-btn delete-btn"
                        title="Delete debt"
                        onclick="deleteDebt(${debt.id})"
                    >
                        🗑️
                    </button>

                </div>
            `;

            debtsList.appendChild(div);
        });
    }

    function formatSimpleDebtDate(dateValue) {
        if (!dateValue) return "";

        const date = new Date(dateValue);

        return date.toLocaleDateString("en-KE", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    }

    function formatInputDate(dateValue) {
        if (!dateValue) return "";

        const date = new Date(dateValue);
        return date.toISOString().split("T")[0];
    }

    document.getElementById("debtSearch")
        .addEventListener("input", function () {

        const searchTerm = this.value.toLowerCase();

        const filteredDebts = allDebts.filter(debt =>
            (debt.customer_name || "").toLowerCase().includes(searchTerm) ||
            (debt.status || "").toLowerCase().includes(searchTerm)
        );

        displayDebts(filteredDebts);
    });

    document.getElementById("showAddDebtBtn")
        .addEventListener("click", function () {
            document.getElementById("addDebtPopup").classList.remove("hidden");
        });

    document.getElementById("closeDebtPopupBtn")
        .addEventListener("click", function () {
            document.getElementById("addDebtPopup").classList.add("hidden");
        });

    document.getElementById("addDebtBtn")
        .addEventListener("click", async function () {

        const customerName = document.getElementById("manualDebtCustomerName").value;
        const amount = document.getElementById("debtAmount").value;
        const dueDate = document.getElementById("debtDueDate").value;

        if (!customerName || !amount || !dueDate) {
            alert("Please fill all debt details");
            return;
        }

        const response = await fetch(`${API_BASE}/debts`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                shop_id: selectedShop.id,
                customer_name: customerName,
                amount: amount,
                due_date: dueDate
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || "Debt could not be added");
            return;
        }

        alert("Debt added successfully");

        document.getElementById("manualDebtCustomerName").value = "";
        document.getElementById("debtAmount").value = "";
        document.getElementById("debtDueDate").value = "";

        document.getElementById("addDebtPopup").classList.add("hidden");

        loadDebts();
    });

    document.getElementById("closeEditDebtPopupBtn")
        .addEventListener("click", function () {
            document.getElementById("editDebtPopup").classList.add("hidden");
        });

    document.getElementById("updateDebtBtn")
        .addEventListener("click", async function () {

        const debtId = document.getElementById("editDebtId").value;
        const amount = document.getElementById("editDebtAmount").value;
        const dueDate = document.getElementById("editDebtDueDate").value;
        const status = document.getElementById("editDebtStatus").value;

        if (!amount || !dueDate || !status) {
            alert("Please fill all fields");
            return;
        }

        const response = await fetch(`${API_BASE}/debts/${debtId}`, {

            method: "PUT",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                amount: amount,
                due_date: dueDate,
                status: status
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || "Debt could not be updated");
            return;
        }

        alert("Debt updated successfully");

        document.getElementById("editDebtPopup").classList.add("hidden");

        loadDebts();
    });

    document.getElementById("closePayDebtPopupBtn")
        .addEventListener("click", function () {
            document.getElementById("payDebtPopup").classList.add("hidden");
        });

    document.getElementById("savePaymentBtn")
        .addEventListener("click", async function () {

        const debtId = document.getElementById("payDebtId").value;
        const amountPaid = document.getElementById("amountPaid").value;

        if (!amountPaid) {
            alert("Please enter amount paid");
            return;
        }

        const response = await fetch(`${API_BASE}/debts/${debtId}/pay`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                amount_paid: amountPaid,
                shop_id: selectedShop.id,
                business_type: selectedShop.business_type
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || "Payment could not be recorded");
            return;
        }

        alert("Payment recorded successfully");

        document.getElementById("amountPaid").value = "";

        document.getElementById("payDebtPopup").classList.add("hidden");

        loadDebts();
    });
}


function openPayDebtPopup(debtId) {
    document.getElementById("payDebtId").value = debtId;
    document.getElementById("payDebtPopup").classList.remove("hidden");
}


function editDebt(debtId, amount, dueDate, status) {

    document.getElementById("editDebtId").value = debtId;
    document.getElementById("editDebtAmount").value = amount;
    document.getElementById("editDebtDueDate").value = dueDate;
    document.getElementById("editDebtStatus").value = status;

    document.getElementById("editDebtPopup").classList.remove("hidden");
}


async function deleteDebt(debtId) {

    const confirmDelete = confirm(
        "Are you sure you want to delete this debt?"
    );

    if (!confirmDelete) return;

    const response = await fetch(`${API_BASE}/debts/${debtId}`, {
        method: "DELETE"
    });

    const data = await response.json();

    if (!response.ok) {
        alert(data.error || "Debt could not be deleted");
        return;
    }

    alert("Debt deleted successfully");

    location.reload();
}

/* 

alerts page

*/

const alertsList = document.getElementById("alertsList");

if (alertsList) {

    const selectedShop = JSON.parse(localStorage.getItem("selectedShop"));

    if (!selectedShop) {
        window.location.href = "/dashboard-page";
    }

    document.getElementById("alertsShopName").textContent =
        `${selectedShop.shop_name} Alerts`;

    document.getElementById("alertsDate").textContent =
        new Date().toDateString();

    if (selectedShop.business_type === "service") {
        document.getElementById("alertsBackLink").href = "/service-shop-page";
    }

    loadAlerts();

    async function loadAlerts() {

        const response = await fetch(`${API_BASE}/notifications`);
        const alerts = await response.json();

        const shopAlerts = alerts.filter(
            alert => alert.shop_id === selectedShop.id
        );

        displayAlerts(shopAlerts);
    }

    function displayAlerts(alertItems) {

        alertsList.innerHTML = "";

        if (alertItems.length === 0) {
            alertsList.innerHTML = `
                <div class="alert-item no-alert">
                    <div class="alert-title">No Alerts</div>
                    <div class="alert-message">Everything looks okay for now.</div>
                </div>
            `;
            return;
        }

        alertItems.forEach(alert => {

            const div = document.createElement("div");
            div.className = `alert-item ${alert.type}`;

            let smsButton = "";

            if (
                (alert.type === "overdue" || alert.type === "due_soon") &&
                alert.details &&
                alert.details.customer_phone
            ) {
                smsButton = `
                    <button 
                        class="sms-reminder-btn"
                        onclick="sendSmsReminder(
                            '${alert.details.customer_phone}',
                            '${alert.details.customer_name}',
                            '${alert.details.amount}',
                            '${formatAlertDate(alert.details.due_date)}',
                            '${selectedShop.shop_name}'
                        )"
                    >
                        Send SMS Reminder
                    </button>
                `;
            }

            div.innerHTML = `
                <div class="alert-title">${alert.title}</div>
                <div class="alert-message">${alert.message}</div>
                ${smsButton}
            `;

            alertsList.appendChild(div);
        });
    }

    function formatAlertDate(dateValue) {
        if (!dateValue) return "";

        const date = new Date(dateValue);

        return date.toLocaleDateString("en-KE", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    }
}


async function sendSmsReminder(phone, customerName, amount, dueDate, shopName) {

    const confirmSend = confirm(
        `Send SMS reminder to ${customerName}?`
    );

    if (!confirmSend) {
        return;
    }

    const response = await fetch(`${API_BASE}/send-sms-reminder`, {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            phone: phone,
            customer_name: customerName,
            amount: amount,
            due_date: dueDate,
            shop_name: shopName
        })
    });

    const data = await response.json();

    if (!response.ok) {
        alert(data.error || "SMS could not be sent");
        return;
    }

    alert("SMS reminder sent successfully");
}

/*

analysis page script

*/

const analysisShopName = document.getElementById("analysisShopName");

if (analysisShopName) {

    const selectedShop = JSON.parse(localStorage.getItem("selectedShop"));

    if (!selectedShop) {
        window.location.href = "/dashboard-page";
    }

    document.getElementById("analysisShopName").textContent =
        `${selectedShop.shop_name} Analysis`;

    document.getElementById("analysisDate").textContent =
        new Date().toDateString();

    if (selectedShop.business_type === "service") {
        document.getElementById("analysisBackLink").href = "/service-shop-page";

        document.getElementById("summaryOneTitle").textContent = "Total Payments";
        document.getElementById("summaryThreeTitle").textContent = "Average Payment";

        document.getElementById("salesTrendBtn").textContent = "Income Trend";
        document.getElementById("topProductsBtn").textContent = "Top Services";
    } else {
        document.getElementById("summaryOneTitle").textContent = "Total Sales";
        document.getElementById("summaryThreeTitle").textContent = "Average Sale";

        document.getElementById("salesTrendBtn").textContent = "Sales Trend";
        document.getElementById("topProductsBtn").textContent = "Top Products";
    }

    let analysisData = null;
    let currentChart = null;

    loadAnalysis();

    async function loadAnalysis() {

        const predictionResponse = await fetch(
            `${API_BASE}/predictions?shop_id=${selectedShop.id}&business_type=${selectedShop.business_type || "product"}`
        );

        analysisData = await predictionResponse.json();

        document.getElementById("totalSales").textContent =
            analysisData.total_sales;

        document.getElementById("totalRevenue").textContent =
            `Ksh ${Number(analysisData.total_revenue).toFixed(2)}`;

        document.getElementById("averageSale").textContent =
            `Ksh ${Number(analysisData.average_sale).toFixed(2)}`;

        document.getElementById("predictionText").innerHTML =
            `Expected next amount is 
            <span class="prediction-highlight">
                Ksh ${Number(analysisData.predicted_next_sale_amount).toFixed(2)}
            </span>.
            <br>${analysisData.insight}`;

        drawSalesTrendChart();

        document.getElementById("salesTrendBtn").addEventListener("click", drawSalesTrendChart);
        document.getElementById("paymentMethodBtn").addEventListener("click", drawPaymentMethodChart);
        document.getElementById("topProductsBtn").addEventListener("click", drawTopProductsChart);
    }

    function setActiveButton(activeButtonId, title) {

        document.querySelectorAll(".chart-btn").forEach(button => {
            button.classList.remove("active-chart-btn");
        });

        document.getElementById(activeButtonId).classList.add("active-chart-btn");
        document.getElementById("chartTitle").textContent = title;
    }

    function resetChart() {
        if (currentChart) {
            currentChart.destroy();
        }
    }

    function drawSalesTrendChart() {

        const title =
            selectedShop.business_type === "service"
                ? "Service Income Trend"
                : "Sales Trend";

        setActiveButton("salesTrendBtn", title);
        resetChart();

        const chartCanvas = document.getElementById("analysisChart");

        const dailySales = analysisData.daily_sales || [];

        const labels = dailySales.map(item => {
            const date = new Date(item.sale_day);
            return date.toLocaleDateString("en-KE", {
                month: "short",
                day: "numeric"
            });
        });

        const totals = dailySales.map(item =>
            Number(item.daily_total)
        );

        currentChart = new Chart(chartCanvas, {
            type: "line",

            data: {
                labels: labels,

                datasets: [{
                    label: selectedShop.business_type === "service" ? "Daily Income" : "Daily Sales",
                    data: totals,
                    tension: 0.3,
                    fill: false
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                plugins: {
                    legend: {
                        display: true
                    }
                },

                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    function drawPaymentMethodChart() {

        setActiveButton("paymentMethodBtn", "Payment Method Breakdown");
        resetChart();

        const chartCanvas = document.getElementById("analysisChart");

        let paymentMethods = analysisData.payment_methods || [];

        if (paymentMethods.length === 0) {
            paymentMethods = [
                {
                    payment_method: "Recorded Sales",
                    total_amount: analysisData.total_revenue || 0
                }
            ];
        }

        const labels = paymentMethods.map(item => item.payment_method || "Unknown");

        const totals = paymentMethods.map(item =>
            Number(item.total_amount)
        );

        currentChart = new Chart(chartCanvas, {
            type: "bar",

            data: {
                labels: labels,

                datasets: [{
                    label: "Amount Received",
                    data: totals
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                plugins: {
                    legend: {
                        display: true
                    }
                },

                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    function drawTopProductsChart() {

        const title =
            selectedShop.business_type === "service"
                ? "Top Services"
                : "Top Selling Products";

        setActiveButton("topProductsBtn", title);
        resetChart();

        const chartCanvas = document.getElementById("analysisChart");

        const products = analysisData.best_selling_products || [];

        const labels = products.map(product => product.product_name);

        const quantities = products.map(product =>
            Number(product.total_quantity_sold)
        );

        currentChart = new Chart(chartCanvas, {
            type: "bar",

            data: {
                labels: labels,

                datasets: [{
                    label: selectedShop.business_type === "service" ? "Times Paid For" : "Quantity Sold",
                    data: quantities
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                plugins: {
                    legend: {
                        display: true
                    }
                },

                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

/*

profile page script

*/

const profileUserId = document.getElementById("profileUserId");

if (profileUserId) {

    const user = JSON.parse(localStorage.getItem("user"));

    if (!user) {
        window.location.href = "/";
    }

    document.getElementById("profileDate").textContent =
        new Date().toDateString();

    loadProfile();
    loadWorkerShops();
    loadWorkers();

    async function loadProfile() {

        const response = await fetch(`${API_BASE}/profile/${user.id}`);
        const data = await response.json();

        if (!response.ok) {
            alert(data.error || "Could not load profile");
            return;
        }

        document.getElementById("profileUserId").value = data.id;
        document.getElementById("profileName").value = data.name || "";
        document.getElementById("profileEmail").value = data.email || "";
        document.getElementById("profilePhone").value = data.phone || "";
        document.getElementById("profileCreatedAt").value =
            formatProfileDate(data.created_at);
    }

    async function loadWorkerShops() {

        const response = await fetch(`${API_BASE}/shops/${user.id}`);
        const shops = await response.json();

        const workerAssignedShop = document.getElementById("workerAssignedShop");

        if (!workerAssignedShop) return;

        workerAssignedShop.innerHTML = `
            <option value="">Select Assigned Shop</option>
        `;

        if (!Array.isArray(shops)) return;

        shops.forEach(shop => {
            const option = document.createElement("option");
            option.value = shop.id;
            option.textContent = shop.shop_name;
            workerAssignedShop.appendChild(option);
        });
    }

    async function loadWorkers() {

        const workersList = document.getElementById("workersList");

        if (!workersList) return;

        const response = await fetch(`${API_BASE}/workers/${user.id}`);
        const workers = await response.json();

        workersList.innerHTML = "";

        if (!Array.isArray(workers) || workers.length === 0) {
            workersList.innerHTML = `
                <div class="worker-item">
                    <div>No workers added yet</div>
                    <div>-</div>
                    <div>-</div>
                    <div>-</div>
                    <div>-</div>
                </div>
            `;
            return;
        }

        workers.forEach(worker => {

            const div = document.createElement("div");
            div.className = "worker-item";

            div.innerHTML = `
                <div>${worker.name}</div>
                <div>${worker.phone || "-"}</div>
                <div>${worker.shop_name || "No shop assigned"}</div>

                <div>
                    <button 
                        class="monitor-btn"
                        onclick="openWorkerMonitoring(${worker.id}, '${worker.name}')"
                    >
                        👁️
                    </button>
                </div>

                <div>
                    <button 
                        class="remove-worker-btn"
                        onclick="deleteWorker(${worker.id})"
                    >
                        Remove
                    </button>
                </div>
            `;

            workersList.appendChild(div);
        });
    }

    function formatProfileDate(dateValue) {
        const date = new Date(dateValue);

        return date.toLocaleDateString("en-KE", {
            year: "numeric",
            month: "long",
            day: "numeric"
        });
    }

    document.getElementById("updateProfileBtn")
        .addEventListener("click", async function () {

            const name = document.getElementById("profileName").value.trim();
            const email = document.getElementById("profileEmail").value.trim();
            const phone = document.getElementById("profilePhone").value.trim();

            if (!name || !email) {
                alert("Name and email are required");
                return;
            }

            const response = await fetch(`${API_BASE}/profile/${user.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: name,
                    email: email,
                    phone: phone
                })
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.error || "Profile could not be updated");
                return;
            }

            const updatedUser = {
                ...user,
                name: name,
                email: email,
                phone: phone
            };

            localStorage.setItem("user", JSON.stringify(updatedUser));

            alert("Profile updated successfully");
        });

    document.getElementById("logoutBtn")
        .addEventListener("click", function () {
            localStorage.removeItem("user");
            localStorage.removeItem("selectedShop");
            localStorage.removeItem("monitoringWorker");
            window.location.href = "/";
        });

    document.getElementById("showAddWorkerBtn")
        .addEventListener("click", function () {
            document.getElementById("addWorkerPopup").classList.remove("hidden");
        });

    document.getElementById("closeWorkerPopupBtn")
        .addEventListener("click", function () {
            document.getElementById("addWorkerPopup").classList.add("hidden");
        });

    document.getElementById("saveWorkerBtn")
        .addEventListener("click", async function () {

            const name = document.getElementById("workerName").value.trim();
            const email = document.getElementById("workerEmail").value.trim();
            const phone = document.getElementById("workerPhone").value.trim();
            const password = document.getElementById("workerPassword").value.trim();
            const assignedShopId = document.getElementById("workerAssignedShop").value;

            if (!name || !email || !password || !assignedShopId) {
                alert("Please fill worker name, email, password and assigned shop");
                return;
            }

            const response = await fetch(`${API_BASE}/workers`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    owner_id: user.id,
                    name: name,
                    email: email,
                    phone: phone,
                    password: password,
                    assigned_shop_id: assignedShopId
                })
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.error || "Worker could not be added");
                return;
            }

            alert("Worker added successfully");

            document.getElementById("workerName").value = "";
            document.getElementById("workerEmail").value = "";
            document.getElementById("workerPhone").value = "";
            document.getElementById("workerPassword").value = "";
            document.getElementById("workerAssignedShop").value = "";

            document.getElementById("addWorkerPopup").classList.add("hidden");

            loadWorkers();
        });

    window.deleteWorker = async function (workerId) {

        const confirmDelete = confirm(
            "Are you sure you want to remove this worker?"
        );

        if (!confirmDelete) return;

        const response = await fetch(`${API_BASE}/workers/${workerId}`, {
            method: "DELETE"
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || "Worker could not be removed");
            return;
        }

        alert("Worker removed successfully");
        loadWorkers();
    };

    window.openWorkerMonitoring = function (workerId, workerName) {

        localStorage.setItem(
            "monitoringWorker",
            JSON.stringify({
                id: workerId,
                name: workerName
            })
        );

        window.location.href = "/monitoring-page";
    };
}

/*

register page script

*/

const registerBtn = document.getElementById("registerBtn");

if (registerBtn) {

    registerBtn.addEventListener("click", async function () {

        const name = document.getElementById("registerName").value.trim();
        const email = document.getElementById("registerEmail").value.trim();
        const phone = document.getElementById("registerPhone").value.trim();
        const password = document.getElementById("registerPassword").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        if (!name || !email || !phone || !password || !confirmPassword) {
            alert("Please fill all fields");
            return;
        }

        if (password !== confirmPassword) {
            alert("Passwords do not match");
            return;
        }

        const response = await fetch(`${API_BASE}/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: name,
                email: email,
                phone: phone,
                password: password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || "Registration failed");
            return;
        }

        alert("Account created successfully. Please login.");

        window.location.href = "/";
    });
}

/*

service shop page script

*/

const serviceShopTitle = document.getElementById("serviceShopTitle");

if (serviceShopTitle) {

    const selectedShop = JSON.parse(localStorage.getItem("selectedShop"));

    if (!selectedShop) {
        window.location.href = "/dashboard-page";
    }

    serviceShopTitle.textContent = selectedShop.shop_name;

    const serviceCategory = selectedShop.service_category || "service";

    document.getElementById("serviceShopSubtitle").textContent =
        `${serviceCategory.charAt(0).toUpperCase() + serviceCategory.slice(1)} business menu`;

    document.getElementById("serviceShopDate").textContent =
        new Date().toDateString();

    const serviceFeatureGrid = document.getElementById("serviceFeatureGrid");

    if (serviceCategory === "bodaboda") {

        serviceFeatureGrid.innerHTML = `
            <a href="/trips-page" class="feature-card">
                🛵
                <span>Trips</span>
            </a>

            <a href="/payments-page" class="feature-card">
                💵
                <span>Payments</span>
            </a>

            <a href="/debts-page" class="feature-card">
                💰
                <span>Debts</span>
            </a>

            <a href="/alerts-page" class="feature-card">
                🔔
                <span>Alerts</span>
            </a>

            <a href="/reports-page" class="feature-card">
                📊
                <span>Analysis</span>
            </a>
        `;

    } else {

        serviceFeatureGrid.innerHTML = `
            <a href="/schedule-page" class="feature-card">
                📅
                <span>Schedule</span>
            </a>

            <a href="/payments-page" class="feature-card">
                💵
                <span>Payments</span>
            </a>

            <a href="/debts-page" class="feature-card">
                💰
                <span>Debts</span>
            </a>

            <a href="/alerts-page" class="feature-card">
                🔔
                <span>Alerts</span>
            </a>

            <a href="/reports-page" class="feature-card">
                📊
                <span>Analysis</span>
            </a>
        `;
    }
}

/*

schedule page script

*/

const scheduleList = document.getElementById("scheduleList");

if (scheduleList) {

    const selectedShop = JSON.parse(localStorage.getItem("selectedShop"));
    let allSchedule = [];

    if (!selectedShop) {
        window.location.href = "/dashboard-page";
    }

    document.getElementById("scheduleShopName").textContent =
        `${selectedShop.shop_name} Schedule`;

    document.getElementById("scheduleDate").textContent =
        new Date().toDateString();

    loadSchedule();

    async function loadSchedule() {
        const response = await fetch(`${API_BASE}/service-schedule/${selectedShop.id}`);
        const schedule = await response.json();

        allSchedule = schedule;
        displaySchedule(allSchedule);
    }

    function displaySchedule(scheduleItems) {
        scheduleList.innerHTML = "";

        if (scheduleItems.length === 0) {
            scheduleList.innerHTML = "<p>No schedule records found.</p>";
            return;
        }

        scheduleItems.forEach(item => {

            const div = document.createElement("div");
            div.className = "schedule-item";

            const paymentDiv = document.createElement("div");

            if (item.payment_status === "paid") {
                paymentDiv.innerHTML = `<span class="paid-status">Paid</span>`;
            } else if (item.payment_method === "debt") {
                paymentDiv.innerHTML = `<span class="pending-status">Debt</span>`;
            } else {
                const btn = document.createElement("button");
                btn.className = "choose-payment-btn";
                btn.textContent = "Choose Payment";

                btn.addEventListener("click", function () {
                    openChoosePaymentPopup(
                        item.id,
                        item.service_name,
                        item.customer_name,
                        item.price
                    );
                });

                paymentDiv.appendChild(btn);
            }

            div.innerHTML = `
                <div>${item.customer_name}</div>
                <div>${item.service_name}</div>
                <div>${formatScheduleDate(item.appointment_date)}</div>
                <div>${formatScheduleTime(item.appointment_time)}</div>
                <div>Ksh ${item.price}</div>
            `;

            div.appendChild(paymentDiv);
            scheduleList.appendChild(div);
        });
    }

    function formatScheduleDate(dateValue) {
        const date = new Date(dateValue);

        return date.toLocaleDateString("en-KE", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    }

    function formatScheduleTime(timeValue) {
        if (!timeValue) {
            return "";
        }

        return timeValue.toString().slice(0, 5);
    }

    document.getElementById("scheduleSearch")
        .addEventListener("input", function () {

        const searchTerm = this.value.toLowerCase();

        const filteredSchedule = allSchedule.filter(item =>
            item.customer_name.toLowerCase().includes(searchTerm) ||
            item.service_name.toLowerCase().includes(searchTerm)
        );

        displaySchedule(filteredSchedule);
    });

    document.getElementById("showAddScheduleBtn")
        .addEventListener("click", function () {
            document.getElementById("addSchedulePopup").classList.remove("hidden");
        });

    document.getElementById("closeSchedulePopupBtn")
        .addEventListener("click", function () {
            document.getElementById("addSchedulePopup").classList.add("hidden");
        });

    document.getElementById("saveScheduleBtn")
        .addEventListener("click", async function () {

        const customerName = document.getElementById("scheduleCustomerName").value;
        const serviceName = document.getElementById("scheduleServiceName").value;
        const appointmentDate = document.getElementById("scheduleAppointmentDate").value;
        const appointmentTime = document.getElementById("scheduleAppointmentTime").value;
        const price = document.getElementById("schedulePrice").value;

        if (!customerName || !serviceName || !appointmentDate || !appointmentTime || !price) {
            alert("Please fill all fields");
            return;
        }

        const response = await fetch(`${API_BASE}/service-schedule`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                shop_id: selectedShop.id,
                customer_name: customerName,
                service_name: serviceName,
                appointment_date: appointmentDate,
                appointment_time: appointmentTime,
                price: price
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || "Schedule could not be saved");
            return;
        }

        alert("Schedule added successfully");

        document.getElementById("scheduleCustomerName").value = "";
        document.getElementById("scheduleServiceName").value = "";
        document.getElementById("scheduleAppointmentDate").value = "";
        document.getElementById("scheduleAppointmentTime").value = "";
        document.getElementById("schedulePrice").value = "";

        document.getElementById("addSchedulePopup").classList.add("hidden");

        loadSchedule();
    });

    document.getElementById("closeChoosePaymentPopupBtn")
        .addEventListener("click", function () {
            document.getElementById("choosePaymentPopup").classList.add("hidden");
        });

    document.getElementById("closeMpesaPopupBtn")
        .addEventListener("click", function () {
            document.getElementById("mpesaPaymentPopup").classList.add("hidden");
        });

    document.getElementById("closeDebtPopupBtn")
        .addEventListener("click", function () {
            document.getElementById("debtPaymentPopup").classList.add("hidden");
        });

    document.getElementById("chooseCashBtn")
        .addEventListener("click", async function () {
            await payCash();
        });

    document.getElementById("chooseMpesaBtn")
        .addEventListener("click", function () {
            document.getElementById("choosePaymentPopup").classList.add("hidden");
            document.getElementById("mpesaPaymentPopup").classList.remove("hidden");
        });

    document.getElementById("chooseDebtBtn")
        .addEventListener("click", function () {
            document.getElementById("choosePaymentPopup").classList.add("hidden");
            document.getElementById("debtPaymentPopup").classList.remove("hidden");
        });

    document.getElementById("confirmMpesaPaymentBtn")
        .addEventListener("click", async function () {

        const phone = document.getElementById("mpesaPhoneNumber").value;

        if (!phone) {
            alert("Please enter customer phone number");
            return;
        }

        const response = await fetch(`${API_BASE}/mpesa-stk-push`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                schedule_id: document.getElementById("paymentScheduleId").value,
                shop_id: selectedShop.id,
                service_name: document.getElementById("paymentServiceName").value,
                customer_name: document.getElementById("paymentCustomerName").value,
                amount: document.getElementById("paymentAmount").value,
                phone: phone
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.log("M-PESA error:", data);
            alert(data.error || data.errorMessage || JSON.stringify(data));
            return;
        }

        alert("M-PESA prompt sent. Complete payment on phone.");

        document.getElementById("mpesaPhoneNumber").value = "";
        document.getElementById("mpesaPaymentPopup").classList.add("hidden");

        loadSchedule();
    });

    document.getElementById("confirmDebtBtn")
        .addEventListener("click", async function () {

        const dueDate = document.getElementById("serviceDebtDueDate").value;

        if (!dueDate) {
            alert("Please select debt due date");
            return;
        }

        const response = await fetch(`${API_BASE}/service-payment/debt`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                schedule_id: document.getElementById("paymentScheduleId").value,
                shop_id: selectedShop.id,
                customer_name: document.getElementById("paymentCustomerName").value,
                amount: document.getElementById("paymentAmount").value,
                due_date: dueDate
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || "Debt could not be recorded");
            return;
        }

        alert("Debt recorded");

        document.getElementById("serviceDebtDueDate").value = "";
        document.getElementById("debtPaymentPopup").classList.add("hidden");

        loadSchedule();
    });
}


function openChoosePaymentPopup(id, service, customer, amount) {
    document.getElementById("paymentScheduleId").value = id;
    document.getElementById("paymentServiceName").value = service;
    document.getElementById("paymentCustomerName").value = customer;
    document.getElementById("paymentAmount").value = amount;

    document.getElementById("choosePaymentPopup").classList.remove("hidden");
}


async function payCash() {
    const selectedShop = JSON.parse(localStorage.getItem("selectedShop"));

    const response = await fetch(`${API_BASE}/service-payment/cash`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            schedule_id: document.getElementById("paymentScheduleId").value,
            shop_id: selectedShop.id,
            service_name: document.getElementById("paymentServiceName").value,
            customer_name: document.getElementById("paymentCustomerName").value,
            amount: document.getElementById("paymentAmount").value
        })
    });

    const data = await response.json();

    if (!response.ok) {
        alert(data.error || "Cash payment could not be recorded");
        return;
    }

    alert("Cash payment recorded");

    document.getElementById("choosePaymentPopup").classList.add("hidden");

    location.reload();
}

/*

payments page script

*/

const paymentsList = document.getElementById("paymentsList");

if (paymentsList) {

    const selectedShop = JSON.parse(localStorage.getItem("selectedShop"));
    let allPayments = [];

    if (!selectedShop) {
        window.location.href = "/dashboard-page";
    }

    document.getElementById("paymentsShopName").textContent =
        `${selectedShop.shop_name} Payments`;

    document.getElementById("paymentsDate").textContent =
        new Date().toDateString();

    loadPayments();

    async function loadPayments() {
        const response = await fetch(`${API_BASE}/service-payments/${selectedShop.id}`);
        const payments = await response.json();

        allPayments = payments;
        displayPayments(allPayments);
    }

    function displayPayments(paymentItems) {
        paymentsList.innerHTML = "";

        if (paymentItems.length === 0) {
            paymentsList.innerHTML = "<p>No payments found.</p>";
            return;
        }

        paymentItems.forEach(payment => {

            const div = document.createElement("div");
            div.className = "payment-item";

            div.innerHTML = `
                <div>${payment.customer_name}</div>
                <div>${payment.service_name}</div>
                <div class="payment-amount">Ksh ${payment.amount}</div>
                <div class="payment-method">${payment.payment_method}</div>
                <div>${formatPaymentDate(payment.payment_date)}</div>
            `;

            paymentsList.appendChild(div);
        });
    }

    function formatPaymentDate(dateValue) {
        const date = new Date(dateValue);

        return date.toLocaleDateString("en-KE", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    }

    document.getElementById("paymentSearch")
        .addEventListener("input", function () {

        const searchTerm = this.value.toLowerCase();

        const filteredPayments = allPayments.filter(payment =>
            payment.customer_name.toLowerCase().includes(searchTerm) ||
            payment.service_name.toLowerCase().includes(searchTerm) ||
            payment.payment_method.toLowerCase().includes(searchTerm)
        );

        displayPayments(filteredPayments);
    });
}

/*

trips page script

*/

const tripsList = document.getElementById("tripsList");

if (tripsList) {

    const selectedShop = JSON.parse(localStorage.getItem("selectedShop"));
    let allTrips = [];

    if (!selectedShop) {
        window.location.href = "/dashboard-page";
    }

    document.getElementById("tripsShopName").textContent =
        `${selectedShop.shop_name} Trips`;

    document.getElementById("tripsDate").textContent =
        new Date().toDateString();

    loadTrips();

    async function loadTrips() {
        const response = await fetch(`${API_BASE}/service-trips/${selectedShop.id}`);
        const trips = await response.json();

        allTrips = trips;
        displayTrips(allTrips);
    }

    function displayTrips(tripItems) {
        tripsList.innerHTML = "";

        if (tripItems.length === 0) {
            tripsList.innerHTML = "<p>No trips found.</p>";
            return;
        }

        tripItems.forEach(trip => {
            const div = document.createElement("div");
            div.className = "trip-item";

            let paymentSection = "";

            if (trip.payment_status === "paid") {
                paymentSection = `<span class="paid-status">Paid</span>`;
            } else if (trip.payment_method === "debt") {
                paymentSection = `<span class="pending-status">Debt</span>`;
            } else {
                paymentSection = `
                    <button 
                        class="choose-payment-btn"
                        onclick="openTripPaymentPopup(
                            ${trip.id},
                            '${trip.customer_name}',
                            ${trip.total_price}
                        )"
                    >
                        Choose Payment
                    </button>
                `;
            }

            div.innerHTML = `
                <div>${trip.customer_name}</div>
                <div>${trip.destination}</div>
                <div>${trip.distance_km} KM</div>
                <div class="trip-price">Ksh ${trip.total_price}</div>
                <div>${paymentSection}</div>
            `;

            tripsList.appendChild(div);
        });
    }

    document.getElementById("tripSearch")
        .addEventListener("input", function () {

        const searchTerm = this.value.toLowerCase();

        const filteredTrips = allTrips.filter(trip =>
            trip.customer_name.toLowerCase().includes(searchTerm) ||
            trip.destination.toLowerCase().includes(searchTerm)
        );

        displayTrips(filteredTrips);
    });

    document.getElementById("showAddTripBtn")
        .addEventListener("click", function () {
            document.getElementById("addTripPopup").classList.remove("hidden");
        });

    document.getElementById("closeTripPopupBtn")
        .addEventListener("click", function () {
            document.getElementById("addTripPopup").classList.add("hidden");
        });

    document.getElementById("saveTripBtn")
        .addEventListener("click", async function () {

        const customerName = document.getElementById("tripCustomerName").value;
        const customerPhone = document.getElementById("tripCustomerPhone").value;
        const destination = document.getElementById("tripDestination").value;
        const distance = document.getElementById("tripDistance").value;
        const rate = document.getElementById("tripRate").value;

        if (!customerName || !destination || !distance || !rate) {
            alert("Please fill all required fields");
            return;
        }

        const response = await fetch(`${API_BASE}/service-trips`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                shop_id: selectedShop.id,
                customer_name: customerName,
                customer_phone: customerPhone,
                destination: destination,
                distance_km: distance,
                rate_per_km: rate
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || "Trip could not be saved");
            return;
        }

        alert(`Trip saved. Total price: Ksh ${data.total_price}`);

        document.getElementById("tripCustomerName").value = "";
        document.getElementById("tripCustomerPhone").value = "";
        document.getElementById("tripDestination").value = "";
        document.getElementById("tripDistance").value = "";
        document.getElementById("tripRate").value = "";

        document.getElementById("addTripPopup").classList.add("hidden");

        loadTrips();
    });

    document.getElementById("closeTripPaymentPopupBtn")
        .addEventListener("click", function () {
            document.getElementById("chooseTripPaymentPopup").classList.add("hidden");
        });

    document.getElementById("closeTripMpesaPopupBtn")
        .addEventListener("click", function () {
            document.getElementById("tripMpesaPopup").classList.add("hidden");
        });

    document.getElementById("closeTripDebtPopupBtn")
        .addEventListener("click", function () {
            document.getElementById("tripDebtPopup").classList.add("hidden");
        });

    document.getElementById("chooseTripCashBtn")
        .addEventListener("click", async function () {
            await payTripCash();
        });

    document.getElementById("chooseTripMpesaBtn")
        .addEventListener("click", function () {
            document.getElementById("chooseTripPaymentPopup").classList.add("hidden");
            document.getElementById("tripMpesaPopup").classList.remove("hidden");
        });

    document.getElementById("chooseTripDebtBtn")
        .addEventListener("click", function () {
            document.getElementById("chooseTripPaymentPopup").classList.add("hidden");
            document.getElementById("tripDebtPopup").classList.remove("hidden");
        });

    document.getElementById("confirmTripMpesaBtn")
    .addEventListener("click", async function () {

    const phone = document.getElementById("tripMpesaPhoneNumber").value;

    if (!phone) {
        alert("Please enter customer phone number");
        return;
    }

    const selectedShop = JSON.parse(localStorage.getItem("selectedShop"));

    const response = await fetch(`${API_BASE}/mpesa-stk-push`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            payment_type: "trip",
            trip_id: document.getElementById("tripPaymentId").value,
            shop_id: selectedShop.id,
            customer_name: document.getElementById("tripPaymentCustomerName").value,
            service_name: "Bodaboda Trip",
            amount: document.getElementById("tripPaymentAmount").value,
            phone: phone
        })
    });

    const data = await response.json();

    if (!response.ok) {
        console.log("Trip M-PESA error:", data);
        alert(data.error || data.errorMessage || JSON.stringify(data));
        return;
    }

    alert("M-PESA prompt sent. Complete payment on phone.");

    document.getElementById("tripMpesaPhoneNumber").value = "";
    document.getElementById("tripMpesaPopup").classList.add("hidden");

    loadTrips();
});

    document.getElementById("confirmTripDebtBtn")
        .addEventListener("click", async function () {

        const dueDate = document.getElementById("tripDebtDueDate").value;

        if (!dueDate) {
            alert("Please select debt due date");
            return;
        }

        const selectedShop = JSON.parse(localStorage.getItem("selectedShop"));

        const response = await fetch(`${API_BASE}/trip-payment/debt`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                trip_id: document.getElementById("tripPaymentId").value,
                shop_id: selectedShop.id,
                customer_name: document.getElementById("tripPaymentCustomerName").value,
                amount: document.getElementById("tripPaymentAmount").value,
                due_date: dueDate
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || "Trip debt could not be recorded");
            return;
        }

        alert("Trip debt recorded");

        document.getElementById("tripDebtDueDate").value = "";
        document.getElementById("tripDebtPopup").classList.add("hidden");

        loadTrips();
    });
}


function openTripPaymentPopup(tripId, customerName, amount) {
    document.getElementById("tripPaymentId").value = tripId;
    document.getElementById("tripPaymentCustomerName").value = customerName;
    document.getElementById("tripPaymentAmount").value = amount;

    document.getElementById("chooseTripPaymentPopup").classList.remove("hidden");
}


async function payTripCash() {
    const selectedShop = JSON.parse(localStorage.getItem("selectedShop"));

    const response = await fetch(`${API_BASE}/trip-payment/cash`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            trip_id: document.getElementById("tripPaymentId").value,
            shop_id: selectedShop.id,
            customer_name: document.getElementById("tripPaymentCustomerName").value,
            amount: document.getElementById("tripPaymentAmount").value
        })
    });

    const data = await response.json();

    if (!response.ok) {
        alert(data.error || "Cash payment could not be recorded");
        return;
    }

    alert("Cash payment recorded");

    document.getElementById("chooseTripPaymentPopup").classList.add("hidden");

    location.reload();
}

/*

monitoring page script

*/

const monitoringList =
    document.getElementById("monitoringList");

if (monitoringList) {

    const worker =
        JSON.parse(
            localStorage.getItem("monitoringWorker")
        );

    if (!worker) {
        window.location.href = "/profile-page";
    }

    document.getElementById(
        "monitoringWorkerName"
    ).textContent =
        `${worker.name} Activity`;

    document.getElementById(
        "monitoringDate"
    ).textContent =
        new Date().toDateString();

    loadWorkerActivity();

    async function loadWorkerActivity() {

        const response = await fetch(
            `${API_BASE}/activity/${worker.id}`
        );

        const logs = await response.json();

        monitoringList.innerHTML = "";

        if (!logs.length) {

            monitoringList.innerHTML =
                "<p>No activity recorded yet.</p>";

            return;
        }

        logs.forEach(log => {

            const div = document.createElement("div");

            div.className = "activity-item";

            div.innerHTML = `
                <div>${log.action}</div>
                <div>${log.shop_name || "-"}</div>
                <div>
                    ${new Date(log.created_at)
                        .toLocaleString("en-KE")}
                </div>
            `;

            monitoringList.appendChild(div);
        });
    }
}