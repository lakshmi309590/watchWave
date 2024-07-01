const User = require("../models/userSchema");
const Category = require("../models/categorySchema");
const Product = require("../models/productSchema");
const Coupon = require("../models/couponSchema")
const bcrypt = require("bcryptjs");
const Order = require("../models/orderSchema");
const ExcelJS = require('exceljs');
const moment = require('moment');

const PDFDocument = require('pdfkit')

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
const getCouponPageAdmin = async (req, res) => {
    try {
        const findCoupons = await Coupon.find({})
        res.render("admin/coupon", { coupons: findCoupons })
    } catch (error) {
        console.log(error.message);
    }
}

const createCoupon = async (req, res) => {
    try {

        const data = {
            couponName: req.body.couponName,
            startDate: new Date(req.body.startDate + 'T00:00:00'),
            endDate: new Date(req.body.endDate + 'T00:00:00'),
            offerPrice: parseInt(req.body.offerPrice),
            minimumPrice: parseInt(req.body.minimumPrice)
        };

        const newCoupon = new Coupon({
            name: data.couponName,
            createdOn: data.startDate,
            expireOn: data.endDate,
            offerPrice: data.offerPrice,
            minimumPrice: data.minimumPrice
        })

        await newCoupon.save()
            .then(data => console.log(data))

        res.redirect("coupon")

        console.log(data);

    } catch (error) {
        console.log(error.message);
    }
}
const deleteCoupon = async (req, res) => {
    try {
        const couponId = req.params.id;
        await Coupon.findByIdAndDelete(couponId);
        res.redirect("/admin/coupon");
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Error deleting coupon");
    }
};
const getSalesReportPage = async (req, res) => {
    try {


        console.log(req.query.day);
        let filterBy = req.query.day
        if (filterBy) {
            res.redirect(`/admin/${req.query.day}`)
        } else {
            res.redirect(`/admin/salesMonthly`)
        }
    } catch (error) {
        console.log(error.message);
    }
}

const salesToday= async(req,res)=>{
    try{
        let today= new Date()
        const startOfTheDay=new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
            0,
            0,
            0,
            0
    
        )
        const endOfTheDay = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
            23,
            59,
            59,
            999
        )

        const orders= await Order.aggregate([
            {
            $match:{
                createdOn:{
                    $gte:startOfTheDay,
                    $lt:endOfTheDay
                },
                status:"Delivered"
            }
        }
        ]).sort({createdOn:-1})
        let itemsPerPage=5
        let currentPage=parseInt(req.query.page)||1
        let startIndex = (currentPage - 1) * itemsPerPage
        let endIndex = startIndex + itemsPerPage
        let totalPages = Math.ceil(orders.length / 3)
        const currentOrder = orders.slice(startIndex, endIndex)
        res.render("admin/salesReport",{data:currentOrder,totalPages,currentPage,salesToday:true})

    }catch (error) {
        console.log(error.message);
    }
}


const salesWeekly = async (req, res) => {
    try {
        let currentDate = new Date()
        const startOfTheWeek = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate() - currentDate.getDay()
        )

        const endOfTheWeek = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate() + (6 - currentDate.getDay()),
            23,
            59,
            59,
            999
        )

        const orders = await Order.aggregate([
            {
                $match: {
                    createdOn: {
                        $gte: startOfTheWeek,
                        $lt: endOfTheWeek
                    },
                    status: "Delivered"
                }
            }
        ]).sort({ createdOn: -1 })

        let itemsPerPage = 5
        let currentPage = parseInt(req.query.page) || 1
        let startIndex = (currentPage - 1) * itemsPerPage
        let endIndex = startIndex + itemsPerPage
        let totalPages = Math.ceil(orders.length / 3)
        const currentOrder = orders.slice(startIndex, endIndex)

        res.render("admin/salesReport", { data: currentOrder, totalPages, currentPage, salesWeekly: true })

    } catch (error) {
        console.log(error.message);
    }
}
const salesMonthly = async (req, res) => {
    try {
        let currentMonth = new Date().getMonth() + 1
        const startOfTheMonth = new Date(
            new Date().getFullYear(),
            currentMonth - 1,
            1, 0, 0, 0, 0
        )
        const endOfTheMonth = new Date(
            new Date().getFullYear(),
            currentMonth,
            0, 23, 59, 59, 999
        )
        const orders = await Order.aggregate([
            {
                $match: {
                    createdOn: {
                        $gte: startOfTheMonth,
                        $lt: endOfTheMonth
                    },
                    status: "Delivered"
                }
            }
        ]).sort({ createdOn: -1 })
        // .then(data=>console.log(data))
        console.log("ethi");
        console.log(orders);

        let itemsPerPage = 5
        let currentPage = parseInt(req.query.page) || 1
        let startIndex = (currentPage - 1) * itemsPerPage
        let endIndex = startIndex + itemsPerPage
        let totalPages = Math.ceil(orders.length / 3)
        const currentOrder = orders.slice(startIndex, endIndex)

        res.render("admin/salesReport", { data: currentOrder, totalPages, currentPage, salesMonthly: true })


    } catch (error) {
        console.log(error.message);
    }
}


