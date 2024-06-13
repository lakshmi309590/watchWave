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
        if (req.body.isSingle === "true") {
            // Single product order handling
        } else {
            console.log("from cart");
            const { addressId, payment } = req.body;
            const userId = req.session.user;
            const findUser = await User.findOne({ _id: userId });
            const productIds = findUser.cart.map(item => item.productId);

            const findAddress = await Address.findOne({ 'address._id': addressId });

            if (findAddress) {
                const desiredAddress = findAddress.address.find(item => item._id.toString() === addressId.toString());
                const findProducts = await Product.find({ _id: { $in: productIds } });
                const cartItemQuantities = findUser.cart.map((item) => ({
                    productId: item.productId,
                    quantity: item.quantity
                }));
                console.log(cartItemQuantities, "cartItemQuantities");

                // Calculate total price based on selected quantities and product prices
                let grandTotal = 0;
                const orderedProducts = findProducts.map((item, index) => {
                    const quantity = cartItemQuantities.find(cartItem => cartItem.productId.toString() === item._id.toString()).quantity;
                    const totalItemPrice = item.salePrice * quantity;
                    grandTotal += totalItemPrice; // Add to grand total
                    return {
                        _id: item._id,
                        price: item.salePrice,
                        name: item.productName,
                        image: item.productImage[0],
                        quantity: quantity,
                        orderIndex: index, // Ensure order is preserved
                        totalItemPrice: totalItemPrice // Total price for each product in the order
                    };
                });

                const newOrder = new Order({
                    product: orderedProducts,
                    totalPrice: grandTotal, // Set calculated grand total
                    address: desiredAddress,
                    payment: payment,
                    userId: userId,
                    status: "Confirmed",
                    createdOn: Date.now()
                });

                await User.updateOne(
                    { _id: userId },
                    { $set: { cart: [] } }
                );

                for (let i = 0; i < orderedProducts.length; i++) {
                    const product = await Product.findOne({ _id: orderedProducts[i]._id });
                    if (product) {
                        const newQuantity = product.quantity - orderedProducts[i].quantity;
                        product.quantity = Math.max(newQuantity, 0);
                        await product.save();
                    }
                }

                let orderDone;
                if (newOrder.payment == 'cod') {
                    console.log('order placed by cod');
                    orderDone = await newOrder.save();
                    res.json({ payment: true, method: "cod", order: orderDone, quantity: cartItemQuantities, orderId: findUser });
                } 
            } else {
                console.log('Address not found');
            }
        }
    } catch (error) {
        console.log(error.message);
    }
};


const getOrderDetailsPage = async (req, res) => {
    try {
        const userId = req.session.user;
        const orderId = req.query.id;
        const findOrder = await Order.findOne({ _id: orderId });

        if (!findOrder) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const sortedProducts = findOrder.product.sort((a, b) => a.orderIndex - b.orderIndex);

        const findUser = await User.findOne({ _id: userId });
        console.log(findOrder, findUser);
        res.render("user/orderDetails", { orders: { ...findOrder._doc, product: sortedProducts }, user: findUser, orderId });
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
        const userId = req.session.user;
        const findUser = await User.findOne({ _id: userId });

        if (!findUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        const orderId = req.query.orderId;
        const order = await Order.findOne({ _id: orderId });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Update order status to "Canceled"
        order.status = "Canceled";
        await order.save();

        // Refund to wallet if applicable
        if (order.payment === "wallet" || order.payment === "online") {
            findUser.wallet += order.totalPrice;
            findUser.history.push({
                amount: order.totalPrice,
                status: "credit",
                date: Date.now()
            });
            await findUser.save();
        }

        // Update product quantities
        for (const productData of order.product) {
            const productId = productData._id; // Corrected from productData.ProductId to productData._id
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
        res.status(500).json({ message: 'An error occurred while cancelling the order' });
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