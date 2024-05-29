const Category = require("../models/categorySchema")
const Product =require("../models/productSchema")

const getCategoryInfo =async(req,res)=>{
    try{
        const categoryData = await Category.find({})
        res.render("admin/category",{cat:categoryData})
    }catch(error){
        console.log(error.message);
    }
}

const addCategory = async (req, res) => {
    try {
        const { name, description } = req.body
        const categoryExists = await Category.findOne({ name })
        if (description) {
            if (!categoryExists) {
                const newCategory = new Category({
                    name: name,
                    description: description
                })
                await newCategory.save()
                console.log("New Category : ", newCategory);
                res.redirect("/admin/allCategory")
            } else {
                res.redirect("/admin/category")
                console.log("Category Already exists");
            }
        } else {
            console.log("description required");
        }
    } catch (error) {
        console.log(error.message);
    }
}
const getAllCategories = async (req, res) => {
    try {
        const categoryData = await Category.find({})
        res.render("admin/category", { cat: categoryData })
    } catch (error) {
        console.log(error.message);
    }
}

const getListCategory = async (req, res) => {
    try {
        let id = req.query.id
        console.log("wrking");
        await Category.updateOne({ _id: id }, { $set: { isListed: false } })
        res.redirect("/admin/category")
    } catch (error) {
        console.log(error.message);
    }
}


const getUnlistCategory = async (req, res) => {
    try {
        let id = req.query.id
        await Category.updateOne({ _id: id }, { $set: { isListed: true } })
        res.redirect("/admin/category")
    } catch (error) {
        console.log(error.message);
    }
}

const getEditCategory = async (req, res) => {
    try {
        const id = req.query.id
        const category = await Category.findOne({ _id: id })
        res.render("admin/edit-category", { category: category })
    } catch (error) {
        console.log(error.message);
    }
}
const editCategory = async (req, res) => {
    try {
        const id = req.params.id;
        const { categoryName, description } = req.body;

        if (!categoryName || !description) {
            console.log("Category name and description are required");
            return res.redirect(`/admin/category?id=${id}`);
        }

        // Check if another category with the same name exists
        const categoryExists = await Category.findOne({ name: categoryName });
        if (categoryExists && categoryExists._id.toString() !== id) {
            console.log("Category name already exists");
            return res.redirect(`/admin/category?id=${id}`);
        }

        // Find the category by ID
        const findCategory = await Category.findById(id);
        if (findCategory) {
            // Update the category
            await Category.updateOne(
                { _id: id },
                {
                    name: categoryName,
                    description: description
                }
            );

            // Update the category reference in the products
            await Product.updateMany(
                { category: id },
                { $set: { category: id } }
            );

            res.redirect("/admin/category");
        } else {
            console.log("Category not found");
            res.redirect("/admin/category");
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
};





module.exports = {
    getCategoryInfo,
    addCategory,
    getAllCategories,
    getListCategory,
    getUnlistCategory,
    editCategory,
    getEditCategory,
}