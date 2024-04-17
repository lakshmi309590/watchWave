const User = require("../models/userSchema");
const nodemailer =require("nodemailer");
const bcrypt =require("bcryptjs");


const getForgotPassPage=async(req,res)=>{
    try{
        res.render("user/forgot-password")
    }catch{
        console.log(error.message)
    }
}

function generateOtp() {
    const digits = "1234567890"
    var otp = ""
    for (i = 0; i < 6; i++) {
        otp += digits[Math.floor(Math.random() * 10)]
    }
    return otp
}

const forgotEmailValid =async(req,res)=>{
    try{
        const {email}=req.body
        const findUser = await User.findOne({ email: email })
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
            if(info){
                req.session.userOtp=otp
                req.session.userData=req.body
                req.session.email=emailres.render("user/forgotPass-otp")
                console.log("Email sented",info.messageId)
            }else{
                res.json("email-error")
            }
         } else {
                res.render("user/forgot-password", { message: "User with this email already exists" })
            }
        } catch (error) {
            console.log(error.message);
        }

    }

const getResetPassPage =async(req,res)=>{
    try{
        res.render("user/reset-password")
    }catch(error){
        console.log(error.message);
    }
}

const verifyForgotPassOtp = async (req, res) => {
    try {
        const enteredOtp = req.body.otp
        if (enteredOtp === req.session.userOtp) {

            res.json({ status: true })
        } else {
            console.log('jijijijij');
            res.json({ status: false })
        }
    } catch (error) {
        console.log(error.message);
    }
}

const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10)
        return passwordHash
    } catch (error) {
        console.log(error.message);
    }
}

const postNewPassword = async (req, res) => {
    try {
        const { newPass1, newPass2 } = req.body
        const email = req.session.email
        if (newPass1 === newPass2) {
            const passwordHash = await securePassword(newPass1)
            await User.updateOne(
                { email: email },
                {
                    $set: {
                        password: passwordHash
                    }
                }
            )
                .then((data) => console.log(data))
            res.redirect("/login")
        } else {
            console.log("Password not match");
            res.render("reset-password", { message: "Password not matching" })
        }


    } catch (error) {
        console.log(error.message);
    }
}
const verifyReferalCode = async (req, res) => {
    try {
        const referalCode = req.body.referalCode
        const currentUser = await User.findOne({ _id: req.session.user })
        // console.log("currentUser=>>>", currentUser);
        const codeOwner = await User.findOne({ referalCode: referalCode })
        // console.log("codeOwner=>>>", codeOwner);

        if (currentUser.redeemed === true) {
            console.log("You have already redeemed a referral code before!");
            res.json({ message: "You have already redeemed a referral code before!" })
            return
        }

        if (!codeOwner || codeOwner._id.equals(currentUser._id)) {
            console.log("Invalid referral code!");
            res.json({ message: "Invalid referral code!" })
            return
        }

        const alreadyRedeemed = codeOwner.redeemedUsers.includes(currentUser._id)

        if (alreadyRedeemed) {
            console.log("You have already used this referral code!");
            res.json({ message: "You have already used this referral code!" })
            return
        } else {

            await User.updateOne(
                { _id: req.session.user },
                {
                    $inc: { wallet: 100 },
                    $push: {
                        history: {
                            amount: 100,
                            status: "credit",
                            date: Date.now()
                        }
                    }
                }
            )
                .then(data => console.log("currentUser Wallet = > ", data))



            await User.updateOne(
                { _id: codeOwner._id },
                {
                    $inc: { wallet: 200 },
                    $push: {
                        history: {
                            amount: 200,
                            status: "credit",
                            date: Date.now()
                        }
                    }
                }
            )
                .then(data => console.log("codeOwner Wallet = > ", data))

            await User.updateOne(
                { _id: codeOwner._id },
                { $set: { referalCode: "" } }
            )

            await User.updateOne(
                { _id: req.session.user },
                { $set: { redeemed: true } }
            )

            await User.updateOne(
                { _id: codeOwner._id },
                { $push: { redeemedUsers: currentUser._id } }
            )

            console.log("Referral code redeemed successfully!");

            res.json({ message: "Referral code verified successfully!" })
            return

        }

    } catch (error) {
        console.log(error.message);
    }
}


module.exports = {
   
    getForgotPassPage,
    forgotEmailValid,
    verifyForgotPassOtp,
    getResetPassPage,
    postNewPassword,
    verifyReferalCode
}

