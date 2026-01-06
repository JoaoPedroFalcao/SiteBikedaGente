import { useState } from 'react'
import { Link } from 'react-router-dom'
import MainLogo from "../assets/MainLogo.png"
import styles from './header.module.scss'
import { Sling } from 'hamburger-react'



const Header = () => {
    const [isOpen, setIsOpen] = useState(false);

    const storeButtonClick = () => {
        const userAgent = navigator.userAgent;
        const androidUrl = "https://play.google.com/store/apps/details?id=com.unobike.bikedagenteguapi&utm_source=latam_Med";
        const iosUrl = "https://apps.apple.com/br/app/bike-da-gente-guapi/id6751255440";

        if (/android/i.test(userAgent)) {
            window.location.href = androidUrl;
        }
        else if (/ipad|iphone|ipod|macintosh/i.test(userAgent) && !(window as any).MSStream) {
            window.location.href = iosUrl;
        }
        else {
            window.location.href = androidUrl;
        }
    }
    
    return (
        <header className={styles.header}>
            <Link to='/'><img className={styles.logo} src={MainLogo} alt=" logo do site" /></Link>
            <nav className={styles.nav}>
               <div className={styles.hamburguerIcon}>
                    <Sling 
                        toggled={isOpen}      
                        toggle={setIsOpen}    
                        size={28}            
                        color="#333"           
                        duration={0.3}        
                    />
                </div>
               
                <ul className={`${styles.navMenu} ${isOpen ? styles.open : ''}`} aria-expanded={isOpen}>
                    <li><Link to='/'>HOME</Link></li>
                    <li><Link to='/Help'>AJUDA</Link></li>
                    <li><Link to='/PrivacyPolicy'>POLÍTICA DE PRIVACIDADE</Link></li>
                    <li className={styles.appButton} onClick={storeButtonClick}>BAIXE O APP</li>
                </ul>
            </nav>
        </header>
    )
}

export default Header;