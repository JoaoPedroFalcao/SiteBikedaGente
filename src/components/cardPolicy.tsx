import { useState } from "react"
import styles from "./cardPolicy.module.scss"
import { FaCaretDown, FaCaretUp } from "react-icons/fa6";


type props = {
    paragraph: string
    title: string
}

const CardPolicy = ( {paragraph, title}: props) => {
    
    const [isOpen, setIsOpen] = useState(false);

    const alternar = () => {
        setIsOpen(!isOpen);
    }

    return (
        <div className={styles.policyContainer}>
            <div className={styles.header}>
                <h2>{title}</h2>
                <button onClick={alternar} className={styles.button}>
                    {isOpen ? (
                        <>
                            <p>Ocultar</p> 
                            <FaCaretUp />
                        </>
                        
                        
                        ) : 
                        (<>
                            <p>Expandir</p> 
                            <FaCaretDown/>
                        </>)
                    }
                </button>
            </div>
            {isOpen && (
                <div className={styles.content}>
                    <p>
                        {paragraph}
                    </p>
                </div>
            )}
        </div>
    )
}

export default CardPolicy;