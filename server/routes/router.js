const express = require('express')
const router = express.Router()
const schemas = require('../models/schema')
const { mongo, default: mongoose } = require('mongoose')
const path = require('path')
const fs = require('fs')
const crypto = require('node:crypto')
const { hash } = require('crypto')
const uuidv4 = require('uuid').v4
const luhn = require('luhn')
const { register } = require('node:module')
const getCookie = require('cookie')

const sessions = {}

require('dotenv/config')
router.get('/products', async (req, resp) => {
    const products = schemas.Products
    const productData = await products.find({}).exec()
    resp.send(JSON.stringify(productData, null, 2))
})


router.get('/products/:id', async (req, resp) => {
    const product = schemas.Products
    const productData = await product.findById(req.params['id']).exec()
    resp.send(JSON.stringify(productData, null, 2))
})



router.get('/products/image/:id', async (req, resp) => {
    const products = schemas.Products
    try{
        const productData = await products.findById(req.params['id']).exec() // Checks if the id requested is in the database, if not it will catch the error
        const image_path = `../../front/src/assets/${req.params['id']}.jpg`
        const full_image_path = path.join(__dirname, image_path)
        const checkImagePathExists = fs.existsSync(full_image_path)
        switch (checkImagePathExists) {
            case true:
                resp.setHeader('Content-Type', 'image/jpeg')
                resp.sendFile(full_image_path)
                break;
            case false:
                resp.status(404).send("Item is unavailable or has been moved.")
                break;
            default:
                resp.status(404).send("Item is unavailable or has been moved.")
                break;
        }

        
    } catch(error) {
        resp.status(404).send("Item is unavailable or has been moved.")
    }


})



module.exports = router

router.get('/api/pubkey', async(req, resp) => {
    resp.setHeader('Content-Type', 'application/json')
    resp.send(JSON.stringify({
        pubkey: process.env.PUBLIC_KEY
    }))
})

router.post('/authenticate_user', async (req, resp) => {
    const { cookie } = req.headers
    const sesCookie = getCookie.parse(cookie)['ses']
    if (sesCookie !== undefined){
        // Use regex to check if it in the correct format
        const cookieVal = sesCookie.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g).toString() // extract uuid v4
        if (sessions[cookieVal] !== undefined){
            user_schema = schemas.Users
            user_query = await user_schema.findById(sessions[cookieVal]['userID'])
            if (user_query.length !== 0) {
                resp.setHeader('Content-Type', 'application/json')
                if (user_query.role === 'administrator' && sessions[cookieVal] !== undefined){
                    resp.send(JSON.stringify({
                        userID: sessions[cookieVal]['userID'],
                        role: 'administrator',
                        verified: true
                    }))
                } else if (user_query.role === 'customer' && sessions[cookieVal] !== undefined){
                    resp.send(JSON.stringify({
                        userID: sessions[cookieVal]['userID'],
                        role: 'customer',
                        verified: true
                    }))
                } else {
                    resp.send(JSON.stringify(false))
                }
            }
        } else {
            resp.setHeader('Content-Type', 'application/json')
            resp.send(JSON.stringify(false))
            console.log("invalid user")
        }
    } else {
        resp.setHeader('Content-Type', 'application/json')
        resp.send(JSON.stringify(false))
        console.log("User not logged in.")
    }
})


