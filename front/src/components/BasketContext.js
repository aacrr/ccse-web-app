import React, { createContext, useEffect, useReducer } from 'react'
export const BasketContext = createContext()

const BasketConProvider = ({ children }) => {
    const [basket, dispatch] = useReducer(BasketReducer, [], () => {
        const storedBasket = sessionStorage.getItem("basket")
        return storedBasket ? JSON.parse(storedBasket) : []
    })

    useEffect(() => {
        sessionStorage.setItem("basket", JSON.stringify(basket))
    }, [basket])

    return (
        <BasketContext.Provider value ={{basket, dispatch}}>
            { children }
        </BasketContext.Provider>
    )

}

const BasketReducer = (basket, action) => {
    const sendToBasket = async(basketItems) => {
        const response = await fetch('https://localhost:8141/add_to_basket', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                basket: basketItems
            }),
            credentials: 'include'
        })
        console.log(response)
        if (response.ok){
            console.log("successfully added to basket")
        } else {
            console.log("unable to add to basket")
        }
    }

    switch(action.type){
        case "add_to_basket": // Adds to basket from the store page
            if (basket.filter(i => i.product_id === action.product_id).length === 0){ 
                // If the item does not exist already in basket
                sendToBasket([...basket, {product_id: action.product_id, quantity: 1}])
                return [...basket, {product_id: action.product_id, quantity: 1}]
            } else if (basket.filter(i => i.product_id === action.product_id)[0].quantity >= 1){
                // If item is already in the basket, within the store page.
                let prod_idx = basket.findIndex(i => i.product_id === action.product_id)
                basket[prod_idx].quantity += 1
                sendToBasket([...basket])
                return [...basket]
            }
            break
        case "remove_from_basket":
            sendToBasket([...basket.filter(i => i.product_id !== action.product)])
            return [...basket.filter(i => i.product_id !== action.product)]
            // Filters the list to remove the selected product
        case "update_basket_quantity":
            if (action.newQuantity > 0){
                // Updates product quantity
                let prod_idx = basket.findIndex(i => i.product_id === action.product) 
                basket[prod_idx].quantity = parseInt(action.newQuantity)
                sendToBasket([...basket])
                return [...basket]
            } else if (action.newQuantity === 0){
                // Filters the basket to remove the item if item quantity is zero
                sendToBasket([...basket.filter(i => i.product_id !== action.product)])
                return [...basket.filter(i => i.product_id !== action.product)]
            } else if (action.newQuantity < 0){
                // If new_quantity is less than zero, the original basket will be returned to prevent errors
                sendToBasket([...basket])
                return [...basket]
            }
            break
        case "clear_basket":
            sendToBasket([])
            return []

        default:
            break
    }
}

export default BasketConProvider
