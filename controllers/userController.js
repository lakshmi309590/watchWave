// Load necessary modules and dependencies

const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require('bcrypt');
const User = require('../models/userSchema');
const { application } = require("express");
const Category = require("../models/categorySchema");
const Product = require("../models/productSchema");


// Define functions

const pageNotFound = async (req, res) => {
    try {
        res.render('page-404');
    } catch (error) {
        console.log(error.message);
    }
}

const contact = async (req, res) => {
    try {
        res.render('user/page-contact');
    } catch (error) {
        console.log(error.message);
    }
}

const shopProduct= async (req, res) => {
    try {
        res.render('user/shop');
    } catch (error) {
        console.log(error.message);
    }
}
const about = async (req, res) => {
    try {
        res.render('user/page-about');
    } catch (error) {
        console.log(error.message);
    }
}
const home = async (req, res) => {
    try {
        const today = new Date().toISOString();
        const user = req.session.user
        const userData = await User.findOne({})
        const productData = await Product.find({isBlocked:false}).sort({id:-1}).limit(4)
        const listedCategories = await Category.find({ isListed: true }).select('name');
        const categoryNames = listedCategories.map(category => category.name);
         // Temporary debugging code
         const allProducts = await Product.find();
         allProducts.forEach(product => {
             console.log(product.id, product.category);
         });
 
        
        if(user){
        res.render('user/home', {user:userData, products:productData ,categoryNames: categoryNames });
        }else{
            res.render("user/home",{products:productData,categoryNames: categoryNames})
        }
    } catch (error) {
        console.log(error);
    }
}

const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;1
    } catch (error) {
        console.log(error.message);
    }
}

const getLoginPage = async (req, res) => {
    try {
        if (!req.session.user) {
            res.render("user/login");
        } else {
            res.redirect("/");
        }
    } catch (error) {
        console.log(error.message);
    }
}

const getSignUpPage = async (req, res) => {
    try {
        if (!req.session.user) {
            res.render("user/signup");
        } else {
            res.redirect("/");
        }
    } catch (error) {
        console.log(error.message);
    }
}

function generateOtp() {
    const digits = "1234567890";
    var otp = "";
    for (i = 0; i < 6; i++) {
        otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
}

const signUpUser = async (req, res) => {
    console.log(req.body);
    try {
        const { email,Name } = req.body;
        const findUser = await User.findOne({ email });
        if (req.body.password === req.body.cPassword) {
            if (!findUser) {
                var otp = generateOtp()
                console.log(otp);
                const transporter = nodemailer.createTransport({
                    host: "smtp.mailtrap.io",
                    port: 2525,
                    auth: {
                        user: process.env.MAILTRAP_USER,
                        pass: process.env.MAILTRAP_PASS
                    }
                })
                const info = await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: email,
                    subject: "Verify Your Account ✔",
                    text: `Your OTP is ${otp}`,
                    html: `<b>  <h4 >Your OTP  ${otp}</h4>    <br>  <a href="">Click here</a></b>`,
                })
                if (info) {
                    req.session.userOtp = otp;
                    req.session.userData = req.body;
                    req.session.userData.isBlocked = false;
                    req.session.userData.Name = Name;

                    res.render("user/verify-otp", { email });
                    console.log("Email sent", info.messageId);
                } else {
                    res.json("email-error");
                }
            } else {
                console.log("User already exists");
                res.render("user/signup", { message: "User with this email already exists" });
            }
        } else {
            console.log("The confirm password is not matching");
            res.render("user/signup", { message: "The confirm password is not matching" });
        }
    } catch (error) {
        console.log(error.message);
    }
}

const getOtpPage = async (req, res) => {
    try {
        res.render("verify-otp");
    } catch (error) {
        console.log(error.message);
    }
}
const verifyOtp = async (req, res) => {
    try {

        //get otp from body
        const { otp } = req.body
        if (otp === req.session.userOtp) {
            const user = req.session.userData
            const passwordHash = await securePassword(user.password)
            const referalCode = uuidv4()
            console.log("the referralCode  =>" + referalCode);

            const saveUserData = new User({
                Name: user.Name,
                email: user.email,
                phone: user.phone,
                password: passwordHash,
                referalCode : referalCode
                
            })
            console.log("User data from session:", req.session.userData);

            await saveUserData.save()

            req.session.user = saveUserData._id


            res.json({ status: true })
        } else {

            console.log("otp not matching");
            res.json({ status: false })
        }

    } catch (error) {
        console.log(error.message);
    }
}

