// const express = require("express")
const express = require('express');
const Router = express.Router()
const adminController = require("../controllers/adminController")
const productController = require("../controllers/productContollers")
const customerController = require("../controllers/customerController")
const categoryController = require("../controllers/categoryController")
// const productController = require("../controllers/productController")


Router.get("/login", adminController.getLoginPage)
Router.post("/login", adminController.verifyLogin)
Router.get("/",adminController.adminDashboard);

// Customer Management
Router.get("/users", customerController.getCustomerInfo)
Router.get("/blockCustomer", customerController.getCustomerBlocked)
Router.get("/unblockCustomer", customerController.getCustomerUnblocked)

Router.get('/logout', adminController.getLogout);

// Category Management
Router.get("/category", categoryController.getCategoryInfo)
Router.post("/addCategory",  categoryController.addCategory)
Router.get("/allCategory", categoryController.getAllCategories)
Router.get("/listCategory", categoryController.getListCategory)
Router.get("/unListCategory", categoryController.getUnlistCategory)
Router.get("/editCategory", categoryController.getEditCategory)
Router.post("/editCategory/:id", categoryController.editCategory)

// Multer Settings
const multer = require("multer")
const storage = require("../helpers/multer")
const upload = multer({ storage: storage })
Router.use("/public/uploads", express.static("/public/uploads"))

// Product Management
Router.get("/addProducts", productController.getProductAddPage)
Router.post("/addProducts", upload.array("images", 5), productController.addProducts)
Router.get("/products",  productController.getAllProducts)
Router.get("/editProduct",  productController.getEditProduct)
Router.post("/editProduct/:id",  upload.array("images", 5), productController.editProduct)
Router.post("/deleteImage",  productController.deleteSingleImage)
Router.get("/blockProduct",  productController.getBlockProduct)
Router.get("/unBlockProduct",  productController.getUnblockProduct)
Router.post("/addProductOffer",  productController.addProductOffer)
Router.post("/removeProductOffer",  productController.removeProductOffer)



module.exports=Router;
