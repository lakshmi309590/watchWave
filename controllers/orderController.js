const User = require("../models/userSchema");
const Product = require("../models/productSchema");
const Address = require("../models/addressSchema");
const Order = require("../models/orderSchema");
const Coupon = require("../models/couponSchema");
const razorpay = require("razorpay");
const invoice = require("../helpers/invoice");
const mongodb = require("mongodb");
const crypto = require("crypto");

const instance = new razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const getCheckoutPage = async (req, res) => {
    try {
        const userId = req.session.user;

        if (req.query.isSingle === "true") {
            const id = req.query.id;
            const findProduct = await Product.find({ id: id }).lean();
            const findUser = await User.findOne({ _id: userId });
            const addressData = await Address.findOne({ userId: userId });
            const today = new Date().toISOString();

            const findCoupons = await Coupon.find({
                isList: true,
                createdOn: { $lt: new Date(today) },
                expireOn: { $gt: new Date(today) },
                minimumPrice: { $lt: findProduct[0].salePrice }
            });

            res.render("user/checkout", {
                product: findProduct,
                user: userId,
                findUser: findUser,
                userAddress: addressData,
                isSingle: true,
                coupons: findCoupons
            });
        } else {
            const user = req.query.userId;
            const findUser = await User.findOne({ _id: user });

            if (!findUser.cart.length) {
                return res.redirect('/cart');
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
                }
            ]);

            const grandTotal = req.session.grandTotal;
            const today = new Date().toISOString();

            const findCoupons = await Coupon.find({
                isList: true,
                createdOn: { $lt: new Date(today) },
                expireOn: { $gt: new Date(today) },
                minimumPrice: { $lt: grandTotal }
            });

            res.render("user/checkout", {
                data: data,
                user: findUser,
                isCart: true,
                userAddress: addressData,
                isSingle: false,
                grandTotal,
                coupons: findCoupons
            });
        }
    } catch (error) {
        console.error(error.message);
    }
};

const orderPlaced = async (req, res) => {
    try {
        const { addressId, payment, couponId, totalPrice } = req.body;
        const userId = req.session.user;
        const findUser = await User.findOne({ _id: userId });

        if (req.body.isSingle === "true") {
            // Handle single product order
        } else {
            const productIds = findUser.cart.map(item => item.productId);
            const findAddress = await Address.findOne({ 'address._id': addressId });

            if (!findAddress) {
                return res.status(404).json({ message: 'Address not found' });
            }

            const desiredAddress = findAddress.address.find(item => item._id.toString() === addressId.toString());
            const findProducts = await Product.find({ _id: { $in: productIds } });

            let grandTotal = 0;
            const orderedProducts = findProducts.map((item, index) => {
                const quantity = findUser.cart.find(cartItem => cartItem.productId.toString() === item._id.toString()).quantity;
                const totalItemPrice = item.salePrice * quantity;
                grandTotal += totalItemPrice;
                return {
                    _id: item._id,
                    price: item.salePrice,
                    name: item.productName,
                    image: item.productImage[0],
                    quantity: quantity,
                    orderIndex: index,
                    totalItemPrice: totalItemPrice
                };
            });

            let couponDiscount = 0;
            if (couponId) {
                const coupon = await Coupon.findOne({ _id: couponId });
                if (coupon) {
                    couponDiscount = coupon.offerPrice;
                    grandTotal -= couponDiscount;
                }
            }

            const newOrder = new Order({
                product: orderedProducts,
                totalPrice: totalPrice || grandTotal,
                address: desiredAddress,
                payment: payment,
                userId: userId,
                status: "Confirmed",
                createdOn: Date.now(),
                couponDiscount: couponDiscount
            });

            await User.updateOne(
                { _id: userId },
                { $set: { cart: [] } }
            );

            for (let i = 0; i < orderedProducts.length; i++) {
                const product = await Product.findOne({ _id: orderedProducts[i]._id });
                if (product) {
                    product.quantity = Math.max(product.quantity - orderedProducts[i].quantity, 0);
                    await product.save();
                }
            }

            if (newOrder.payment === 'cod') {
                const orderDone = await newOrder.save();
                res.json({ payment: true, method: "cod", order: orderDone, orderId: findUser._id });
            } else if (newOrder.payment === 'online') {
                const orderDone = await newOrder.save();
                const generatedOrder = await generateOrderRazorpay(orderDone._id, orderDone.totalPrice);
                res.json({ payment: false, method: "online", razorpayOrder: generatedOrder, order: orderDone, orderId: orderDone._id });
            } else if (newOrder.payment === "wallet") {
                if (newOrder.totalPrice <= findUser.wallet) {
                    findUser.wallet -= newOrder.totalPrice;
                    findUser.history.push({
                        amount: newOrder.totalPrice,
                        status: "debit",
                        date: Date.now()
                    });
                    await findUser.save();

                    const orderDone = await newOrder.save();
                    res.json({ payment: true, method: "wallet", order: orderDone, orderId: orderDone._id });
                } else {
                    res.json({ payment: false, method: "wallet", success: false });
                }
            }
        }
    } catch (error) {
        console.error(error.message);
    }
};

