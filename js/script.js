$(function () {
    // ============================================================
    // General page setup
    // ============================================================

    document.documentElement.classList.add("js-ready");

    var page = location.pathname.split("/").pop() || "index.html";

    $(".nav-link[data-page]").each(function () {
        if ($(this).data("page") === page) {
            $(this).addClass("active");
        }
    });

    // ============================================================
    // Scroll reveal animation
    // ============================================================

    function reveal() {
        $(".reveal").each(function () {
            if (this.getBoundingClientRect().top < innerHeight - 40) {
                $(this).addClass("show");
            }
        });
    }

    reveal();
    $(window).on("scroll", reveal);

    // ============================================================
    // Toast messages
    // ============================================================

    window.showToast = function (message, type) {
        // Use the browser's native alert so the message is visible even if
        // Bootstrap Toast styling/JavaScript is unavailable.
        window.alert(message);

        // Also update the site's toast in case Bootstrap is working.
        var toast = $("#etelToast");
        if (toast.length && window.bootstrap && bootstrap.Toast) {
            toast
                .removeClass("text-bg-success text-bg-danger")
                .addClass(type === "error" ? "text-bg-danger" : "text-bg-success");
            toast.find(".toast-body").text(message);
            try {
                bootstrap.Toast.getOrCreateInstance(toast[0], { delay: 2800 }).show();
            } catch (error) {
                // The native alert above has already shown the message.
            }
        }
    };

    // ============================================================
    // Shopping cart helpers
    // ============================================================

    function getCart() {
        try {
            var cart = JSON.parse(localStorage.getItem("etelCartItems") || "[]");
            return Array.isArray(cart) ? cart : [];
        } catch (error) {
            return [];
        }
    }

    function saveCart(cart) {
        localStorage.setItem("etelCartItems", JSON.stringify(cart));

        // The badge shows the total number of units, not only unique products.
        var totalQty = cart.reduce(function (sum, item) {
            return sum + (Number(item.qty) || 0);
        }, 0);

        $(".cart-count").text(totalQty);
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    saveCart(getCart());

    // ============================================================
    // Quantity control on every product in details.html
    // ============================================================

    $(document).on("click", ".qty-change", function (event) {
        event.preventDefault();
        event.stopPropagation();

        // IMPORTANT: only change the counter inside the exact purchase row
        // whose + or - button was clicked. Never search the whole product card.
        var row = $(this).closest(".purchase-row");
        var quantity = row.find(".productQty").first();
        if (!quantity.length) return;

        var current = parseInt(quantity.text(), 10);
        if (!Number.isFinite(current) || current < 1) current = 1;

        // Read the intended direction from the clicked button.
        var stepText = String($(this).attr("data-step") || "");
        var step = stepText === "-1" ? -1 : 1;
        var next = current + step;

        // Keep the quantity in the safe range 1..99.
        next = Math.max(1, Math.min(99, next));
        quantity.text(String(next));
    });

    // ============================================================
    // Add a product to the cart from ANY page
    // ============================================================

    $(document).on("click", ".add-cart", function () {
        var button = $(this);
        var cart = getCart();
        var name = String(button.data("name") || "").trim();
        var price = Number(button.data("price") || 0);
        var image = String(button.data("image") || "").trim();
        var qty = 1;
        var extra = {
            sku: String(button.data("sku") || "").trim(),
            screen: String(button.data("screen") || "").trim(),
            ram: String(button.data("ram") || "").trim(),
            storage: String(button.data("storage") || "").trim(),
            os: String(button.data("os") || "").trim()
        };

        // If this is a product from details.html, collect its exact quantity
        // and fill in any product information that was not explicitly supplied
        // on the button. Explicit data-* values have priority, which allows
        // different storage variants of the same phone to have different prices.
        var detail = button.closest(".product-detail-hero");
        if (detail.length) {
            // Read the quantity from the same purchase row as this Add to Cart button.
            // This keeps the $131 and $114 variants completely independent.
            var purchaseRow = button.closest(".purchase-row");
            qty = parseInt(purchaseRow.find(".productQty").first().text(), 10);
            if (!Number.isFinite(qty) || qty < 1) qty = 1;
            image = image || String(detail.find("#mainProductImage").first().attr("src") || "");

            var ratingLine = detail.find(".rating-line").first();
            var skuText = ratingLine.find("span").last().text().trim();
            extra.sku = extra.sku || skuText.replace(/^رقم المنتج:\s*/i, "");

            var specs = detail.find(".quick-specs > div");
            specs.each(function () {
                var label = $(this).find("b").first().text().trim();
                var value = $(this).find("span").first().text().trim();
                if (label === "الشاشة" && !extra.screen) extra.screen = value;
                if (label === "الذاكرة" && !extra.ram) extra.ram = value;
                if (label === "التخزين" && !extra.storage) extra.storage = value;
                if (label === "النظام" && !extra.os) extra.os = value;
            });
        }

        if (!name || !price || !image) {
            return showToast("بيانات المنتج غير مكتملة.", "error");
        }

        qty = Math.max(1, Math.min(99, qty));

        // Each storage/RAM/colour combination is treated as a separate
        // product variant. This prevents, for example, $131/256GB from
        // being merged with $114/128GB even though both are ETEL E64.
        var variantId = String(button.data("variant-id") || "").trim();
        if (!variantId) {
            variantId = [name, price, extra.ram, extra.storage, extra.screen, extra.os]
                .filter(Boolean)
                .join("|");
        }

        // Give older cart records a comparable variant ID before matching.
        cart.forEach(function (item) {
            if (!item.variantId) {
                item.variantId = [
                    item.name, item.price, item.ram, item.storage, item.screen, item.os
                ].filter(Boolean).join("|");
            }
        });

        var found = cart.find(function (item) {
            return item.variantId === variantId;
        });

        if (found) {
            // Keep the newest correct product information even if an older
            // version of the cart was saved before this fix.
            found.price = price;
            found.image = image;
            found.qty = (Number(found.qty) || 0) + qty;
            Object.keys(extra).forEach(function (key) {
                if (extra[key]) found[key] = extra[key];
            });
        } else {
            cart.push({
                variantId: variantId,
                name: name,
                price: price,
                image: image,
                qty: qty,
                sku: extra.sku || "",
                screen: extra.screen || "",
                ram: extra.ram || "",
                storage: extra.storage || "",
                os: extra.os || ""
            });
        }

        saveCart(cart);
        showToast("تمت إضافة " + qty + " من " + name + " إلى السلة بنجاح.");

        // Reset ONLY the quantity control used for this exact variant.
        if (detail.length) {
            button.closest(".purchase-row").find(".productQty").first().text("1");
        }
    });

    // ============================================================
    // Draw the cart page
    // ============================================================

    function renderCart() {
        var list = $("#cartItems");

        if (!list.length) {
            return;
        }

        var cart = getCart();
        $("#cartLayout").toggleClass("d-none", !cart.length);
        $("#emptyCart").toggleClass("d-none", !!cart.length);
        list.empty();

        var subtotal = 0;

        cart.forEach(function (item, index) {
            var price = Number(item.price) || 0;
            var qty = Math.max(1, Number(item.qty) || 1);
            subtotal += price * qty;

            var specs = [item.screen, item.ram, item.storage, item.os]
                .filter(Boolean)
                .join(" · ");

            list.append(
                '<div class="cart-item">' +
                    '<img src="' + escapeHtml(item.image || "../images/etel-e68.png") + '" alt="' + escapeHtml(item.name) + '">' +
                    '<div>' +
                        '<h4>' + escapeHtml(item.name) + '</h4>' +
                        '<div class="muted">$' + price + ' للقطعة · الكمية: ' + qty + '</div>' +
                        (item.sku ? '<div class="small muted">رقم المنتج: ' + escapeHtml(item.sku) + '</div>' : '') +
                        (specs ? '<div class="small muted">' + escapeHtml(specs) + '</div>' : '') +
                    '</div>' +
                    '<div class="cart-actions">' +
                        '<button class="qty-btn qty-minus" data-i="' + index + '">−</button>' +
                        '<b>' + qty + '</b>' +
                        '<button class="qty-btn qty-plus" data-i="' + index + '">+</button>' +
                        '<button class="delete-cart" data-i="' + index + '" title="حذف">' +
                            '<svg class="menu-icon" viewBox="0 0 24 24">' +
                                '<path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/>' +
                            '</svg>' +
                        '</button>' +
                    '</div>' +
                '</div>'
            );
        });

        $("#cartSubtotal").text("$" + subtotal);
        $("#cartTotal").text("$" + subtotal);

        saveCart(cart);
    }

    renderCart();

    // Change quantity or remove an item.
    $(document).on("click", ".qty-plus, .qty-minus, .delete-cart", function () {
        var cart = getCart();
        var index = Number($(this).data("i"));

        if (!cart[index]) {
            return;
        }

        if ($(this).hasClass("qty-plus")) {
            cart[index].qty = (Number(cart[index].qty) || 1) + 1;
        } else if ($(this).hasClass("qty-minus")) {
            cart[index].qty = (Number(cart[index].qty) || 1) - 1;

            if (cart[index].qty < 1) {
                cart.splice(index, 1);
            }
        } else {
            cart.splice(index, 1);
        }

        saveCart(cart);
        renderCart();
    });

    // ============================================================
    // Checkout
    // ============================================================

    $("#checkoutBtn").on("click", function () {
        if (!getCart().length) {
            return showToast("السلة فارغة.", "error");
        }

        bootstrap.Modal.getOrCreateInstance($("#checkoutModal")[0]).show();
    });

    $("#checkoutForm").on("submit", function (event) {
        event.preventDefault();

        localStorage.setItem(
            "etelLastOrder",
            JSON.stringify({
                name: $("#orderName").val(),
                phone: $("#orderPhone").val(),
                address: $("#orderAddress").val(),
                items: getCart()
            })
        );

        localStorage.removeItem("etelCartItems");
        saveCart([]);
        renderCart();
        bootstrap.Modal.getInstance($("#checkoutModal")[0]).hide();
        showToast("تم استلام طلبك بنجاح. سنتواصل معك لتأكيد التوصيل.");
    });

    // ============================================================
    // Product search and brand filter
    // ============================================================

    $("#productSearch, #brandFilter").on("input change", function () {
        var query = $("#productSearch").val().toLowerCase();
        var brand = $("#brandFilter").val();
        var visible = 0;

        $("#productGrid .product-card").each(function () {
            var text = $(this).text().toLowerCase();
            var matchesQuery = !query || text.includes(query);
            var matchesBrand = !brand || text.includes(brand.toLowerCase());
            var visibleCard = matchesQuery && matchesBrand;

            $(this)
                .closest(".col-md-6, .col-lg-3")
                .toggle(visibleCard);

            if (visibleCard) {
                visible++;
            }
        });

        $("#noProducts").toggleClass("d-none", visible > 0);
    });

    // ============================================================
    // Account: create a new account
    // ============================================================

    $("#signupForm").on("submit", function (event) {
        event.preventDefault();

        var name = $("#signupName").val().trim();
        var email = $("#signupEmail").val().trim().toLowerCase();
        var phone = $("#signupPhone").val().trim();
        var password = $("#signupPass").val();
        var confirmPassword = $("#signupConfirm").val();

        if (name.length < 3) {
            return showToast("اكتب اسمًا صحيحًا.", "error");
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return showToast("البريد الإلكتروني غير صحيح.", "error");
        }

        if (!/^\d{9}$/.test(phone)) {
            return showToast("رقم الهاتف يجب أن يحتوي على 9 أرقام.", "error");
        }

        if (password.length < 6) {
            return showToast("كلمة المرور يجب أن تكون 6 أحرف على الأقل.", "error");
        }

        if (password !== confirmPassword) {
            return showToast("تأكيد كلمة المرور غير مطابق.", "error");
        }

        localStorage.setItem(
            "etelUser",
            JSON.stringify({
                name: name,
                email: email,
                phone: phone,
                password: password
            })
        );

        $("#loginEmail").val(email);
        this.reset();
        showToast("تم إنشاء الحساب بنجاح. يمكنك الآن تسجيل الدخول.");
    });

    // ============================================================
    // Account: login
    // ============================================================

    $("#loginForm").on("submit", function (event) {
        event.preventDefault();

        var email = $("#loginEmail").val().trim().toLowerCase();
        var password = $("#loginPass").val();
        var user = JSON.parse(localStorage.getItem("etelUser") || "null");

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return showToast("البريد الإلكتروني غير صحيح.", "error");
        }

        if (!user) {
            return showToast("لا يوجد حساب مسجل. أنشئ حسابًا أولًا.", "error");
        }

        if (email !== user.email) {
            return showToast("البريد الإلكتروني غير صحيح أو غير مسجل.", "error");
        }

        if (password !== user.password) {
            return showToast("كلمة المرور غير صحيحة.", "error");
        }

        localStorage.setItem("etelLoggedIn", "true");
        this.reset();
        showToast("تم تسجيل الدخول بنجاح، أهلاً بك " + user.name + ".");
    });

    // ============================================================
    // Contact form
    // ============================================================

    $("#contactForm").on("submit", function (event) {
        event.preventDefault();

        var name = $("#contactName").val().trim();
        var email = $("#contactEmail").val().trim();
        var message = $("#contactMessage").val().trim();

        if (
            name.length < 3 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
            message.length < 10
        ) {
            return showToast("تحقق من بيانات نموذج التواصل.", "error");
        }

        this.reset();
        showToast("تم إرسال رسالتك بنجاح.");
    });
});