import { useState, useEffect } from "react"
export default function Dashboard() {
    const [verified, setVerified] = useState(false)
    const [orders, setOrders] = useState([])

    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [dob, setDob] = useState('')
    const [phone, setPhone] = useState('')
    const [password, setPassword] = useState('')
    const [pem_public_key, setPubkey] = useState('')
    const [validEmail, setValidEmail] = useState(false)
    const [errorMesssage, setErrorMessage] = useState('')
    const [message, setMessage] = useState('')


    // Check if user is verified to access this page
    const checkVerified = async() => {
        const response = await fetch('https://localhost:8141/authenticate_user', {
            method:'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        })
        const json_response = await response.json()
        try {
            if (json_response.role === 'customer'){
                setVerified(true)
            } else {
                setVerified(false)
            }
        } catch (error) {
            console.log(error)
        }
    }

    // Function to get orders
    const getOrders = async() => {
        const response = await fetch('https://localhost:8141/get_orders', {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        })
        const json_response = await response.json()
        try {
            if (json_response.orders){
                setOrders(json_response.orders)
            } 
        } catch (error){
            console.log(error)
        }
    }
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
        if (validEmail){

            const encrypted_first_name = await encryptData(formData.get("firstName"))
            const encrypted_last_name = await encryptData(formData.get("lastName"))
            const encrypted_dob = await encryptData(formData.get("dob"))
            const encrypted_email = await encryptData(formData.get("email"))
            const encrypted_phone = await encryptData(formData.get("phone"))
            const encrypted_password = await encryptData(formData.get("password"))

            const response = await fetch('https://localhost:8141/update_user_details', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    first_name: encrypted_first_name,
                    last_name: encrypted_last_name,
                    dob: encrypted_dob,
                    email: encrypted_email,
                    phone: encrypted_phone,
                    password: encrypted_password
                }),
                credentials: 'include'
            })

            if (response.ok){
                setMessage('Successfully updated')
            } else {
                setMessage('Failed to update details')
            }
        } 
        
    }
    
    useEffect(() => {
        checkVerified()
    }, [])

    useEffect(() => {
        if (verified){
            getOrders()
        }
    }, [verified])
    

    useEffect(() => {
        // Checking if email inputted is valid
        const handleEmail = async() => {
            if (email){
                if (!email.match(/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/g)){
                    setErrorMessage("Email is not valid.")
                    setValidEmail(false)
                } else {
                    setErrorMessage('')
                    setValidEmail(true)
                }
            } else {
                setErrorMessage('')
                setValidEmail(false)
            }
        }

        handleEmail()
    }, [email])

    return (
        <>
            {verified ? (
                <div className="userDashboard">
                    <h1>User Dashboard</h1>
                    <div className="userDashCol1">
                        <h2>Orders</h2>
                        {orders.length > 0 ? (
                            <ul>
                                {orders.map(order => (
                                    <li key={order.order_id} className="orderItem">
                                        <p><strong>Order ID:</strong> {order.order_id}</p>
                                        <p><strong>Date:</strong> {new Date(order.order_date).toUTCString()}</p>
                                        <p><strong>Status:</strong> {order.order_status}</p>
                                        <h4>Products:</h4>
                                        <ul>
                                            {order.product.map(product => (
                                                <li className="orderItem" key={product._id}>
                                                    <p><strong>Product ID:</strong> {product.product_id}</p>
                                                    <p><strong>Quantity:</strong> {product.quantity}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>No orders</p>
                        )}
                    </div>
                    <div className="userDashCol2">
                    <div className="userDetails">
                            <form onSubmit={(e) => {
                                e.preventDefault()
                                const formData = new FormData()
                                formData.append("firstName", firstName)
                                formData.append("lastName", lastName)
                                formData.append("dob", dob)
                                formData.append("email", email)
                                formData.append("phone", phone)
                                formData.append("password", password)
                                submitData(formData)
                            }}>
                            <h2>Edit Details</h2>
                            <p>{message}</p>
                            <label>First Name</label>
                            <input type="text" name="firstName" onChange={(e) => setFirstName(e.target.value)}/>

                            <label>Last Name</label>
                            <input type="text" name="lastName" onChange={(e) => setLastName(e.target.value)}/>
                            <br/>
                            <label>Date of Birth</label>
                            <input type="text" name="dob" placeholder="dd/mm/yy" onChange={(e) => setDob(e.target.value)}/>

                            <label>Email {errorMesssage}</label>
                            <input type="email" name="email" onChange={(e) => setEmail(e.target.value)}/>
                            <br/>
                            <label>Phone</label>
                            <input type="text" name="phone" onChange={(e) => setPhone(e.target.value)}/>

                            <label>Password</label>
                            <input type="password" name="password" onChange={(e) => setPassword(e.target.value)}/>
                            <p>
                                <button type="submit">Submit</button>
                            </p>
                            </form>
                        </div>
                    </div>
                </div>
            ) : (
                <p>Not verified</p>
            )}
        </>
    )
}
