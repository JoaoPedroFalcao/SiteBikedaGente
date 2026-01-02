import Footer from "./components/footer";
import Header from "./components/header";
import Router from './routes/Router'
import ScrollToTop from "./components/scrollToTop";
import { useLocation } from "react-router-dom";

const App = () => {
    const location = useLocation();

    return (
        <>
            <ScrollToTop/>

            <Header/>
            <main key={location.pathname}>
                <Router/>
            </main>
            <Footer/>
        </>
    )
}

export default App;