import React, {useContext, useEffect, useState} from "react"
import { BasketContext } from "../components/BasketContext"
import { useNavigate } from "react-router-dom"
import luhn from 'luhn'

export default function Checkout() {
    const nav = useNavigate()
    const { basket } = useContext(BasketContext)
    const { dispatch } = useContext(BasketContext)
    const [basketItems, setBasketItems] = useState([])
    const [verified, setVerified] = useState(false)
    const [errorMessage, setErrorMessage] = useState([])
    const [cardErrorMessage, setCardErrorMessage] = useState('')
    const [pem_public_key, setPubkey] = useState('')
    const [validName, setValidName] = useState(false)
    const [validEmail, setValidEmail] = useState(false)
    const [validCard, setValidCard] = useState(false)
    
    // Form states
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [email, setEmail] = useState("")

    const [shippingStreet, setShippingStreet] = useState("")
    const [shippingTown, setShippingTown] = useState("")
    const [shippingPostcode, setShippingPostcode] = useState("")

    const [billingStreet, setBillingStreet] = useState("")
    const [billingTown, setBillingTown] = useState("")
    const [billingPostcode, setBillingPostcode] = useState("")

    const [sameAddressCheckbox, setSameAddressCheckbox] = useState(false)

    const [cardNumber, setCardNumber] = useState('')
    const [cardExpiryDate, setCardExpiryDate] = useState('')

    const fetchPubKey = async() => {
        await fetch('https://localhost:8141/api/pubkey')
        .then(resp => resp.json())
        .then(data => setPubkey(data.pubkey))
    }

    const encryptData = async(data) => {
        // Encrypting the data before it sent.
        await fetchPubKey()
        const b64_public_key = pem_public_key.replace('-----BEGIN PUBLIC KEY-----','').replace('/\\n/g', '').replace('-----END PUBLIC KEY-----','')
        const string_public_key = atob(b64_public_key)
        const array_public_key = new Uint8Array(string_public_key.length)
        for (let i=0; i<string_public_key.length; i++){
            array_public_key[i] = string_public_key.charCodeAt(i)
        }

        const import_pub_key = await crypto.subtle.importKey(
            'spki',
            array_public_key,
            {
                name:'RSA-OAEP',
                hash: 'SHA-256'
            },
            true,
            ['encrypt']
        )

        const encrypted_data = await crypto.subtle.encrypt(
            {
                name: 'RSA-OAEP'
            },
            import_pub_key,
            new TextEncoder().encode(data)
        )
        return btoa(String.fromCharCode(...new Uint8Array(encrypted_data)))
    }

    const submitData = async(formData) => {
        if (validEmail && validName && validCard){

            const encrypted_b_street = await encryptData(formData.get("billingStreet"))
            const encrypted_b_town = await encryptData(formData.get("billingTown"))
            const encrypted_b_postcode = await encryptData(formData.get("billingPostcode"))

            const encrypted_s_street = await encryptData(formData.get("shippingStreet"))
            const encrypted_s_town = await encryptData(formData.get("shippingTown"))
            const encrypted_s_postcode = await encryptData(formData.get("shippingPostcode"))

            const encrypted_total_price = await encryptData(formData.get("totalPrice"))

            const encrypted_card_number = await encryptData(formData.get("cardNumber"))
            const encrypted_card_expiry = await encryptData(formData.get("cardExpiryDate"))


            const response = await fetch('https://localhost:8141/order_purchase', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    billing_address: [{
                        street: encrypted_b_street,
                        town: encrypted_b_town,
                        postcode: encrypted_b_postcode
                    }],
                    shipping_address: [{
                        street: encrypted_s_street,
                        town: encrypted_s_town,
                        postcode: encrypted_s_postcode
                    }],
                    product: [...basket],
                    total_price: encrypted_total_price,
                    card_details: [{
                        card_number: encrypted_card_number,
                        card_expiry: encrypted_card_expiry
                    }]
                }),
                credentials: 'include'
            })
            if (response.ok){
                dispatch({type:"clear_basket"})
                nav('/store')
            } else {}
        } 
        
    }

    const checkVerified = async() => {
        // Checks if user is logged in using the secure cookie which is only accessible by the backend
        const response = await fetch('https://localhost:8141/authenticate_user', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        })
        const json_response = await response.json()
        if (json_response.verified === true){
            setVerified(true)
        } else {
            setVerified(false)
        }

    }

    
    


    // Function sets the shipping address to billing address if chosen
    const handleSameAddress = async() => {
        setSameAddressCheckbox(!sameAddressCheckbox)
        if (billingStreet && billingTown && billingPostcode){
            setShippingStreet(billingStreet)
            setShippingTown(billingTown)
            setShippingPostcode(billingPostcode)
        }
    }

    // Use effect updates when there is changes to the state in []
    useEffect(() => {
        const fetchBasketData = async() => {
        const fetchAll = basket.map(prod => 
            fetch(`https://localhost:8141/products/${prod.product_id}`)
            .then(resp => resp.json())
        )
        setBasketItems(await Promise.all(fetchAll))
        }

        
        const checkEmptyBasket = async() => {
            if (basketItems.length === 0 && basket.length === 0){
                // Redirect to basket if there is no items in the basket
                nav('/basket')
            }
        }   

        if (basketItems.length === 0 && basket.length > 0){
            fetchBasketData()
        }
        checkEmptyBasket()
    }, [basket, basketItems.length, nav])

    useEffect(() => {
        checkVerified()
    }, [verified])

    useEffect(() => {
        // Function validates the name input field ensuring that it contains alphabetical characters
    const handleName = async() => {
        let eMessage = "Names must only contain alphabetical characters."
            if (firstName || lastName){
                if (firstName.match(/[^a-zA-Z]/g) || lastName.match(/[^a-zA-Z]/g)){
                    setErrorMessage((errorMessage) => {
                        if (!errorMessage.includes(eMessage)){
                            return [...errorMessage, eMessage]
                        }
                        return errorMessage
                    })
                } else {
                    setErrorMessage((errorMessage) => errorMessage.filter((msg) => msg !== eMessage))
                    setValidName(true)
                }
            } else {
                setErrorMessage((errorMessage) => errorMessage.filter((msg) => msg !== eMessage))
                setValidName(true)
            }
        }

        handleName()
    }, [firstName, lastName])

    useEffect(() => {
        // Function validates email address inputted using regex
        const handleEmail = async() => {
            if (email){
                if (!email.match(/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/g) && !errorMessage.includes("Email is not valid.")){
                    setErrorMessage([...errorMessage, "Email is not valid."])
                    setValidEmail(false)
                } else {
                    setErrorMessage([...errorMessage.filter(i => i !== "Email is not valid.")])
                    setValidEmail(true)
                }
            } else {
                setErrorMessage([...errorMessage.filter(i => i !== "Email is not valid.")])
                setValidEmail(false)
            }
        }

        handleEmail()
    }, [email, errorMessage])

    useEffect(() => {
        // This function checks if a card number is valid using luhns algorithm
        const handleCard = async() => {
            const isValid = luhn.validate(cardNumber.toString().trim())
            setValidCard(isValid)
            if (cardNumber){
                if (isValid && cardNumber.length === 16){
                    setCardErrorMessage('')
                } else {
                    setCardErrorMessage('Card number is invalid.')
                }
            } else {
                setCardErrorMessage('')
            }
        }

        handleCard()
    }, [cardNumber])



    let totalPrice = 0
    
    const counter = {}
    const IDs = basket.map(i => i.product_id)
    const quantities = basket.map(i => i.quantity)
    IDs.forEach((key, idx) => {
        counter[key] = quantities[idx]
    })

    basketItems.forEach(item => (
        totalPrice += item.price * counter[item._id]
    ))


    return (
        <>
        <div className="checkoutBody">
            <div className="checkoutContainer">
                <div className="checkoutTitle">
                    <h1>Checkout</h1>
                </div>
                <div className="checkoutCol1">
                    <div className="paymentTitle">
                        <h2>Payment Information</h2>
                        <p style={{
                            color: "red"
                        }}>{errorMessage}</p>
                    </div>
                    <div className="paymentDetails">
                        <form onSubmit={(e) => {
                            e.preventDefault()
                            const formData = new FormData()
                            formData.append("billingStreet", billingStreet)
                            formData.append("billingTown", billingTown)
                            formData.append("billingPostcode", billingPostcode)
                            formData.append("shippingStreet", shippingStreet)
                            formData.append("shippingTown", shippingTown)
                            formData.append("shippingPostcode", shippingPostcode)
                            formData.append("totalPrice", totalPrice)
                            formData.append("cardNumber", cardNumber)
                            formData.append("cardExpiryDate", cardExpiryDate)
                            submitData(formData)
                        }}>
                            <p>
                                <label>First Name</label>
                                <input type="text" name="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required/>
                                <label>Last Name</label>
                                <input type="text" name="lastname" value={lastName} onChange={(e) => setLastName(e.target.value)} required/>
                            </p>
                            <label>Email address</label>
                            <input type="email" name="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required/>
                            <hr style={{
                                width:"95%"
                            }}/>
                            <div className="checkoutAddresses">
                                <div className="billingAddress">
                                    <h3>Billing address</h3>
                                    <p>
                                        <label>Street</label>
                                        <input type="text" name="billingStreet" value={billingStreet} onChange={e => setBillingStreet(e.target.value)} required/>
                                    </p>
                                    <p>
                                        <label>Town</label>
                                        <input type="text" name="billingTown" value={billingTown} onChange={e => setBillingTown(e.target.value)} required/>
                                    </p>
                                    <p>
                                        <label>Postcode</label>
                                        <input type="text" name="billingPostcode" value={billingPostcode} onChange={e => setBillingPostcode(e.target.value)} required/>
                                    </p>
                                </div>
                                <div className="shippingAddress">
                                    <h3>Shipping address</h3>
                                    <p>
                                        <label>Street</label>
                                        <input type="text" name="shippingStreet" value={shippingStreet} onChange={e => setShippingStreet(e.target.value)} required/>
                                    </p>
                                    <p>
                                        <label>Town</label>
                                        <input type="text" name="shippingTown" value={shippingTown} onChange={e => setShippingTown(e.target.value)} required/>
                                    </p>
                                    <p>
                                        <label>Postcode</label>
                                        <input type="text" name="shippingPostcode" value={shippingPostcode} onChange={e => setShippingPostcode(e.target.value)} required/>
                                        
                                    </p>
                                </div>
                            </div>
                            <div className="sameAddress">
                                <label>Same billing as shipping address?</label>
                                <input type="checkbox" checked={sameAddressCheckbox} onChange={()=> 
                                    handleSameAddress()
                                }/>
                            </div>
                        
                            <hr style={{
                                width:"95%",
                            }}/>

                            <div className="cardDetailsErrorMessage" style={{
                                textAlign: "center"
                            }}>
                                <p style={{
                                    color: "red"
                                }}>{cardErrorMessage}</p>

                            </div>

                            <div className="cardDetails">
                                <h3>Card Details</h3>
                                <p>
                                    <label>Card Number</label>
                                    <input className="cardNumber" placeholder="1234 1234 1234 1234" maxLength={16} onChange={e => setCardNumber(e.target.value)} required/>
                                </p>
                                <p>
                                    <label>Holder Name</label>
                                    <input className="cardHolderName" placeholder="John Doe" required/>
                                </p>
                                <p>
                                    <label>Expiry Date</label>
                                    <input className="cardExpiryDate" placeholder="12/25" onChange={e => setCardExpiryDate(e.target.value)} required/>
                                </p>
                                <p>
                                    <label>CVV</label>
                                    <input className="cardCVV" placeholder="333" maxLength={3} required/>
                                </p>

                            </div>



                            <div className="checkoutButtonContainer">
                                <button className="checkoutButton"type="submit">Pay</button>
                            </div>
                        </form>
                    </div>
                </div>
                <div className="checkoutCol2">
                    <div className="basketSummaryTitle">
                        <h2>Basket Summary</h2>
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
                </div>
            </div>
        </div>
        </>
    )
}