router.post('/submit_login', async (req, resp) => {
    const decrypt_data = async(data) => {
        return crypto.privateDecrypt(
            {
                key: process.env.PRIVATE_KEY,
                passphrase: process.env.PASSPHRASE_PRIV_KEY,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: "sha256"
            },
            data
        ).toString('utf-8')
    }
    

    const login_details = req.body
    const encrypted_email = Buffer.from(login_details.email, 'base64')
    const encrypted_password = Buffer.from(login_details.password, 'base64')
    
    const [decrypted_email_result, decrypted_password_result] = await Promise.allSettled([
        decrypt_data(encrypted_email),
        decrypt_data(encrypted_password)
    ])

    if (decrypted_email_result.status == 'fulfilled' && decrypted_password_result.status == 'fulfilled'){
        const decrypted_email = decrypted_email_result.value
        const decrypted_password = decrypted_password_result.value
        const users = schemas.Users
        try{
            const userData = await users.find({email: decrypted_email}).exec() // if not found then it exits try 
            const hashed_password = crypto.createHash('sha256').update(decrypted_password).digest('hex')
            if (userData[0]['password'] === hashed_password){
                generatedSessionID = uuidv4();
                let user_id = userData[0]['_id'].toString()
                sessions[generatedSessionID] = {userID: user_id}
                resp.cookie('ses', generatedSessionID, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'Strict'
                })
                if (userData.role === 'administrator'){
                    resp.status(200).send("admin")
                } else if (userData.role === 'customer'){
                    resp.status(200).send("customer")
                } else { // Role can only be customer or admin
                    resp.status(401).send("Unauthorised")
                }
            } else {
                resp.status(401).send("Unauthorised")
            }

        } catch(error){
            resp.status(401).send("Unauthorised")
        }
    } else {
        resp.status(501).send("Error")
    }
})


router.post('/logout_user', async (req, resp) => {
    const { cookie } = req.headers
    const sesCookie = getCookie.parse(cookie)['ses']

    if (sesCookie !== undefined){
        const cookieVal = sesCookie.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g).toString() // extract uuid v4
        if (sessions[cookieVal] !== undefined){
            delete sessions[cookieVal]
            resp.setHeader('Content-Type', 'application/json')
            resp.send(JSON.stringify(true))
        } else {
            resp.setHeader('Content-Type', 'application/json')
            resp.send(JSON.stringify(false))
        }
    } else {
        resp.setHeader('Content-Type', 'application/json')
        resp.send(JSON.stringify(false))
    }
})

