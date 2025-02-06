const mongoose = require('mongoose')
const Schema = mongoose.Schema
const userSchema = new Schema({
    username: {type: String, required: true},
    first_name: {type: String, required: true},
    last_name: {type: String, required: true},
    dob: {type: String, required: true}, // dd/mm/yy
    billing_address: [{
        street: String,
        town: String,
        postcode: String
    }],
    shipping_address: [{
        street: String,
        town: String,
        postcode: String
    }],
    email: {type: String, required: true, 
        validator: function(val) {
            return /^\S+@\S+\.\S+$/.test(val);
        }
    },
    phone: {type: String, required: true},
    password: {type: String, required: true},
    cart_items: [{
            product_id: mongoose.Types.ObjectId, 
            quantity: Number
    }],
    orders: [{
        order_id: mongoose.Types.ObjectId,
        order_status: String, // "pending", "dispatched", "delivered", "failed_delivery"
        order_date: Date, 
        order_total: Number, // No floating points are used, order total is represented in pennies
        product: [{
            product_id: mongoose.Types.ObjectId,
            quantity: Number
        }]
    }],
    role: {type: String, default:'customer', required: true}, // Default is customer opposed to administrator
    creation_date: { type: Date, default:Date.now, required: true }
})
const orderSchema = new Schema({
    order_status: String, // "pending", "dispatched", "delivered", "failed_delivery"
    order_date: Date, 
    order_total: Number, // No floating points are used, order total is represented in pennies
    user_id: mongoose.Types.ObjectId,
    product: [{
        product_id: mongoose.Types.ObjectId,
        quantity: Number
    }]
})
const productSchema = new Schema({
    product_name: String,
    description: String,
    price: Number, // No floating points are used, prices are in pennies so divide by 100 to get £
    stock_quantity: Number, // Quantity is a whole number
    image_path: String,
    creation_date: { type: Date, default:Date.now },
    modified_date: { type: Date, default:Date.now },
    tags: [String] 

     
})
const users = mongoose.model('Users', userSchema, 'users')
const orders = mongoose.model('Orders', orderSchema, 'orders')
const products = mongoose.model('Products', productSchema, 'products')

const Schemas = {'Users':users, 'Orders':orders, 'Products':products}
module.exports = Schemas