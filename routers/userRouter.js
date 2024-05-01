const express = require('express');
const Router = express.Router();

const userController = require("../controllers/userController");
const userProfileController = require("../controllers/userProfileController");
const { isLogged } = require("../Authentication/auth")

const productController = require("../controllers/productContollers")
// Router.get("/pageNotFound", userController.pageNotFound);

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
Router.post("/editUserDetails", isLogged, userProfileController.editUserDetails)
Router.post("/verifyReferalCode", isLogged, userProfileController.verifyReferalCode)

// Products based routes
Router.get("/productDetails", userController.getProductDetailsPage)
Router.get("/shop", userController.getShopPage)
Router.get("/search", userController.searchProducts)
Router.get("/filter", userController.filterProduct)
Router.get("/filterPrice", userController.filterByPrice)
Router.post("/sortProducts", userController.getSortProducts)

module.exports = Router;