router.post('/order_purchase', async (req, resp) => {
    // Decrypts the received data
    const decryptData = async(data) => {
        return crypto.privateDecrypt(
            {
                key: process.env.PRIVATE_KEY,
                passphrase: process.env.PASSPHRASE_PRIV_KEY,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: "sha256"
            },
            data
        ).toString('utf-8')
    }

    const updateProdStock = async (products) => {
        try {
            for (let item of products) {
                var { product_id, quantity } = item

                const product_schema = schemas.Products
                var product = await product_schema.findById(product_id)


                if (!product) {
                    console.log("Product does not exist")
                }

                if (product.stock_quantity < quantity) {
                    console.log("Not enough stock.")
                }

            product.stock_quantity -= quantity
            product.modified_date = new Date()
            await product.save()
            console.log("sucessfully updated product stock")
            }

        } catch (error){
            console.log("Error updating product stock")
            console.log(error)
        }
    }

    const { cookie } = req.headers
    const sesCookie = getCookie.parse(cookie)['ses']
    if (sesCookie !== undefined){ // If cookie is defined
        const cookieVal = sesCookie.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g).toString()
        if (sessions[cookieVal] !== undefined){ // If cookie is in sessions
            // Check if order quantity is valid 
            const order_details = req.body
            
            let isValidExpiry = false

            const encrypted_b_street = Buffer.from(order_details.billing_address[0].street, 'base64')
            const encrypted_b_town = Buffer.from(order_details.billing_address[0].town, 'base64')
            const encrypted_b_postcode = Buffer.from(order_details.billing_address[0].postcode, 'base64')

            const encrypted_s_street = Buffer.from(order_details.shipping_address[0].street, 'base64')
            const encrypted_s_town = Buffer.from(order_details.shipping_address[0].town, 'base64')
            const encrypted_s_postcode = Buffer.from(order_details.shipping_address[0].postcode, 'base64')

            const encrypted_card_number = Buffer.from(order_details.card_details[0].card_number, 'base64')
            const encrypted_card_expiry = Buffer.from(order_details.card_details[0].card_expiry, 'base64')

            const products = order_details.product
            const encrypted_total_price = Buffer.from(order_details.total_price, 'base64')
            // Decrypts the fields
            const [decrypted_b_street, decrypted_b_town, decrypted_b_postcode] = await Promise.allSettled([
                decryptData(encrypted_b_street),
                decryptData(encrypted_b_town),
                decryptData(encrypted_b_postcode)
            ])

            const [decrypted_s_street, decrypted_s_town, decrypted_s_postcode] = await Promise.allSettled([
                decryptData(encrypted_s_street),
                decryptData(encrypted_s_town),
                decryptData(encrypted_s_postcode)
            ])

            const [decrypted_card_number, decrypted_card_expiry] = await Promise.allSettled([
                decryptData(encrypted_card_number),
                decryptData(encrypted_card_expiry)
            ])

            const decrypted_total_price = await Promise.allSettled([decryptData(encrypted_total_price)]) 
            // Check that card expiry date is valid
            try {
                decrypted_card_expiry.value.match(/^\d{2}\/\d{2}$/)
                const [month, year] = decrypted_card_expiry.value.split("/").map(Number)
                const expiry_date = new Date(2000+year, month - 1).getTime()
                if (expiry_date > Date.now()){
                    console.log("valid expiry")
                    isValidExpiry = true
                } else {
                    isValidExpiry = false
                }
            } catch (error) {
                console.log("Invalid Expiry date format")
                console.log(error)
            }

            if (isValidExpiry){
                const newProducts = products.map(product => ({
                    product_id: new mongoose.Types.ObjectId(product.product_id.toString()),
                    quantity: product.quantity
                }))


                await updateProdStock(newProducts)

                const order_schema = schemas.Orders
                const order_query = await order_schema.create({
                    order_status: "pending",
                    order_date: new Date(Date.now()),
                    order_total: parseInt(decrypted_total_price[0].value),
                    user_id: new mongoose.Types.ObjectId(sessions[cookieVal]['userID']),
                    product: newProducts,
                })

                const userID = sessions[cookieVal]['userID']
                const user_schema = schemas.Users
                const user = await user_schema.findById(userID)
                user.billing_address = [{
                    street: decrypted_b_street.value,
                    town: decrypted_b_town.value,
                    postcode: decrypted_b_postcode.value
                }]
                user.shipping_address = [{
                    street: decrypted_s_street.value,
                    town: decrypted_s_town.value,
                    postcode: decrypted_s_postcode.value
                }]

                user.orders.push({
                    order_id: order_query._id,
                    order_status: order_query.order_status,
                    order_date: order_query.order_date,
                    order_total: parseInt(order_query.order_total),
                    product: order_query.product
                })

                await user.save()
                resp.status(200).send()

            }

        } else {
            resp.status(401).send("Unauthorised")
        }
    } else {
        resp.status(401).send("Unauthorised")
    }
})

router.post('/add_to_basket', async(req, resp) => {
    const { cookie } = req.headers
    const sesCookie = getCookie.parse(cookie)['ses']

    if (sesCookie !== undefined){
        const cookieVal = sesCookie.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g).toString()
        if (sessions[cookieVal] !== undefined){ // If cookie is in sessions
            const basket_details = req.body
            const basket = basket_details.basket
            const userID = sessions[cookieVal]['userID']
            const user_schema = schemas.Users
            const user = await user_schema.findById(userID)
            user.cart_items = basket
            await user.save()
            resp.status(200).send()

        } else {
            resp.status(401).send("Unauthorised")
        }
    } else {
        resp.status(401).send("Unauthorised")
    }
})

