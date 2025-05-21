import { useContext, useState, useEffect } from "react";
import {BasketContext} from './BasketContext';

export default function Header(){
  const { basket } = useContext(BasketContext)
  const [verified, setVerified] = useState(false)
  const [userRole, setUserRole] = useState('customer')
  const [basketTotal, setBasketTotal] = useState(0)
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
    if (json_response.verified === true) {
        setVerified(true)
        setUserRole(json_response.role)
    } else {
        setVerified(false)
    }
}

useEffect(()=> {
  checkVerified()
}, [verified])

useEffect(()=> {
    const getBasketTotal = async () => {
    let basket_total = 0
    basket.forEach(item => (
      basket_total += item.quantity
    ))
    setBasketTotal(basket_total)
  }
  getBasketTotal()
}, [basket])


    return (
      <nav className="navi-bar">
        <ul className="nav-center">
          <li>
            <a href="/">Home</a>
          </li>
          <li>
            <a href="/store">Store</a>
          </li>
        </ul>
        <ul className="nav-right">
          {verified ? (
            <>
            <li>
              <a href="/logout">Logout</a>
            </li>
            <li>
              {userRole === 'administrator' ? (
                <a href="/admin_dashboard">Dashboard</a>
              ) : (
                <a href="/dashboard">Dashboard</a>
              )}
                
              </li>
            </>
          ) : (
            <li>
              <a href="/login">Login</a>
            </li>
          )}
          <li>
            <a href="/basket">Basket: {basket ? basketTotal : 0}</a>
          </li>
        </ul>
      </nav>
    )
  }
