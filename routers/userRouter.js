const express = require('express');
const Router = express.Router();

const userController = require("../controllers/userController");
const userProfileController = require("../controllers/userProfileController");

// Router.get("/pageNotFound", userController.pageNotFound);

// User action
Router.get("/", userController.home);
Router.get("/login", userController.getLoginPage);
Router.post("/login", userController.userLogin);
Router.get("/signup", userController.getSignUpPage);
Router.post("/signup", userController.signUpUser);
Router.post('/verify-otp', userController.verifyOtp);
Router.post("/resendOtp", userController.resendOtp);



Router.get("/forgot-Password", userProfileController.getForgotPassPage);
Router.post("/forgotEmailValid", userProfileController.forgotEmailValid);
Router.post("/verifyPassOtp", userProfileController.verifyForgotPassOtp);
Router.get("/resetPassword", userProfileController.getResetPassPage);
Router.post("/changePassword", userProfileController.postNewPassword);

module.exports = Router;
