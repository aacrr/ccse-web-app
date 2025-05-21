import React, { useEffect } from "react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

export default function Logout(){
    const nav = useNavigate()

    const [verified, setVerified] = useState(false)
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
        if (json_response !== false) {
            setVerified(true)
        } else {
            setVerified(false)
        }
    }

    useEffect(() => {
        checkVerified()
    }, [])

    useEffect(() => {
        const sendLogout = async() => {
            const response = await fetch('https://localhost:8141/logout_user', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            })

            const json_response = await response.json()

            // Return to home page 
            if (json_response === true) {
                nav('/')
                setVerified(false)
            }
            else if (json_response === false) {
                nav('/')
            }
        }
        if (verified){
            sendLogout()
        }
    }, [verified, nav])

    return (
        <>
        </>
    )
}
