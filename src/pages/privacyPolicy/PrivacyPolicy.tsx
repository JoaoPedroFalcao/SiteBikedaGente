import CardPolicy from "../../components/cardPolicy";
import styles from "./PrivacyPolicy.module.scss"
import { Reveal } from "../../components/reveal"



const PrivacyPolicy = () => {
    return (
        <>
            <section className={styles.warning}>
                <Reveal>
                    <h1>Política de Privacidade</h1>
                    <p>
                        Este Aviso de Privacidade explica como as suas informações pessoais serão 
                        utilizadas pela Unobike em relação aos produtos e serviços prestados pela mesma.
                    </p>
                </Reveal>
            </section>
            <section>
                <Reveal className={styles.policy}>
                    <CardPolicy
                    title = 'O que eu estou permitindo ao usar os serviços ?'
                    paragraph=" Ao utilizar os serviços da UNOBIKE, o Usuário consente, de forma livre e informada, com o tratamento de 
                                seus dados pessoais, os quais poderão ser coletados, armazenados, processados e utilizados, conforme previsto 
                                nesta Política, sempre em conformidade com a Lei nº 13.709/2018, Lei Geral de Proteção de Dados Pessoais 
                                (LGPD)."

                    />
                    <CardPolicy
                        title = 'Os meus dados estarão protegidos ?'
                        paragraph=" A UNOBIKE compromete-se a adotar todas as medidas de segurança técnicas e administrativas adequadas 
                                    para proteger os dados pessoais contra acessos não autorizados, perdas, alterações ou qualquer forma de 
                                    tratamento inadequado ou ilícito."

                    />
                    <CardPolicy
                        title = 'Meus dados poderão ser compartilhados ?'
                        paragraph=" Os dados pessoais não serão, em hipótese alguma, comercializados ou compartilhados com terceiros, salvo 
                                    nas seguintes hipóteses: 
                                    a) quando houver determinação legal ou judicial; 
                                    b) para cumprimento de obrigações legais ou regulatórias; 
                                    c) mediante autorização expressa do Usuário."

                    />
                    <CardPolicy
                        title = 'As políticas de privacidade podem mudar  ?'
                        paragraph=" Esta Política poderá ser atualizada periodicamente. Em caso de alterações relevantes que demandem novo 
                                    consentimento, o Usuário será devidamente comunicado.  "
                    />
                    <CardPolicy
                        title = 'Em relação aos meus dados, que direitos eu tenho ?'
                        paragraph=" O Usuário poderá, a qualquer momento, mediante requisição formal, solicitar: 
                                    a) a confirmação da existência de tratamento de seus dados; 
                                    b) o acesso aos dados; 
                                    c) a correção de dados incompletos, inexatos ou desatualizados; 
                                    d) a anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em 
                                    desconformidade com a legislação; 
                                    e) a portabilidade dos dados a outro fornecedor de serviço, mediante requisição expressa; 
                                    f) a eliminação dos dados pessoais tratados com base no seu consentimento, exceto nas hipóteses de guarda 
                                    legal; 
                                    g) informações sobre o compartilhamento de dados, se houver; 
                                    h) a revogação do consentimento, nos termos da LGPD. "

                    />
                    <CardPolicy
                        title = 'Como eu posso solicitar alterações nos meus dados ?'
                        paragraph=" As solicitações poderão ser feitas através dos canais de atendimento da 
                                    UNOBIKE, devendo ser atendidas em prazo razoável, nos termos da legislação aplicável "
                    />
                </Reveal>
            </section>

        </>
    )
}

export default PrivacyPolicy;