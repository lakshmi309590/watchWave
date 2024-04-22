const User = require("../models/userSchema");
const Category = require("../models/categorySchema");
const Product = require("../models/productSchema");
const bcrypt = require("bcryptjs");

const getLoginPage = async (req, res) => {
    try {
        res.render("admin/admin-login");
    } catch (error) {
        console.log(error.message);
    }
};

const hardcodedAdminEmail = "admin@example.com";
const hardcodeAdminPassword = "password";

const verifyLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (email === hardcodedAdminEmail && password === hardcodeAdminPassword) {
            req.session.admin = true;
            console.log("Admin Logged In");
            res.redirect("/admin/users");
        } else {
            // If credentials do not match, redirect back to login page with error message
            console.log("Incorrect email or password");
            res.redirect("/admin/login");
        }
    } catch (error) {
        console.log(error.message);
    }
};

const getLogout = async (req, res) => {
    try {
        req.session.admin = null;
        res.redirect("/admin/login");
    } catch (error) {
        console.log(error.message);
    }
};

const adminDashboard = async (req, res) => {
    try {
        // Example: Fetch users from the database
        const users = await User.find({});
        
        // Example: Fetch categories from the database
        const categories = await Category.find({});
        
        // Example: Fetch products from the database
        const products = await Product.find({});
        const currentPage = req.query.page ? parseInt(req.query.page) : 1;
        
        // Example: Set users per page and calculate total pages
        const usersPerPage = 10; // Adjust this value as needed
        const totalPagesForUsers = Math.ceil(users.length / usersPerPage);


        res.render("admin/index", { users, categories, products, totalPagesForUsers });
    } catch (error) {
        console.log(error.message);
    }
};

module.exports = {
    getLoginPage,
    verifyLogin,
    adminDashboard,
    getLogout
    // Other controller functions
};