router.post('/submit_register', async(req, resp) => {
    const decryptData = async(data) => {
        return crypto.privateDecrypt(
            {
                key: process.env.PRIVATE_KEY,
                passphrase: process.env.PASSPHRASE_PRIV_KEY,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: "sha256"
            },
            data
        ).toString('utf-8')
    }
    const { cookie } = req.headers

    const sesCookie = getCookie.parse(cookie)['ses']
    if (sesCookie === undefined){ // User must not have a cookie set to make an account
        register_details = req.body

        const encrypted_first_name = Buffer.from(register_details.first_name, 'base64')
        const encrypted_last_name = Buffer.from(register_details.last_name, 'base64')
        const encrypted_username = Buffer.from(register_details.username, 'base64')
        const encrypted_email = Buffer.from(register_details.email, 'base64')
        const encrypted_phone_number = Buffer.from(register_details.phone_number, 'base64')
        const encrypted_password = Buffer.from(register_details.password, 'base64')
        const encrypted_dob = Buffer.from(register_details.dob, 'base64')


        const [decrypted_first_name, decrypted_last_name, decrypted_username, decrypted_dob] = await Promise.allSettled([
            decryptData(encrypted_first_name),
            decryptData(encrypted_last_name),
            decryptData(encrypted_username),
            decryptData(encrypted_dob)
        ])

        const [decrypted_email, decrypted_phone_number, decrypted_password] = await Promise.allSettled([
            decryptData(encrypted_email),
            decryptData(encrypted_phone_number),
            decryptData(encrypted_password)
        ])

        const user_schema = schemas.Users
        const user_query = await user_schema.find({username: decrypted_username.value})
        const email_user_query = await user_schema.find({email: decrypted_email})
        if (user_query.length === 0 && email_user_query.length === 0) { // If username and email is not found
            const hashed_password = crypto.createHash('sha256').update(decrypted_password.value).digest('hex')
            try {
                const register_query = await user_schema.create({
                    username: decrypted_username.value,
                    first_name: decrypted_first_name.value,
                    last_name: decrypted_last_name.value,
                    dob: decrypted_dob.value,
                    email: decrypted_email.value,
                    phone: decrypted_phone_number.value,
                    password: hashed_password
                })
            } catch (error) {
                console.log(error)
                resp.status(500).send()
            }
            
        } else {
            resp.status(403).send("Forbidden")
        }

    } else {
        resp.status(403).send("Forbidden")
    }
})


router.get('/get_orders', async(req, resp) => {
    const { cookie } = req.headers
    const sesCookie = getCookie.parse(cookie)['ses']

    if (sesCookie !== undefined){
        // Use regex to check if a cookie is valid.
        const cookieVal = sesCookie.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g).toString()
        if (sessions[cookieVal] !== undefined){ // If cookie is in sessions
            user_schema = schemas.Users
            user_query = await user_schema.findById(sessions[cookieVal]['userID'])
            if (user_query.length !== 0){
                // Make sure user requesting is administrator
                if (user_query.role === 'administrator'){
                    order_schema = schemas.Orders
                    order_query = await order_schema.find({}) // Get all orders
                    resp.setHeader('Content-Type', 'application/json')
                    resp.send(JSON.stringify({
                        userID: sessions[cookieVal]['userID'],
                        orders: order_query
                    }))
                } else {
                    resp.setHeader('Content-Type', 'application/json')
                    resp.send(JSON.stringify({
                        userID: sessions[cookieVal]['userID'],
                        orders: user_query.orders
                    }))
                }   
            } else {
                resp.status(401).send("Unauthorised")
            }
        }
    }

})


router.post('/update_order_status', async(req, resp) => {
    const { cookie } = req.headers

    const sesCookie = getCookie.parse(cookie)['ses']
    if (sesCookie !== undefined){
        const cookieVal = sesCookie.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g).toString()
        if (sessions[cookieVal] !== undefined){ // If cookie is in sessions
            var user_schema = schemas.Users
            user_query = await user_schema.findById(sessions[cookieVal]['userID'])
            if (user_query.length !== 0 && user_query.role === 'administrator'){
                order_details = req.body
                order_schema = schemas.Orders
                order_query = await order_schema.findById(order_details.order_id)
                order_query.order_status = order_details.order_status

                await order_query.save()

                cust_user_query = await user_schema.findById(order_query.user_id) // Customer query
                const userOrderIdx = cust_user_query.orders.findIndex(ord => ord.order_id.toString() === order_details.order_id)
                if (userOrderIdx !== -1){ // If it is found
                    cust_user_query.orders[userOrderIdx].order_status = order_details.order_status
                    await cust_user_query.save()
                }

            } else {
                resp.status(401).send("Unauthorised")
            }
        } else {
            resp.status(401).send("Unauthorised")
        }

    } else {
        resp.status(401).send("Unauthorised")
    }
})

