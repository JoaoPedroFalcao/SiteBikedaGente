import bike from "../assets/bike.png";
import styles from "./cardBike.module.scss";
import { Reveal } from "./reveal";
import plus from "../assets/Plus.svg"
import x from "../assets/X.svg"
import type { Swiper as SwiperType } from 'swiper';


interface Props {
  swiperControl: SwiperType | null;
}

const CardBike = ( {swiperControl}: Props) => {

    const handletClick = (index:number) => {
    if (swiperControl) {
      swiperControl?.slideToLoop(index);
    }
  };

    return (
        <Reveal as="div" className={styles.card}>
            <img src={bike} alt="Bicicleta Unobike" />
            <div className={styles.containerInfo} onClick={() => handletClick(0)}>
                <span className={styles.icon1}>
                    <img src={plus} alt="" className={styles.plus} />
                    <img src={x} alt="" className={styles.x} />
                </span>
                <div className={styles.bikeInfo1}>
                    <h4>Selim</h4>
                    <p>O Selim GTS M1 Confort é a escolha ideal para quem prioriza o bem-estar durante as pedaladas. Projetado com espuma de alta densidade e formato anatômico, ele absorve os impactos do terreno, reduzindo a fadiga e prevenindo dores em trajetos urbanos ou trilhas leves.</p>
                </div>
            </div>
            <div className={styles.containerInfo} onClick={() => handletClick(1)}>
                <span className={styles.icon2}>
                    <img src={plus} alt="" className={styles.plus} />
                    <img src={x} alt="" className={styles.x} />
                </span>
                <div className={styles.bikeInfo2}>
                    <h4>Freios</h4>
                    <p>O conjunto de Freios V-Brake garante frenagens precisas e seguras. Reconhecido pela eficiência e facilidade de ajuste, este sistema oferece excelente resposta em situações urbanas, proporcionando confiança a cada pedalada.</p>
                </div>
            </div>
            <div className={styles.containerInfo} onClick={() => handletClick(2)}>
                <span className={styles.icon3}>
                    <img src={plus} alt="" className={styles.plus} />
                    <img src={x} alt="" className={styles.x} />
                </span>
                <div className={styles.bikeInfo3}>
                    <h4>Rodas</h4>
                    <p>O aro 26 é amplamente utilizado em diversas bicicletas por sua versatilidade e eficiência. o AERO PAREDE DUPLA ARO 26 ALUMÍNIO garante a qualidade mesmo em terrenos desafiadores.</p>
                </div>
            </div>
            <div className={styles.containerInfo}>
                <span className={styles.icon4} onClick={() => handletClick(3)}>
                    <img src={plus} alt="" className={styles.plus} />
                    <img src={x} alt="" className={styles.x} />
                </span>
                <div className={styles.bikeInfo4}>
                    <h4>Quadro</h4>
                    <p>Quadro GTSM1 Original, fabricado com a expertise de mais de 30 anos no mercado. O quadro possui a altura ideal para garantir a facilidade de subir e manter o ciclista o mais confortável possível.</p>
                </div>
            </div>
        </Reveal>
    );
}

export default CardBike;