const generateOrderRazorpay = (orderId, total) => {
    return new Promise((resolve, reject) => {
        const options = {
            amount: total * 100,
            currency: "INR",
            receipt: String(orderId)
        };
        instance.orders.create(options, (err, order) => {
            if (err) {
                reject(err);
            } else {
                resolve(order);
            }
        });
    });
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

        res.render("user/orderDetails", {
            orders: { ...findOrder._doc, product: sortedProducts },
            user: findUser,
            orderId
        });
    } catch (error) {
        console.error(error.message);
    }
};

const getOrderListPageAdmin = async (req, res) => {
    try {
        const orders = await Order.find({}).sort({ createdOn: -1 });

        let itemsPerPage = 5;
        let currentPage = parseInt(req.query.page) || 1;
        let startIndex = (currentPage - 1) * itemsPerPage;
        let endIndex = startIndex + itemsPerPage;
        let totalPages = Math.ceil(orders.length / itemsPerPage);
        const currentOrder = orders.slice(startIndex, endIndex);

        res.render("admin/orders-list", {
            orders: currentOrder,
            totalPages,
            currentPage
        });
    } catch (error) {
        console.error(error.message);
    }
};
const cancelOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        const findUser = await User.findOne({ _id: userId });

        if (!findUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!Array.isArray(findUser.history)) {
            findUser.history = [];
        }

        const orderId = req.query.orderId;
        const order = await Order.findOne({ _id: orderId });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        order.status = "Canceled";
        await order.save();

        if (order.payment === "wallet" || order.payment === "online") {
            findUser.wallet += order.totalPrice;
            findUser.history.push({
                amount: order.totalPrice,
                status: "credit",
                date: Date.now()
            });
            await findUser.save();
        }

        for (const productData of order.product) {
            const productId = productData._id;
            const product = await Product.findById(productId);
            if (product) {
                product.quantity += productData.quantity;
                await product.save();
            }
        }

        res.redirect('/profile');
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'An error occurred while cancelling the order' });
    }
};



const changeOrderStatus = async (req, res) => {
    try {
        const orderId = req.query.orderId;
        await Order.updateOne({ _id: orderId }, { status: req.query.status });
        res.redirect('/admin/orderList');
    } catch (error) {
        console.error(error.message);
    }
};

const getCartCheckoutPage = async (req, res) => {
    try {
        res.render("checkoutCart");
    } catch (error) {
        console.error(error.message);
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
        await Order.updateOne({ _id: id }, { status: "Returned" });

        const findOrder = await Order.findOne({ _id: id });

        if (findOrder.payment === "wallet" || findOrder.payment === "online") {
            findUser.wallet += findOrder.totalPrice;
            findUser.history.push({
                amount: findOrder.totalPrice,
                status: "credit",
                date: Date.now()
            });
            await findUser.save();
        }

        for (const productData of findOrder.product) {
            const productId = productData._id;
            const product = await Product.findById(productId);
            if (product) {
                product.quantity += productData.quantity;
                await product.save();
            }
        }

        res.redirect('/profile');
    } catch (error) {
        console.error(error.message);
    }
};

const getOrderDetailsPageAdmin = async (req, res) => {
    try {
        const orderId = req.query.id;
        const findOrder = await Order.findOne({ _id: orderId });

        res.render("admin/order-details-admin", { orders: findOrder, orderId });
    } catch (error) {
        console.error(error.message);
    }
};

const getInvoice = async (req, res) => {
    try {
        await invoice.invoice(req, res);
    } catch (error) {
        console.error(error.message);
    }
};

const verify = (req, res) => {
    let hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    hmac.update(
        `${req.body.payment.razorpay_order_id}|${req.body.payment.razorpay_payment_id}`
    );
    hmac = hmac.digest("hex");
    console.log(req.body.razorpay_payment_id,"hhhhhhhhhhh")

    if (hmac === req.body.payment.razorpay_signature) {
        // Update the order status to 'Paid' or similar status if necessary
        Order.updateOne({ _id: req.body.orderId }, { status: "Paid" }, (err, result) => {
            if (err) {
                return res.json({ status: false, message: "Order update failed" });
            }
            res.json({ status: true, redirectUrl: '/profile' });
            
        });
    }else {
        res.json({ status: false });
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
    getInvoice,
    verify
};
