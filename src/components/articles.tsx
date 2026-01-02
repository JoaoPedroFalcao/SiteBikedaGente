import login from "../assets/LoginScreen.png"
import SignUpScreen from "../assets/SignUpScreen.png"
import styles from "./articles.module.scss"
import { Reveal } from "./reveal";

type props = {
    activeArticle: string;
}

const Article = ( {activeArticle}:props) => {

    if (!activeArticle) return null;

    return (
        <>
        {activeArticle === 'criarConta' && (
            <Reveal as="article" className={styles.createAccount}>
                <h2>Como criar uma conta?</h2>
                <p>Para criar uma conta, você deverá seguir os seguintes passos a seguir:</p>
                <ol>
                    <li>
                        <p>Entre no aplicativo e na primeira tela, clique em "Cadastrar"</p>
                        <img src={login} alt="" />
                    </li>
                    <li><p>Nessa nova tela preencha os campos com os seus dados solicitados.</p></li>
                    <li>
                        <p>Depois de preencher os campos, clique em “Eu confirmo que tenho 18 anos ou mais e aceito os Termos de Uso”</p>
                        <img src={SignUpScreen} alt="" />
                    </li>
                    <li><p>Por último é só clicar em “Criar Conta” e esperar que sua conta seja aprovada</p></li>
                </ol>
            </Reveal>
        )}
         {activeArticle === 'gratuito' && (
            <Reveal as="article" className={styles.createAccount}>
                <h2>O uso é realmente gratuito?</h2>
                <p>
                    Sim! O nosso objetivo é incentivar a mobilidade urbana e a saúde. 
                    Você não paga nada para desbloquear a bicicleta e nem pelo tempo de uso, desde que respeite as regras de tempo de cada viagem.
                </p>
            </Reveal>
        )}
        {activeArticle === 'creditCard' && (
            <Reveal as="article" className={styles.createAccount}>
                <h2>É necessário cartão de crédito?</h2>
                <p>
                    Sim, solicitamos o cadastro de um cartão de crédito apenas como garantia de segurança para o patrimônio. 
                    Fique tranquilo: nenhuma cobrança será feita se você utilizar as bicicletas seguindo as regras de uso e devolução. 
                </p>
            </Reveal>
        )}
        {activeArticle === 'allow' && (
            <Reveal as="article" className={styles.createAccount}>
                <h2>Quem pode usar o aplicativo?</h2>
                <p>
                    O serviço está disponível para qualquer pessoa que tenha:
                    <ul>
                        <li>Mais de 18 anos;</li>
                        <li>Um smartphone (Android ou iOS);</li>
                        <li>Cadastro aprovado no nosso sistema.</li>
                    </ul>
                </p>
            </Reveal>
        )}
         {activeArticle === 'moreBike' && (
            <Reveal as="article" className={styles.createAccount}>
                <h2>Posso alugar mais de uma bicicleta ao mesmo tempo?</h2>
                <p>
                    Não. O cadastro é pessoal e intransferível, permitindo a retirada de apenas 1 (uma) bicicleta por vez. 
                    Se você está com amigos ou família, peça para que eles baixem o app e façam seus próprios cadastros!
                </p>
            </Reveal>
        )}
        {activeArticle === 'time' && (
            <Reveal as="article" className={styles.createAccount}>
                <h2>Por quanto tempo posso ficar com a bicicleta?</h2>
                <p>
                    Você pode usar a bicicleta gratuitamente por até [120 minutos] contínuos. 
                    Quer pedalar mais? Sem problemas! Basta devolver a bicicleta em qualquer estação, aguardar [30 minutos] e retirá-la novamente (ou pegar outra). 
                    Você pode fazer isso quantas vezes quiser ao longo do dia.
                </p>
            </Reveal>
        )}
         {activeArticle === 'timeOut' && (
            <Reveal as="article" className={styles.createAccount}>
                <h2>O que acontece se eu ultrapassar o tempo limite?</h2>
                <p>
                    O sistema é baseado no compartilhamento: precisamos que a bicicleta volte para que outros possam usar. 
                    Se você exceder o tempo limite de [60 minutos], sua conta estará sujeita a um bloqueio temporário. Fique de olho no cronômetro do app!
                </p>
            </Reveal>
        )}
         {activeArticle === 'operation' && (
            <Reveal as="article" className={styles.createAccount}>
                <h2>Qual o horário de funcionamento?</h2>
                <p>
                    Você pode retirar e devolver bicicletas todos os dias da semana, das [05h00 às 23h00]. 
                    (obs: O suporte também funcionará nesse mesmo horário)
                </p>
            </Reveal>
        )}
        {activeArticle === 'stolen' && (
            <Reveal as="article" className={styles.createAccount}>
                <h2>O que acontece se a bicicleta for roubada enquanto está comigo?</h2>
                <p>
                    Sua segurança vem em primeiro lugar. Caso ocorra um assalto:
                    <ul>
                        <li>Garanta sua integridade física;</li>
                        <li>Faça um Boletim de Ocorrência (B.O.) imediatamente;</li>
                        <li>Envie uma cópia do B.O. para nosso suporte através do app ou e-mail [contato@email.com.br] o mais rápido possível para isenção de responsabilidade.</li>
                    </ul>
                </p>
            </Reveal>
        )}
         {activeArticle === 'notReturn' && (
            <Reveal as="article" className={styles.createAccount}>
                <h2>O que acontece se eu não devolver a bicicleta?</h2>
                <p>
                    A não devolução da bicicleta é considerada apropriação indébita. Caso a bicicleta não retorne à estação após um longo período sem justificativa ou contato com o suporte, 
                    o usuário estará sujeito a cobrança do valor do equipamento, banimento permanente da plataforma e medidas judiciais cabíveis.
                </p>
            </Reveal>
        )}
        {activeArticle === 'contact' && (
            <Reveal as="article" className={styles.createAccount}>
                <h2>Não encontrou o que procurava?</h2>
                <p>
                    Nossa equipe está pronta para te ajudar. Entre em contato conosco pelo:
                    <ul>
                        <li>WhatsApp: [(XX) XXXXX-XXXX]</li>
                        <li>E-mail: [contato@email.com.br]</li>
                    </ul>
                </p>
            </Reveal>
        )}
        
        </>
    )
}

export default Article;