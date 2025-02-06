import { useState, useEffect } from "react" 

export default function Admin() {
    const [verified, setVerified] = useState(false) 
    const [userID, setUserID] = useState('') 
    const [orders, setOrders] = useState([]) 
    const [users, setUsers] = useState([])
    const [products, setProducts] = useState([])
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

    // Checks if user is logged in as admin
    const checkVerified = async () => {
        const response = await fetch('https://localhost:8141/authenticate_user', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        }) 
        try {
            const json_response = await response.json() 
            if (json_response.role === 'administrator') {
                setVerified(true) 
                setUserID(json_response.userID) 
            } else {
                setVerified(false) 
            }
        } catch (error) {}
    } 

    // Get all orders from database
    const getOrders = async () => {
        const response = await fetch('https://localhost:8141/get_orders', {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        }) 
        try {
            const json_response = await response.json() 
            if (json_response.orders) {
                setOrders(json_response.orders) 
            }
        } catch (error) {}
    } 

    // Gets all products from database
    const getProducts = async() => {
        const response = await fetch('https://localhost:8141/get_products', {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        })
        try {
            const json_response = await response.json()
            if (json_response.products){
                setProducts(json_response.products)
            }
        } catch (error) {}
    }

    // Gets all users from database
    const getUsers = async() => {
        const response = await fetch('https://localhost:8141/get_users', {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        }) 
        try {
            const json_response = await response.json()
            if (json_response.users){
                setUsers(json_response.users)
            }
        } catch (error) {}
    }


    // Updates status of an order.
    const updateOrderStatus = async (orderId, newStatus) => {
        const response = await fetch('https://localhost:8141/update_order_status', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                order_id: orderId, 
                order_status: newStatus 
            }),
            credentials: 'include',
        }) 
        try {
            const json_response = await response.json() 
            if (json_response.success) {
                setOrders(prevOrders =>
                    prevOrders.map(order =>
                        order.order_id === orderId ? { ...order, order_status: newStatus } : order
                    ) // This updates the specific order status, locally so it appears on the website
                )     // if it has sucessfully updated in the database
            } else {
                setOrders([])
            }
        } catch (error) {}
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


    // Checks if an email is valid 
    const handleEmail = async() => {
        if (email){
            if (!email.match(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g)){
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


    useEffect(() => {
        checkVerified() 
    }, []) 

    useEffect(() => {
        if (verified) {
            getOrders()
            getUsers() 
            getProducts()
        }
    }, [verified]) 

    useEffect(() => {
        handleEmail()
    }, [email])

    return (
        <>
            {verified ? (
                <div className="adminDashboard">
                    <h1>Admin Dashboard</h1>
                    <div className="adminCol1">
                        <h2>Orders</h2>
                        {orders.length > 0 ? (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Order ID</th>
                                        <th>Price</th>
                                        <th>Status</th>
                                        <th>New Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map(order => (
                                        <tr key={order._id}>
                                            <td>{order._id}</td>
                                            <td>£{(order.order_total/100).toFixed(2)}</td>
                                            <td>{order.order_status}</td>
                                            <td>
                                                <select
                                                    value={order.order_status}
                                                    onChange={e =>
                                                        updateOrderStatus(
                                                            order._id,
                                                            e.target.value
                                                        )}
                                                >
                                                    <option value="pending">Pending</option>
                                                    <option value="dispatched">Dispatched</option>
                                                    <option value="delivered">Delivered</option>
                                                    <option value="failed_delivery">Failed Delivery</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p>No orders</p>
                        )}
                        <div className="adminProducts">
                            <h2>Products</h2>
                            {products.length > 0 ? (
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Product ID</th>
                                            <th>Name</th>
                                            <th>Price</th>
                                            <th>Quantity</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products.map(product => (
                                            <tr key={product._id}>
                                                <td>{product._id}</td>
                                                <td>{product.product_name}</td>
                                                <td>£{(product.price / 100).toFixed(2)}</td>
                                                <td>{product.stock_quantity}</td>
                                            </tr>
                                        ))}
                                    </tbody> 
                                </table>
                            ) : (
                                <p>No products available</p>
                            )}
                        </div>
                    </div>
                    <div className="adminCol2">
                        <h2>Users</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th>Username</th>
                                    <th>User ID</th>
                                    <th>Role</th>
                                    <th>Orders</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user._id}>
                                        <td>{user.username}</td>
                                        <td>{user._id}</td>
                                        <td>{user.role}</td>
                                        <td>
                                            {user.orders.length > 0 ? (
                                                <ul>
                                                    {user.orders.map(order => (
                                                        <li key={order.order_id}>
                                                            Order ID: {order.order_id}<br/> 
                                                            Status: {order.order_status}
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <span>No orders</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    
                        <div className="adminDetails">
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
                            <h2>Edit Admin Details</h2>
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
                <p>User not authenticated</p>
            )}
        </>
    ) 
}
