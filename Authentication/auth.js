const User = require("../models/userSchema");

const isLogged = (req, res, next) => {
    if (req.session.user) {
        User.findById({ _id: req.session.user }).lean()
            .then((data) => {
                if (data && !data.isBlocked) {
                    next();
                } else {
                    res.redirect("/login");
                }
            })
            .catch((error) => {
                console.error("Error querying user data:", error);
                res.redirect("/login"); // Redirect in case of error
            });
    } else {
        res.redirect("/login");
    }
};

module.exports = {
    isLogged
};
