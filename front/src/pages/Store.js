import { useContext, useEffect, useState } from 'react'
import React from 'react'
import { BasketContext } from '../components/BasketContext'
export default function Store(){


    const [products, setProducts] = useState([])
    const { dispatch } = useContext(BasketContext)


    useEffect( ()=>{
        fetchProdData()
    },[])



    const fetchProdData = async() => {
        await fetch("https://localhost:8141/products")
        .then(resp => resp.json())
        .then(data => setProducts(data))
        
    }


    return (
        

        <>
            <div className="storeBody">
                <br/>
                <h1>Store</h1>
                
                <div className="storeItems">
                    <ul className="productList">
                        {products.map(products =>
                            <li key={products._id}>
                                <a href={`/store/${products._id}`} className="productItem">
                                    <img src={products.image_path} alt={`${products.product_name}`} className="productImage"/>
                                </a>
                                <br/>
                                <a href={`/store/${products._id}`} className="productLink">{products.product_name}</a>
                                <span className="productPrice">£{(products.price/100).toFixed(2)}</span>
                                <br/>
                                <br/>
                                <button className="addBasket" onClick={()=> 
                                    dispatch({type:"add_to_basket", product_id:products._id})
                                }>
                                    Add to Basket
                                </button>
                            </li>
                        )}
                    </ul>
                </div>
            </div>
        </>
    )
}
