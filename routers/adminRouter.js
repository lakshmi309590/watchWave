// const express = require("express")
const express = require('express');
const Router = express.Router()
const adminController = require("../controllers/adminController")
const productController = require("../controllers/productContollers")
const orderController = require("../controllers/orderController")
const customerController = require("../controllers/customerController")
const categoryController = require("../controllers/categoryController")
// const productController = require("../controllers/productController")
const { isAdmin } = require("../Authentication/auth")


Router.get("/login", adminController.getLoginPage)
Router.post("/login", adminController.verifyLogin)
Router.get("/",isAdmin,adminController.adminDashboard);

// Customer Management
Router.get("/users", isAdmin,customerController.getCustomerInfo)
Router.get("/blockCustomer",isAdmin, customerController.getCustomerBlocked)
Router.get("/unblockCustomer", isAdmin,customerController.getCustomerUnblocked)

Router.get('/logout', isAdmin, adminController.getLogout);

// Category Management
Router.get("/category",isAdmin, categoryController.getCategoryInfo)
Router.post("/addCategory",isAdmin,  categoryController.addCategory)
Router.get("/allCategory",isAdmin, categoryController.getAllCategories)
Router.get("/listCategory", isAdmin,categoryController.getListCategory)
Router.get("/unListCategory", isAdmin,categoryController.getUnlistCategory)
Router.get("/editCategory",isAdmin, categoryController.getEditCategory)
Router.post("/editCategory/:id",isAdmin, categoryController.editCategory)

// Multer Settings
const multer = require("multer")
const storage = require("../helpers/multer")
const upload = multer({ storage: storage })
Router.use("/public/uploads", express.static("/public/uploads"))

// Product Management
Router.get("/addProducts",isAdmin, productController.getProductAddPage)
Router.post("/addProducts", isAdmin,upload.array("images", 5), productController.addProducts)
Router.get("/products", isAdmin, productController.getAllProducts)
Router.get("/editProduct", isAdmin, productController.getEditProduct)
Router.post("/editProduct/:id",isAdmin,  upload.array("images", 5), productController.editProduct)
Router.post("/deleteImage", isAdmin, productController.deleteSingleImage)
Router.get("/blockProduct", isAdmin, productController.getBlockProduct)
Router.get("/unBlockProduct", isAdmin, productController.getUnblockProduct)
Router.post("/addProductOffer",isAdmin,  productController.addProductOffer)
Router.post("/removeProductOffer", isAdmin, productController.removeProductOffer)

// Order Management
Router.get("/orderList",isAdmin,  orderController.getOrderListPageAdmin)
Router.get("/orderDetailsAdmin",isAdmin,  orderController.getOrderDetailsPageAdmin)
Router.get("/changeStatus",isAdmin,orderController.changeOrderStatus)

module.exports=Router;
