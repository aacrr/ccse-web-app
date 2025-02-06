import React, { useEffect } from "react"
import { useState } from "react"
import { json } from "react-router-dom"
import { useNavigate } from "react-router-dom"

export default function Logout(){
    const nav = useNavigate()

    const [verified, setVerified] = useState(false)
    const [userID, setUserID] = useState(false)
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
            setUserID(json_response)
        } else {
            setVerified(false)
        }
    }

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
            setUserID(false)
        }
        else if (json_response === false) {
            nav('/')
        }
    }

    useEffect(() => {
        checkVerified()
    }, [])

    useEffect(() => {
        if (verified){
            sendLogout()
        }
    }, [verified])

    return (
        <>
        </>
    )
}