import { useState } from "react"
import { useNavigate } from "react-router-dom"

export default function Login(){
    const nav = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [pem_public_key, setPubKey] = useState('')

    const fetchPubKey = async() => {
        await fetch('https://localhost:8141/api/pubkey')
        .then(resp => resp.json())
        .then(data => setPubKey(data.pubkey))
    }

    const encryptData = async(data) => {
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

    const submitLogin = async() => {
        
        const encrypted_email = await encryptData(email.target.value)
        const encrypted_password = await encryptData(password.target.value)
        const response = await fetch('https://localhost:8141/submit_login', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: encrypted_email,
                password: encrypted_password
            }),
            credentials: 'include'
        })
        console.log(response)
        if (response.ok) {
            if (response.statusText === 'admin'){
                nav('/admin_dashboard')
            } else if (response.statusText === 'customer') {
                nav('/dashboard')
            }
            console.log("Successful")
        } 


    }

    return (
    <>
        <div className="login-box">
            <h1>Sign In</h1>
            <div className="login-field"> 
                <p>Email</p>
                <input className="login-inputs" type="email" onChange={(e) => setEmail(e)}></input>
                <p>Password</p>
                <input className="login-inputs" type="password" onChange={(e) => setPassword(e)}></input>
                <br/>
            </div>
            <br/>
            <button className="login-button" onClick={() => submitLogin()}>Login</button>
            <br/>
            <br/>
            <button className="register-button" onClick={() => nav('/register')}>Or Register</button>
        </div>
    </>
    )
}