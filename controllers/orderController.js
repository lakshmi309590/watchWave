const User = require("../models/userSchema");
const Product = require("../models/productSchema");
const Address = require("../models/addressSchema");
const Order = require("../models/orderSchema");
const invoice = require("../helpers/invoice");
const mongodb = require("mongodb");

const getCheckoutPage = async (req, res) => {
    try {
        console.log("queryyyyyyyy", req.query);
        const userId = req.session.user;

        if (req.query.isSingle == "true") {
            const id = req.query.id;
            const findProduct = await Product.find({ id: id }).lean();
            const findUser = await User.findOne({ _id: userId });
            const addressData = await Address.findOne({ userId: userId });
            console.log("THis is find product =>", findProduct);

            res.render("user/checkout", { product: findProduct, user: userId, findUser: findUser, userAddress: addressData, isSingle: true });
        } else {
            const user = req.query.userId;
            const findUser = await User.findOne({ _id: user });

            // Check if the cart is empty
            if (!findUser.cart.length) {
                console.log('Cart is empty');
                return res.redirect('/cart'); // Redirect to cart page if cart is empty
            }

            const addressData = await Address.findOne({ userId: user });
            const oid = new mongodb.ObjectId(user);
            const data = await User.aggregate([
                { $match: { _id: oid } },
                { $unwind: "$cart" },
                {
                    $project: {
                        proId: { '$toObjectId': '$cart.productId' },
                        quantity: "$cart.quantity"
                    }
                },
                {
                    $lookup: {
                        from: 'products',
                        localField: 'proId',
                        foreignField: '_id',
                        as: 'productDetails'
                    }
                },
            ]);

            const grandTotal = req.session.grandTotal;

            res.render("user/checkout", { data: data, user: findUser, isCart: true, userAddress: addressData, isSingle: false, grandTotal });
        }

    } catch (error) {
        console.log(error.message);
    }
};

const orderPlaced = async (req, res) => {
    try {
        console.log("req.body================>", req.body);
        const userId = req.session.user;
        const findUser = await User.findOne({ _id: userId });

        if (!findUser.cart.length) {
            console.log('Cart is empty');
            return res.json({ success: false, message: "Cart is empty" });
        }

        const { totalPrice, addressId, payment, productId } = req.body;
        const address = await Address.findOne({ userId: userId });
        const findAddress = address.address.find(item => item._id.toString() === addressId);
        const findProduct = await Product.findOne({ _id: productId });

        const productDetails = {
            _id: findProduct._id,
            price: findProduct.salePrice,
            name: findProduct.productName,
            image: findProduct.productImage[0],
            quantity: 1
        };

        const newOrder = new Order({
            product: productDetails,
            totalPrice: totalPrice,
            address: findAddress,
            payment: payment,
            userId: userId,
            createdOn: Date.now(),
            status: "Confirmed",
        });

        findProduct.quantity -= 1;
        await findProduct.save();
        await newOrder.save();

        // Clear the cart after placing the order
        await User.updateOne({ _id: userId }, { $set: { cart: [] } });
        console.log('Order placed and cart cleared');
        
        // Respond with success message and redirect URL
        res.json({ success: true, message: "Order placed successfully!", redirect: "/cart" });

    } catch (error) {
        console.log("Error placing order:", error.message);
        res.json({ success: false, message: "Internal Server Error" });
    }
};

const getOrderDetailsPage = async (req, res) => {
    try {
        const userId = req.session.user;
        const orderId = req.query.id;
        const findOrder = await Order.findOne({ _id: orderId });
        const findUser = await User.findOne({ _id: userId });
        console.log(findOrder, findUser);
        res.render("user/orderDetails", { orders: findOrder, user: findUser, orderId });
    } catch (error) {
        console.log(error.message);
    }
};

const getOrderListPageAdmin = async (req, res) => {
    try {
        const orders = await Order.find({}).sort({ createdOn: -1 });

        let itemsPerPage = 5;
        let currentPage = parseInt(req.query.page) || 1;
        let startIndex = (currentPage - 1) * itemsPerPage;
        let endIndex = startIndex + itemsPerPage;
        let totalPages = Math.ceil(orders.length / 3);
        const currentOrder = orders.slice(startIndex, endIndex);

        res.render("admin/orders-list", { orders: currentOrder, totalPages, currentPage });
    } catch (error) {
        console.log(error.message);
    }
};

const cancelOrder = async (req, res) => {
    try {
        console.log("im here");
        const userId = req.session.user;
        const findUser = await User.findOne({ _id: userId });

        if (!findUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        const orderId = req.query.orderId;

        await Order.updateOne({ _id: orderId },
            { status: "Canceled" }
        ).then((data) => console.log(data));

        const findOrder = await Order.findOne({ _id: orderId });

        if (findOrder.payment === "wallet" || findOrder.payment === "online") {
            findUser.wallet += findOrder.totalPrice;

            const newHistory = {
                amount: findOrder.totalPrice,
                status: "credit",
                date: Date.now()
            };
            findUser.history.push(newHistory);
            await findUser.save();
        }

        for (const productData of findOrder.product) {
            const productId = productData.ProductId;
            const quantity = productData.quantity;

            const product = await Product.findById(productId);

            console.log(product, "=>>>>>>>>>");

            if (product) {
                product.quantity += quantity;
                await product.save();
            }
        }

        res.redirect('/profile');

    } catch (error) {
        console.log(error.message);
    }
};

const changeOrderStatus = async (req, res) => {
    try {
        console.log(req.query);

        const orderId = req.query.orderId;
        console.log(orderId);

        await Order.updateOne({ _id: orderId },
            { status: req.query.status }
        ).then((data) => console.log(data));

        res.redirect('/admin/orderList');

    } catch (error) {
        console.log(error.message);
    }
};

const getCartCheckoutPage = async (req, res) => {
    try {
        res.render("checkoutCart");
    } catch (error) {
        console.log(error.message);
    }
};

const returnOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        const findUser = await User.findOne({ _id: userId });

        if (!findUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        const id = req.query.id;
        await Order.updateOne({ _id: id },
            { status: "Returned" }
        ).then((data) => console.log(data));

        const findOrder = await Order.findOne({ _id: id });

        if (findOrder.payment === "wallet" || findOrder.payment === "online") {
            findUser.wallet += findOrder.totalPrice;

            const newHistory = {
                amount: findOrder.totalPrice,
                status: "credit",
                date: Date.now()
            };
            findUser.history.push(newHistory);
            await findUser.save();
        }

        for (const productData of findOrder.product) {
            const productId = productData.ProductId;
            const quantity = productData.quantity;

            const product = await Product.findById(productId);

            if (product) {
                product.quantity += quantity;
                await product.save();
            }
        }

        res.redirect('/profile');

    } catch (error) {
        console.log(error.message);
    }
};

const getOrderDetailsPageAdmin = async (req, res) => {
    try {
        const orderId = req.query.id;
        const findOrder = await Order.findOne({ _id: orderId }).sort({ createdOn: 1 });

        res.render("admin/order-details-admin", { orders: findOrder, orderId });
    } catch (error) {
        console.log(error.message);
    }
};

const getInvoice = async (req, res) => {
    try {
        console.log("helloooo");
        await invoice.invoice(req, res);
    } catch (error) {
        console.log(error.message);
    }
};

module.exports = {
    getCheckoutPage,
    orderPlaced,
    changeOrderStatus,
    getOrderDetailsPage,
    getOrderListPageAdmin,
    cancelOrder,
    returnOrder,
    getCartCheckoutPage,
    getOrderDetailsPageAdmin,
    getInvoice
}