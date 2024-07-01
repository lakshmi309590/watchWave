const express = require('express');
const Router = express.Router();

const userController = require("../controllers/userController");
const cartController = require("../controllers/cartController")
const userProfileController = require("../controllers/userProfileController");
const { isLogged } = require("../Authentication/auth")
const orderController = require("../controllers/orderController")
const wishlistController = require("../controllers/wishlistController")
const productController = require("../controllers/productContollers")
const walletController = require("../controllers/walletController")

const multer = require("multer")
const storage = require("../helpers/multer")
const upload = multer({ storage: storage })
Router.get("/pageNotFound", userController.pageNotFound);

// User action
Router.get("/", userController.home);
Router.get("/login", userController.getLoginPage);
Router.post("/login", userController.userLogin);
Router.get("/signup", userController.getSignUpPage);
Router.post("/signup", userController.signUpUser);
Router.post('/verify-otp', userController.verifyOtp);
Router.post("/resendOtp", userController.resendOtp);
Router.get("/logout", isLogged, userController.getLogoutUser)
Router.get('/page-contact',userController.contact)
Router.get("/page-about",userController.about)
Router.get("shop-product",userController.shopProduct)



Router.get("/forgot-Password", userProfileController.getForgotPassPage);
Router.post("/forgotEmailValid", userProfileController.forgotEmailValid);
Router.post("/verifyPassOtp", userProfileController.verifyForgotPassOtp);
Router.get("/resetPassword", userProfileController.getResetPassPage);
Router.post("/changePassword", userProfileController.postNewPassword);


// User profile
Router.get("/profile", isLogged, userProfileController.getUserProfile)
Router.get("/addAddress", isLogged, userProfileController.getAddressAddPage)
Router.post("/addAddress", isLogged, userProfileController.postAddress)
Router.get("/editAddress", isLogged, userProfileController.getEditAddress),
Router.post("/editAddress", isLogged, userProfileController.postEditAddress)
Router.get("/deleteAddress", isLogged, userProfileController.getDeleteAddress)
Router.post("/editUserDetails", isLogged,upload.none(), userProfileController.editUserDetails)
Router.post("/verifyReferalCode", isLogged, userProfileController.verifyReferalCode)

// Products based routes
Router.get("/productDetails", userController.getProductDetailsPage)
Router.get("/shop", userController.getShopPage)
Router.get("/search", userController.searchProducts)
Router.get("/filter", userController.filterProduct)
Router.get("/filterPrice", userController.filterByPrice)
Router.post("/sortProducts", userController.getSortProducts)

// Cart
Router.get("/cart", isLogged, cartController.getCartPage)
Router.post("/addToCart", isLogged, cartController.addToCart)
Router.post("/changeQuantity", isLogged, cartController.changeQuantity)
Router.get("/deleteItem", isLogged, cartController.deleteProduct)


//Orders
Router.get("/checkout",isLogged, orderController.getCheckoutPage)
Router.post("/orderPlaced", isLogged, orderController.orderPlaced)
Router.get("/orderDetails", isLogged, orderController.getOrderDetailsPage)
Router.get("/cancelOrder", isLogged, orderController.cancelOrder)
Router.get("/return", isLogged, orderController.returnOrder)
Router.get("/checkoutCart", isLogged, orderController.getCartCheckoutPage)
Router.post("/applyCoupon", isLogged, userController.applyCoupon)
Router.post("/verifyPayment", isLogged, orderController.verify)
Router.get("/invoice", orderController.getInvoice)
// Wishlist
Router.get("/wishlist", isLogged, wishlistController.getWishlistPage)
Router.post("/addToWishlist",isLogged, wishlistController.addToWishlist)
Router.get("/deleteWishlist", isLogged, wishlistController.deleteItemWishlist)

// Wallet
Router.post("/addMoney", isLogged, walletController.addMoneyToWallet)
Router.post("/verify-payment", isLogged, walletController.verify_payment)
module.exports = Router;