const salesYearly = async (req, res) => {
    try {
        const currentYear = new Date().getFullYear()
        const startofYear = new Date(currentYear, 0, 1, 0, 0, 0, 0)
        const endofYear = new Date(currentYear, 11, 31, 23, 59, 59, 999)

        const orders = await Order.aggregate([
            {
                $match: {
                    createdOn: {
                        $gte: startofYear,
                        $lt: endofYear
                    },
                    status: "Delivered"
                }
            }
        ])


        let itemsPerPage = 5
        let currentPage = parseInt(req.query.page) || 1
        let startIndex = (currentPage - 1) * itemsPerPage
        let endIndex = startIndex + itemsPerPage
        let totalPages = Math.ceil(orders.length / 3)
        const currentOrder = orders.slice(startIndex, endIndex)

        res.render("admin/salesReport", { data: currentOrder, totalPages, currentPage, salesYearly: true })

    } catch (error) {
        console.log(error.message);
    }
}
const generatePdf = async (req, res) => {
    try {
        const doc = new PDFDocument();
        const filename = 'sales-report.pdf';
        const orders = req.body;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        doc.pipe(res);

        doc.fontSize(12);
        doc.text('Sales Report', { align: 'center', fontSize: 16 });

        // Add table headers
        const headers = ['Order ID', 'Name', 'Date', 'Total', 'Offer Price'];
        let headerX = 20;
        const headerY = doc.y + 10;
        headers.forEach(header => {
            doc.text(header, headerX, headerY);
            headerX += 100;
        });

        let dataY = headerY + 25;
        orders.forEach(order => {
            const cleanedDataId = order.dataId.trim();
            const cleanedName = order.name.trim();

            doc.text(cleanedDataId, 20, dataY);
            doc.text(cleanedName, 120, dataY);
            doc.text(order.date, 220, dataY);
            doc.text(order.totalAmount, 320, dataY);
            doc.text(order.offerPrice || '', 420, dataY); // Ensure offerPrice is handled gracefully
            
            dataY += 30;
        });

        doc.end();
    } catch (error) {
        console.log(error.message);
    }
};


const downloadExcel = async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');
        worksheet.columns = [
            { header: 'Order ID', key: 'orderId', width: 15 },
            { header: 'Name', key: 'name', width: 30 },
            { header: 'Date', key: 'date', width: 20 },
            { header: 'Total', key: 'totalAmount', width: 15 },
            { header: 'Offer Price', key: 'offerPrice', width: 15 }
        ];

        const orders = req.body;
        orders.forEach(order => {
            worksheet.addRow({
                orderId: order.dataId,
                name: order.name,
                date: order.date,
                totalAmount: order.totalAmount,
                offerPrice: order.offerPrice || '' // Ensure offerPrice is handled gracefully
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=salesReport.xlsx`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.log(error.message);
    }
};





const dateWiseFilter = async (req, res) => {
    try {
        const date = req.query.date;
        console.log("reachedkkky:", date);

        const startOfDay = moment(date).startOf('day').toDate();
        const endOfDay = moment(date).endOf('day').toDate();

        console.log("Start of Day:", startOfDay);
        console.log("End of Day:", endOfDay);

        const orders = await Order.aggregate([
            {
                $match: {
                    createdOn: {
                        $gte: startOfDay,
                        $lt: endOfDay
                    },
                    status: "Delivered"
                }
            }
        ]);

        console.log("Orders:", orders);

        let itemsPerPage = 5;
        let currentPage = parseInt(req.query.page) || 1;
        let startIndex = (currentPage - 1) * itemsPerPage;
        let endIndex = startIndex + itemsPerPage;
        let totalPages = Math.ceil(orders.length / itemsPerPage);
        const currentOrder = orders.slice(startIndex, endIndex);

        res.render("admin/salesReport", { data: currentOrder, totalPages, currentPage, date });

    } catch (error) {
        console.log(error.message);
        res.status(500).send("Server Error");
    }
};



module.exports = {
    getLoginPage,
    verifyLogin,
    adminDashboard,
    getLogout,
    getCouponPageAdmin,
    createCoupon,
    deleteCoupon,
    getSalesReportPage,
    salesToday,
    salesWeekly,
    salesMonthly,
    salesYearly,
    dateWiseFilter,
    generatePdf,
    downloadExcel
    // Other controller functions
};
