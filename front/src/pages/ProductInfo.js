import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function ProductInfo (){
    const [product, setProduct] = useState([])
    const params = useParams()

    useEffect(() =>{
        fetchProdData()
    }, [])

    const fetchProdData = async() => {
        await fetch(`https://localhost:8141/products/${params.id}`)
        .then(resp => resp.json())
        .then(data => setProduct(data))
        
    }



    // Should use database here!!
    return(
        <>
            <div className="productInfoBody">
                <div className="productInfoTitle">
                    <h1>Product Information</h1>
                </div>
                <div className="productInfoSplitColumn">
                    <img src={product.image_path} alt={`${product.product_name}`} className="productInfoImage"/>
                </div>
                <div className="productInfoSplitColumn">
                    <div className="productInfoText">
                        <p>{product.product_name}</p>
                        <p>{product.description}</p>
                        <p>£{(product.price/100).toFixed(2)}</p>
                    </div>
                </div>
            </div>
        </>
    )
}