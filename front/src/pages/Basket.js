import React, { useContext, useEffect, useState } from "react"
import { BasketContext } from "../components/BasketContext"
import { useNavigate } from "react-router-dom"

export default function Basket(){
    const nav = useNavigate()
    const { basket } = useContext(BasketContext)
    const { dispatch } = useContext(BasketContext)
    const [basketItems, setBasketItems] = useState([]) // This is the basket but with product information

    const fetchBasketData = async() => {
        const fetchAll = basket.map(item => 
            fetch(`https://localhost:8141/products/${item.product_id}`) // Gets product info from basket
            .then(resp => resp.json())                                  // so that images, price and product name appear
        )
        setBasketItems(await Promise.all(fetchAll))
    }

    useEffect(() => {
        if (basketItems.length === 0 && basket.length > 0){
            fetchBasketData() // Fetches basket data if there are items in the basket and not in basketItems
        }
    }, [basket])

    let totalPrice = 0
    
    const counter = {}
    const IDs = basket.map(i => i.product_id)
    const quantities = basket.map(i => i.quantity)
    IDs.forEach((key, idx) => {
        counter[key] = quantities[idx]
    })

    basketItems.forEach(item => ( // Calculates total price
        totalPrice += item.price * counter[item._id]
    ))
    

    // Function that handles the quantity update, which sends to basket context
    const handleQuantUpdate = async(e, product_id) => {
        const newQuant = e.target.value
        if (newQuant.match(/[^0-9]/g)){ // If there are other characters than a number
            const sanitisedQuant = parseInt(newQuant.match(/[0-9]/g).toString()) // Sanitise input to get only numbers
            if ((sanitisedQuant.toString().length <= 2) && (newQuant !== 0)){
                dispatch({type:"update_basket_quantity", product:product_id, newQuantity:newQuant})
            }
        } else if (newQuant.length <= 2) {
            if (newQuant === '0'){
                dispatch({type:"remove_from_basket", product:product_id})
            } else if (newQuant !== 0){
                dispatch({type:"update_basket_quantity", product:product_id, newQuantity:newQuant})
            }
        }
    }


    const handleCheckout = async() => {
        if (basketItems.length !== 0 && basket.length !== 0){
            // If user does not have items in basket then it does not allow to visit checkout page
            nav('/checkout')
        }
    }

    return (
        <>
        <div className="basketBody">
            <div className="basketContainer">
                <div className="basketTitle">
                    <h1>Basket</h1>
                </div>
                <div className="basketCol1">
                    {basketItems.map(products => (
                        <div className="basketRow">
                            <div className="basketRowCol1">
                                <a href={`/store/${products._id}`} className="basketItem">
                                    <img src={products.image_path} alt={`${products.product_name}`} className="basketImage"/>
                                </a>
                            </div>
                            <div className="basketRowCol2">
                                <p>{products.product_name}</p>
                                <p>£{(products.price/100).toFixed(2)}</p>
                            </div>
                            <div className="basketRowCol3">
                                <div className="basketQuantity">
                                    <p className="basketQuantityName">Quantity: {counter[products._id]}</p>
                                    <input className="basketQuantInp" defaultValue={counter[products._id]} onBlur={(e) => handleQuantUpdate(e, products._id)} maxLength="2"></input>
                                </div>
                                <button className="removeItem" onClick={()=> 
                                    dispatch({type:"remove_from_basket", product:products._id})
                                }>
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="basketCol2">
                    <div className="basketSummaryTitle">
                        <h1>Basket Summary</h1>
                    </div>
                    <div className="basketSummary">
                        <div className="basketSummaryCol1">
                            {basketItems.map(products => (
                                <p>{products.product_name} ({counter[products._id]})</p>
                            ))}
                            <p>Total</p>
                        </div>
                        <div className="basketSummaryCol2">
                        {basketItems.map(products => (
                                <p>£{((products.price*counter[products._id])/100).toFixed(2)}</p>
                            ))}
                            <p>£{(totalPrice/100).toFixed(2)}</p>
                        </div>
                    </div>
                    <div className="basketCheckout">
                        <button className="checkoutButton" onClick={()=> 
                            handleCheckout()
                        }>
                        Checkout
                        </button>

                    </div>
                </div>
            </div>
        </div>
        </>
    )
}