const Product = require("../models/productSchema")
const Category = require("../models/categorySchema")

const fs = require("fs")
const path = require("path")


const getProductAddPage = async (req, res) => {
    try {
        const category = await Category.find({ isListed: true })
        
        res.render("admin/product-add", { cat: category })
    } catch (error) {
        console.log(error.message);
    }
}


const addProducts = async (req, res) => {
    try {
        console.log("working newwww");

        const products = req.body
        
        const productExists = await Product.findOne({ productName: products.productName })
        if (!productExists) {
            const images = []
            if (req.files && req.files.length > 0) {
                for (let i = 0; i < req.files.length; i++) {
                    images.z(req.files[i].filename);
                }
            }

            const newProduct = new Product({
                id: Date.now(),
                productName: products.productName,
                description: products.description,
                brand: products.brand,
                category: products.category,
                regularPrice: products.regularPrice,
                salePrice: products.regularPrice,
                createdOn: new Date(),
                quantity: products.quantity,
                
                color: products.color,
               
                productImage: images
            })
            await newProduct.save()
            res.redirect("/admin/products")
            // res.json("success")
        } else {

            res.json("failed");
        }

    } catch (error) {
        console.log(error.message);
    }
}

const getEditProduct = async (req, res) => {
    try {
        const id = req.query.id
        const findProduct = await Product.findOne({ _id: id })

        const category = await Category.find({})
       
        res.render("admin/edit-product", { product: findProduct, cat: category})
    } catch (error) {
        console.log(error.message);
    }
}


const deleteSingleImage = async (req, res) => {
    try {
        console.log("hi");
        const id = req.body.productId
        const image = req.body.filename
        console.log(id, image);
        const product = await Product.findByIdAndUpdate(id, {
            $pull: { productImage: image }
        })
        // console.log(image);
        const imagePath = path.join('public', 'uploads', 'product-images', image);
        if (fs.existsSync(imagePath)) {
            await fs.unlinkSync(imagePath);
            console.log(`Image ${image} deleted successfully`);
            res.json({ success: true })
        } else {
            console.log(`Image ${image} not found`);
        }

        // res.redirect(`/admin/editProduct?id=${product._id}`)

    } catch (error) {
        console.log(error.message);
    }
}


const editProduct = async (req, res) => {
    try {
        const id = req.params.id
        const data = req.body
        const images = []
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                images.push(req.files[i].filename);
            }
        }
        console.log(req.files)
        if (req.files.length > 0) {
            console.log("Yes image is there")
            const updatedProduct = await Product.findByIdAndUpdate(id, {
                id: Date.now(),
                productName: data.productName,
                description: data.description,
               
                category: data.category,
                regularPrice: data.regularPrice,

                quantity: data.quantity,
                size: data.size,
                color: data.color,
               
                createdOn: new Date(),
                productImage: images
            }, { new: true })
            console.log("product updated");
            res.redirect("/admin/products")
        } else {
            console.log("No images i thter")
            const updatedProduct = await Product.findByIdAndUpdate(id, {
                id: Date.now(),
                productName: data.productName,
                description: data.description,
                
                category: data.category,
                regularPrice: data.regularPrice,
                salePrice: data.regularPrice,
                quantity: data.quantity,
                size: data.size,
                color: data.color,
              
                createdOn: new Date(),
            }, { new: true })
            console.log("product updated");
            res.redirect("/admin/products")
        }



    } catch (error) {
        console.log(error.message);
    }
}


const getAllProducts = async (req, res) => {
    try {
        const search = req.query.search || ""
        const page = req.query.page || 1
        const limit = 4
        const productData = await Product.find({
            $or: [
                { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
                { brand: { $regex: new RegExp(".*" + search + ".*", "i") } }
            ],
        })
            .sort({ createdOn: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec()

        const count = await Product.find({
            $or: [
                { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
                { brand: { $regex: new RegExp(".*" + search + ".*", "i") } }
            ],
        }).countDocuments()



        res.render("admin/product", {
            data: productData,
            currentPage: page,
            totalPages: Math.ceil(count / limit)

        });

    } catch (error) {
        console.log(error.message);
    }
}



const getBlockProduct = async (req, res) => {
    try {
        let id = req.query.id
        await Product.updateOne({ _id: id }, { $set: { isBlocked: true } })
        console.log("product blocked")
        res.redirect("/admin/products")
    } catch (error) {
        console.log(error.message);
    }
}


const getUnblockProduct = async (req, res) => {
    try {
        let id = req.query.id
        await Product.updateOne({ _id: id }, { $set: { isBlocked: false } })
        console.log("product unblocked")
        res.redirect("/admin/products")
    } catch (error) {
        console.log(error.message);
    }
}



const addProductOffer = async (req, res) => {
    try {
        // console.log(req.body);
        const { productId, percentage } = req.body
        const findProduct = await Product.findOne({ _id: productId })
        // console.log(findProduct);

        findProduct.salePrice = findProduct.salePrice - Math.floor(findProduct.regularPrice * (percentage / 100))
        findProduct.productOffer = parseInt(percentage)
        await findProduct.save()

        res.json({ status: true })

    } catch (error) {
        console.log(error.message);
    }
}



const removeProductOffer = async (req, res) => {
    try {
        // console.log(req.body);
        const {productId} = req.body
        const findProduct = await Product.findOne({_id : productId})
        // console.log(findProduct);
        const percentage = findProduct.productOffer
        findProduct.salePrice = findProduct.salePrice + Math.floor(findProduct.regularPrice * (percentage / 100))
        findProduct.productOffer = 0
        await findProduct.save()
        res.json({status : true})
    } catch (error) {
        console.log(error.message);
    }
}




module.exports = {
    getProductAddPage,
    addProducts,
    getAllProducts,
    getBlockProduct,
    getUnblockProduct,
    getEditProduct,
    editProduct,
    deleteSingleImage,
    addProductOffer,
    removeProductOffer
}