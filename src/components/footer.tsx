import styles from "./footer.module.scss"
import logo from "../assets/Logo.svg"

const Footer = () => { 
    return (
        <footer className={styles.footer}>
            <a href="#"><img className={styles.logo} src={logo} alt="logo do site" /></a>
            <p>Copyright 2025 © UnoBike. Todos os direitos reservados</p>
        </footer>
    )
}

export default Footer;
