import { useState } from "react";
import { FaCaretDown, FaCaretUp } from "react-icons/fa6";
import styles from "./Help.module.scss"
import Article from "../../components/articles";
import { Reveal } from "../../components/reveal";


const Help = () => {
    const[isOpen, setIsOpen] = useState(false)
    const[change, setChange] = useState('criarConta')

    const alternar = () => {
        setIsOpen(!isOpen)
    }

    return (
        <div className={styles.container}>
            <Reveal as="div" className={styles.containerList}>
                <h1>Veja outras dúvidas comuns</h1>
                <button onClick={alternar} className={styles.button}>
                    {isOpen ? <FaCaretUp/> : <FaCaretDown/> }
                </button>

                <ul className={styles.listDesktop}>
                    <li onClick={() => setChange('criarConta')}>Como criar uma conta?</li>
                    <li onClick={() => setChange('gratuito')}>O uso é realmente gratuito?</li>
                    <li onClick={() => setChange('creditCard')}>É necessário cartão de crédito ?</li>
                    <li onClick={() => setChange('allow')}>Quem pode usar o aplicativo ?</li>
                    <li onClick={() => setChange('moreBike')}>Posso alugar mais de uma bicicleta ao mesmo tempo?</li>
                    <li onClick={() => setChange('time')}>Por quanto tempo posso ficar com a bicicleta?</li>
                    <li onClick={() => setChange('timeOut')}>O que acontece se eu ultrapassar o tempo limite?</li>
                    <li onClick={() => setChange('operation')}>Qual o horário de funcionamento?</li>
                    <li onClick={() => setChange('stolen')}>O que acontece se a bicicleta for roubada enquanto está comigo?</li>
                    <li onClick={() => setChange('notReturn')}>O que acontece se eu não devolver a bicicleta?</li>
                    <li onClick={() => setChange('contact')}>Não encontrou o que procurava?</li>
                </ul>
            </Reveal>
            {isOpen && (
                <ul className={styles.list}>
                    <li onClick={() => {setChange('criarConta'); alternar()}}>Como criar uma conta?</li>
                    <li onClick={() => {setChange('gratuito'); alternar()}}>O uso é realmente gratuito?</li>
                    <li onClick={() => {setChange('creditCard'); alternar()}}>É necessário cartão de crédito?</li>
                    <li onClick={() => {setChange('allow'); alternar()}}>Quem pode usar o aplicativo?</li>
                    <li onClick={() => {setChange('moreBike'); alternar()}}>Posso alugar mais de uma bicicleta ao mesmo tempo?</li>
                    <li onClick={() => {setChange('time'); alternar()}}>Por quanto tempo posso ficar com a bicicleta?</li>
                    <li onClick={() => {setChange('timeOut'); alternar()}}>O que acontece se eu ultrapassar o tempo limite?</li>
                    <li onClick={() => {setChange('operation'); alternar()}}>Qual o horário de funcionamento?</li>
                    <li onClick={() => {setChange('stolen'); alternar()}}>O que acontece se a bicicleta for roubada enquanto está comigo ?</li>
                    <li onClick={() => {setChange('notReturn'); alternar()}}>O que acontece se eu não devolver a bicicleta?</li>
                    <li onClick={() => {setChange('contact'); alternar()}}>Não encontrou o que procurava?</li>
                </ul>
            )}
            <Article 
                activeArticle={change}
            />
        </div>
    )
}

export default Help;