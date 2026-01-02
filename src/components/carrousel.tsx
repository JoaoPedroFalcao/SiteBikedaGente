import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperType } from 'swiper';
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import styles from "./carrousel.module.scss";
import 'swiper/swiper.css'

interface Props {
  setSwiperRef: React.Dispatch<React.SetStateAction<SwiperType | null>>;
}


const Carrousel = ( {setSwiperRef}:Props ) => {
    return (
        <Swiper
            modules={[Navigation, Pagination, Autoplay]}
            spaceBetween={20}
            slidesPerView={1.5}
            loop={true}
            onSwiper={(swiper) => setSwiperRef(swiper)}
            watchSlidesProgress={true}
            className={styles.swiper}
            >
                <SwiperSlide>
                    <div className={styles.swiperslide}>
                        <h4>Selim</h4>
                        <p>O Selim GTS M1 Confort é a escolha ideal para quem prioriza o bem-estar durante as pedaladas. Projetado com espuma de alta densidade e formato anatômico, ele absorve os impactos do terreno, reduzindo a fadiga e prevenindo dores em trajetos urbanos ou trilhas leves.</p>
                    </div>
                </SwiperSlide>
                <SwiperSlide>
                    <div className={styles.swiperslide}>
                        <h4>Freios</h4>
                        <p>O conjunto de Freios V-Brake garante frenagens precisas e seguras. Reconhecido pela eficiência e facilidade de ajuste, este sistema oferece excelente resposta em situações urbanas, proporcionando confiança a cada pedalada.</p>
                    </div>
                </SwiperSlide>
                <SwiperSlide>
                    <div className={styles.swiperslide}>
                        <h4>Rodas</h4>
                        <p>O aro 26 é amplamente utilizado em diversas bicicletas por sua versatilidade e eficiência. o AERO PAREDE DUPLA ARO 26 ALUMÍNIO garante a qualidade mesmo em terrenos desafiadores.</p>
                    </div>
                </SwiperSlide>
                <SwiperSlide>
                    <div className={styles.swiperslide}>
                        <h4>Quadro</h4>
                        <p>Quadro GTSM1 Original, fabricado com a expertise de mais de 30 anos no mercado. O quadro possui a altura ideal para garantir a facilidade de subir e manter o ciclista o mais confortável possível.</p>
                    </div>
                </SwiperSlide>

        </Swiper>
        
    )
}
export default Carrousel;