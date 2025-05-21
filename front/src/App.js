import './App.css';
import Header from './components/Header';
import Basket from './pages/Basket';
import Home from './pages/Home';
import Store from './pages/Store';
import ProductInfo from './pages/ProductInfo';
import Login from './pages/Login';
import Register from './pages/Register';
import Admin from './pages/Admin';
import Logout from './pages/Logout';
import Checkout from './pages/Checkout';
import Dashboard from './pages/Dashboard';
import BasketConProvider from './components/BasketContext';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';

function Layout(){ 
  return (
    <>
      <Header/>
      <Outlet/>
    </>
  )
}

function App() {
// Context.Provider passes user data which will be fetched from databse to each route
  return (
    <>
    <BasketConProvider> 
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route path="/" element={<Home />}/>
            <Route path="/store" element={<Store />}/>
            <Route path="/store/:id" element={<ProductInfo />}/>
            <Route path="/login" element={<Login />}/>
            <Route path="/logout" element={<Logout />}/>
            <Route path="/register" element={<Register />}/>
            <Route path="/basket" element={<Basket/>}/>
            <Route path='/admin_dashboard' element={<Admin />}/>
            <Route path='/dashboard' element={<Dashboard/>}/>
            <Route path='/checkout' element={<Checkout />}/>
          </Route>
        </Routes>
      </BrowserRouter>
    </BasketConProvider>

    </>
  );
}

export default App;