const resendOtp = async (req, res) => {
    try {
        const email = req.session.userData.email;
        var newOtp = generateOtp();
        console.log(email, newOtp);

        const transporter = nodemailer.createTransport({
            host: "smtp.mailtrap.io",
            port: 2525,
            auth: {
                user: process.env.MAILTRAP_USER,
                pass: process.env.MAILTRAP_PASS
            }
        });

        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Resend OTP ✔",
            text: `Your new OTP is ${newOtp}`,
            html: `<b>  <h4 >Your new OTP is ${newOtp}</h4>    <br>  <a href="">Click here</a></b>`,
        });

        if (info) {
            req.session.userOtp = newOtp;
            res.json({ success: true, message: 'OTP resent successfully' });
            console.log("Email resent", info.messageId);
        } else {
            res.json({ success: false, message: 'Failed to resend OTP' });
        }
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: 'Error in resending OTP' });
    }
}



function startCountdown() {
    var seconds = 60;
    var countdownElement = document.getElementById('countdown');
    var resendLink = document.getElementById('resendLink');

    var countdownInterval = setInterval(function () {
        seconds--;
        countdownElement.innerText = seconds;

        if (seconds <= 0) {
            clearInterval(countdownInterval);
            toggleVisibility(false); // Hide the timer and show the Resend OTP link
            resendOtp(); // Call resendOtp() when countdown reaches zero
        }
    }, 1000);
}

const userLogin = async (req, res) => {
    try {
        // Check if email and password exist in request body
        const { email, password } = req.body;
        if (!email || !password) {
            console.log("Email or password is missing");
            return res.status(400).render("user/login", { message: "Email or password is missing" });
        }

        console.log("Email:", email);

        // Find user by email
        const listedCategories = await Category.find({ isListed: true }).select('name');
        const categoryNames = listedCategories.map(category => category.name);
        const findUser = await User.findOne({ email: email });
        console.log("Found User:", findUser);

        const products = await Product.find();
        

        if (findUser) {
            if (findUser.password) {
                const passwordMatch = await bcrypt.compare(password, findUser.password);
                if (passwordMatch) {
                    res.locals.user = {
                        _id: findUser._id,
                        UserName: findUser.UserName, 
                    };
      
                    req.session.user = findUser._id;
                    console.log("Logged in successfully");

                    // Check if user is blocked
                    if (findUser.isBlocked) {
                        console.log("User is blocked by admin");
                        return res.status(403).render("user/login", { message: "User is blocked by admin" });
                    } else {
               return  res.render('user/home', { products:products,categoryNames: categoryNames }); // Redirect to home page or wherever appropriate
                    }
                } else {
                    console.log("Password is not matching");
                    return res.status(401).render("user/login", { message: "Password is not matching" });
                }
            } else {
                console.log("User password is missing");
                return res.status(500).render("user/login", { message: "User password is missing" });
            }
        } else {
            console.log("User not found with email:", email);
            return res.status(404).render("user/login", { message: "User not found" });
        }
    } catch (error) {
        console.log("Error:", error.message);
        return res.status(500).render("user/login", { message: "Login failed" });
    }
}

const getLogoutUser = async (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.log(err.message);
            }
            console.log("Logged out");
            res.redirect("login")
        })
    } catch (error) {
        console.log(error.message);
    }
}

     
const getProductDetailsPage = async (req, res) => {
    try {
        const user = req.session.user;
        const id = req.query.id;
        console.log(`Fetching details for product ID: ${id}`);

        const findProduct = await Product.findOne({ id: id });
        if (!findProduct) {
            console.log(`Product not found for ID: ${id}`);
            return res.status(404).render('error', { message: 'Product not found' });
        }

        const findCategory = await Category.findOne({ name: findProduct.category });

        let totalOffer = 0;
        if (findCategory) {
            totalOffer = (findCategory.categoryOffer || 0) + (findProduct.productOffer || 0);
        } else {
            console.log(`Category not found for product ID: ${id}, Category: ${findProduct.category}`);
        }

        console.log(`Rendering details for product ID: ${id}, Category: ${findProduct.category}, Total Offer: ${totalOffer}`);

        if (user) {
            res.render('user/product-details', { data: findProduct, totalOffer, user: user });
        } else {
            res.render('user/product-details', { data: findProduct, totalOffer });
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).render('error', { message: 'An error occurred' });
    }
};


