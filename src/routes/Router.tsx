import { Route, Routes } from 'react-router-dom'
import Home from '../pages/home/Home'
import PrivacyPolicy from '../pages/privacyPolicy/PrivacyPolicy'
import Help from '../pages/help/Help'

const Router = () => {
    return (
        <Routes>
            <Route path='/' element ={<Home/>} />
            <Route path='/PrivacyPolicy' element={<PrivacyPolicy/>} />
            <Route path='/Help' element={<Help/>} />
        </Routes>
    )
}

export default Router;

