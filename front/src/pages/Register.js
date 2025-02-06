import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
export default function Register(){
    const nav = useNavigate()

    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [phoneNumber, setPhoneNumber] = useState('')
    const [dob, setDob] = useState('')
    const [password, setPassword] = useState('')
    const [pem_public_key, setPubKey] = useState('')

    const [passErrorMessage, setPassErrorMessage] = useState('')
    const [emailErrorMessage, setEmailErrorMessage] = useState('')
    const [validEmail, setValidEmail] = useState(false)
    const [validPassword, setValidPassword] = useState(false)

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

    // Enforces password requirements using regex and length checking
    const handlePassword = async() => {
        if (password.length < 7) {
            setPassErrorMessage('Minimum 8 characters, 1 lowercase, 1 uppercase and 1 special character.')
            setValidPassword(false)
        } else if (/[A-Z]/g.test(password) && /[a-z]/g.test(password) && /[^A-Za-z0-0]/g){ // Checks if special characters are in the password
            setPassErrorMessage('')
            setValidPassword(true)
        }
    }
    
    // Checks if email is valid using regex
    const handleEmail = async() => {
        if (email){
            if (!email.match(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g)){
                setEmailErrorMessage("Email is not valid.")
                setValidEmail(false)
            } else {
                setEmailErrorMessage('')
                setValidEmail(true)
            }
        } else {
            setEmailErrorMessage('')
            setValidEmail(false)
        }
    }

    const submitRegister = async() => {
        if (validEmail && validPassword && firstName && lastName && username && email && phoneNumber && password && dob){
            const encrypted_first_name = await encryptData(firstName)
            const encrypted_last_name = await encryptData(lastName)
            const encrypted_username = await encryptData(username)
            const encrypted_email = await encryptData(email)
            const encrypted_phone_number = await encryptData(phoneNumber)
            const encrypted_password = await encryptData(password)
            const encrypted_dob = await encryptData(dob)

            const response = await fetch('https://localhost:8141/submit_register', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    first_name: encrypted_first_name,
                    last_name: encrypted_last_name,
                    username: encrypted_username,
                    email: encrypted_email,
                    phone_number: encrypted_phone_number,
                    password: encrypted_password,
                    dob: encrypted_dob
                }),
                credentials: 'include'
            })

            if (response.ok) {
                nav('/login')
            } else {
                console.log(response)
            }
        }
    }

    // Execute commands if values change in []
    useEffect(() => {
        handlePassword()
    }, [password])

    useEffect(() => {
        handleEmail()
    }, [email])

    return (
        <>
        <div className="register-box">
            <h1>Register</h1>
            <p style={{
                color: "red"
            }}>{passErrorMessage}</p>
            <div className="register-field">
                <label>First Name</label>
                <input className="register-inputs" type="text" onChange={(e) => setFirstName(e.target.value)}/>
                <label>Last Name</label>
                <input className="register-inputs" type="text" onChange={(e) => setLastName(e.target.value)}/>
                <p>
                    <label>Username</label>
                    <input className="register-inputs" type="text" onChange={(e) => setUsername(e.target.value)}/>
                    <label>Email {emailErrorMessage}</label>
                    <input className="register-inputs" type="email" onChange={(e) => setEmail(e.target.value)}/>
                    <label>Date of Birth</label>
                    <input className="register-inputs" type="text" placeholder="DD/MM/YY" onChange={(e) => setDob(e.target.value)}/>
                </p>
                <p>
                    <label>Phone Number</label>
                    <input className="register-inputs" type="text" maxLength={11} onChange={(e) => setPhoneNumber(e.target.value)}/>
                    <label>Password</label>
                    <input className="register-inputs" type="password" onChange={(e) => setPassword(e.target.value)}/>
                </p>
                <button className="register-button" onClick={() => submitRegister()}>Register</button>
            </div>
        </div>
        </>
    )
}