const getShopPage = async (req, res) => {
    try {
        const user = req.session.id;
        const products = await Product.find({ isBlocked: false });
        const count = await Product.find({ isBlocked: false }).count()
        const categories = await Category.find({ isListed: true });

        let itemsPerPage = 6;
        let currentPage = parseInt(req.query.page) || 1;
        let startIndex = (currentPage - 1) * itemsPerPage;
        let endIndex = startIndex + itemsPerPage;
        let totalPages = Math.ceil(products.length / 6);
        const currentProduct = products.slice(startIndex, endIndex);

        res.render("user/shop", {
            user: user,
            product: currentProduct,
            category: categories,
            count: count, // You might need to define `count` somewhere
            totalPages,
            currentPage
        });
    } catch (error) {
        console.log(error.message);
    }
}


const searchProducts = async (req, res) => {
    try {
        const user = req.session.user
        let search = req.query.search
       
        const categories = await Category.find({ isListed: true })

        const searchResult = await Product.find({
            $or: [
                {
                    productName: { $regex: ".*" + search + ".*", $options: "i" },
                }
            ],
            isBlocked: false,
        }).lean()

        let itemsPerPage = 6
        let currentPage = parseInt(req.query.page) || 1
        let startIndex = (currentPage - 1) * itemsPerPage
        let endIndex = startIndex + itemsPerPage
        let totalPages = Math.ceil(searchResult.length / 6)
        const currentProduct = searchResult.slice(startIndex, endIndex)


        res.render("user/shop",
            {
                user: user,
                product: currentProduct,
                category: categories,
              
                totalPages,
                currentPage
            })

    } catch (error) {
        console.log(error.message);
    }
}

const filterProduct = async (req, res) => {
    try {
        const user = req.session.user;
        const category = req.query.category;
        const findCategory = category ? await Category.findOne({ _id: category }) : null;
      

        const query = {
            isBlocked: false,
        };

        if (findCategory) {
            query.category = findCategory.name;
        }

      
        const findProducts = await Product.find(query);
        const categories = await Category.find({ isListed: true });

        let itemsPerPage = 6;
        let currentPage = parseInt(req.query.page) || 1;
        let startIndex = (currentPage - 1) * itemsPerPage;
        let endIndex = startIndex + itemsPerPage;
        let totalPages = Math.ceil(findProducts.length / 6);
        const currentProduct = findProducts.slice(startIndex, endIndex);

        res.render("user/shop", {
            user: user,
            product: currentProduct,
            category: categories,
            totalPages,
            currentPage,
            selectedCategory: category || null,
            
        });

    } catch (error) {
        console.log(error.message);
        res.status(500).send("Internal Server Error");
    }
};


const filterByPrice = async (req, res) => {
    try {
        const user = req.session.user
        const categories = await Category.find({ isListed: true });
        console.log(req.query);
        const findProducts = await Product.find({
            $and: [
                { salePrice: { $gt: req.query.gt } },
                { salePrice: { $lt: req.query.lt } },
                { isBlocked: false }
            ]
        })

        let itemsPerPage = 6;
        let currentPage = parseInt(req.query.page) || 1;
        let startIndex = (currentPage - 1) * itemsPerPage;
        let endIndex = startIndex + itemsPerPage;
        let totalPages = Math.ceil(findProducts.length / 6);
        const currentProduct = findProducts.slice(startIndex, endIndex);


        res.render("user/shop", {
            user: user,
            product: currentProduct,
            category: categories,
            totalPages,
            currentPage,
        });


    } catch (error) {
        console.log(error.message);
    }
}


const getSortProducts = async (req, res) => {
    try {
        let option = req.body.option;
        let itemsPerPage = 6;
        let currentPage = parseInt(req.body.page) || 1;
        let startIndex = (currentPage - 1) * itemsPerPage;
        let endIndex = startIndex + itemsPerPage;
        let data;

        if (option == "highToLow") {
            data = await Product.find({ isBlocked: false }).sort({ salePrice: -1 });
        } else if (option == "lowToHigh") {
            data = await Product.find({ isBlocked: false }).sort({ salePrice: 1 });
        } else if (option == "releaseDate") {
            data = await Product.find({ isBlocked: false }).sort({ createdOn: 1 });
        }

        res.json({
            status: true,
            data: {
                currentProduct: data,
                count: data.length,
                totalPages: Math.ceil(data.length / itemsPerPage),
                currentPage
            }
        });

    } catch (error) {
        console.log(error.message);
        res.json({ status: false, error: error.message });
    }
};






// Export functions

module.exports = {
    home,
    getLoginPage,
    getSignUpPage,
    signUpUser,
    getOtpPage,
    verifyOtp,
    resendOtp,
    startCountdown,
    userLogin,
    getLogoutUser,
    getProductDetailsPage,
    getShopPage,
    pageNotFound,
    searchProducts,
    filterProduct,
    filterByPrice,
    getSortProducts,
    contact,
    about ,
    shopProduct
}
