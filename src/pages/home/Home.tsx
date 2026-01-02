import styles from "./Home.module.scss"
import ImgBike from "../../assets/BikeImg.png"
import MapStation from "../../components/mapStation"
import CardBike from "../../components/cardBike"
import App from "../../components/app"
import { Reveal } from "../../components/reveal"
import Carrousel from "../../components/carrousel"
import { useState } from "react"
import type { Swiper as SwiperType } from 'swiper';



const Home = () => {
  const[swiperRef, setSwiperRef] = useState<SwiperType | null>(null)

  return (
      <>
        <section className={styles.about}>
          <Reveal>
            <h1>Pedalar não tem preço.<span>Vá de Unobike.</span></h1>
            <p>
              Acreditamos que a mobilidade urbana é um direito, não um luxo. Por isso, a Unobike quebra barreiras: 
              oferecemos a mesma tecnologia, segurança e praticidade dos grandes apps, mas sem mensalidades ou taxas de desbloqueio. 
              É só baixar, encontrar a estação mais próxima e redescobrir sua cidade com total liberdade.
            </p>
          </Reveal>
          <div className={styles.imgContainer}>
              <img src={ImgBike} alt="imagem de um desenho de uma bicicleta" />
          </div>
        </section>
        <Reveal as='section' className={styles.stations}>
            <h2>Estações Disponíveis</h2>
          <MapStation/>
        </Reveal>
        <section className={styles.bike}>
          <Reveal as="div" className={styles.Bikedescription}>
            <h2>Sua liberdade é gratuita. <span>É só pegar e pedalar.</span></h2>
            <h3>Conheça a nossa bicicleta:</h3>
          </Reveal>
          <CardBike swiperControl={swiperRef}/>
          <div className={styles.carrousel}>
            <Carrousel setSwiperRef={setSwiperRef}/>
          </div>
        </section>
        <Reveal as="div" className={styles.app}>
          <h2>Sua liberdade está na palma da sua mão.<span>É só baixar e usar agora mesmo.</span></h2>
          <App/>
        </Reveal>
      </>
  )
}

export default Home;