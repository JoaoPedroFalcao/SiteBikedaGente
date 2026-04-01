import { useState } from 'react';
import Base from '../assets/Mapa.png'
import Trava from '../assets/Trava.png'
import Historico from '../assets/Historico.png'
import Estacao from '../assets/Estacao.png'
import styles from './app.module.scss'

const App = () => { 
    const [screen, setScreen] = useState(Base);

    return (
        <div className={styles.containerApp}>
            <img src={screen} alt="tela do aplicativo" />
            <ul>
                <li>
                    <button onClick={() => setScreen(Base)}></button>
                    <p>Mapa</p>
                </li>
                <li>
                    <button onClick={() => setScreen(Trava)}></button>
                    <p>Desbloqueio Inteligente</p>
                </li>
                <li>
                    <button onClick={() => setScreen(Historico)}></button>
                    <p>Histórico das Corridas</p>
                </li>
                <li>
                    <button onClick={() => setScreen(Estacao)}></button>
                    <p>Bicicletas Disponíveis</p>
                </li>
            </ul>
        </div>
    )
}

export default App;