router.get('/get_users', async(req, resp) => {
    const { cookie } = req.headers
    const sesCookie = getCookie.parse(cookie)['ses']

    if (sesCookie !== undefined){
        const cookieVal = sesCookie.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g).toString()
        if (sessions[cookieVal] !== undefined){ // If cookie is in sessions
            var user_schema = schemas.Users
            user_query = await user_schema.findById(sessions[cookieVal]['userID'])
            if (user_query.length !== 0 && user_query.role === 'administrator'){
                all_users_query = await user_schema.find({}).select('-password')
                resp.setHeader('Content-Type', 'application/json')
                console.log(all_users_query)
                resp.send(JSON.stringify({
                    users: all_users_query
                }))
            }
        }
    }
})

router.get('/get_products', async(req, resp) => {
    const { cookie } = req.headers
    const sesCookie = getCookie.parse(cookie)['ses']

    if (sesCookie !== undefined){
        const cookieVal = sesCookie.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g).toString()
        if (sessions[cookieVal] !== undefined){ // If cookie is in sessions
            var user_schema = schemas.Users
            user_query = await user_schema.findById(sessions[cookieVal]['userID'])
            // Check if user is administrator
            if (user_query.length !== 0 && user_query.role === 'administrator'){
                product_schema = schemas.Products
                product_query = await product_schema.find({})
                resp.setHeader('Content-Type', 'application/json')
                resp.send(JSON.stringify({
                    products: product_query
                }))
            }
        }
    }
})






router.post('/update_user_details', async(req, resp) => {
    const decrypt_data = async(data) => {
        return crypto.privateDecrypt(
            {
                key: process.env.PRIVATE_KEY,
                passphrase: process.env.PASSPHRASE_PRIV_KEY,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: "sha256"
            },
            data
        ).toString('utf-8')
    }

    const { cookie } = req.headers
    const sesCookie = getCookie.parse(cookie)['ses']

    if (sesCookie !== undefined){
        const cookieVal = sesCookie.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g).toString()
        if (sessions[cookieVal] !== undefined){ // If cookie is in sessions
            var user_schema = schemas.Users
            var user_query = await user_schema.findById(sessions[cookieVal]['userID'])
            if (user_query.length !== 0){
                user_details = req.body
                try {
                    const [decrypted_first_name, decrypted_last_name, 
                        decrypted_dob, decrypted_email, decrypted_phone_number, decrypted_password] = await Promise.allSettled([
                            decrypt_data(user_details.first_name),
                            decrypt_data(user_details.last_name),
                            decrypt_data(user_details.dob),
                            decrypt_data(user_details.email),
                            decrypt_data(user_details.phone),
                            decrypt_data(user_details.password)
                        ])
                    user_query.first_name = decrypted_first_name
                    user_query.last_name = decrypted_last_name
                    user_query.dob = decrypted_dob
                    user_query.email = decrypted_email
                    user_query.phone = decrypted_phone_number
                    user_query.password = crypto.createHash('sha256').update(decrypted_password).digest('hex')
                    await user_query.save()
                    resp.status(200).send("")
                } catch (error) {
                    console.log(error)
                    resp.status(500).send("Failed")
                }
            }
        }
    }
})


//todo
// add log file
// encrypt user data!
// add user dashboard
// add admin dashboard
// 




//password for admin q&#U^J&Vz7P
// email for admin is admin@securecart.co.uk
// 4111111111111111