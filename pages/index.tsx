import { NextPage } from 'next'
import styles from '../styles/Home.module.css'
import WalletContextProvider from '../components/WalletContextProvider'
import { AppBar } from '../components/AppBar'
import { BalanceDisplay } from '../components/BalanceDisplay'
import { CreateMintForm } from '../components/CreateMint'
import { MintToForm } from '../components/MintToForm'
import { TransferToForm } from '../components/TransferToForm'

import Head from 'next/head'

const Home: NextPage = (props) => {

  return (
    <div className={styles.App}>
      <Head>
        <title>Solana SPL token demo</title>
        <meta
          name="description"
          content="Wallet-Adapter Example"
        />
      </Head>
      <WalletContextProvider>
        <AppBar />
        <div className={styles.AppBody}>
          <BalanceDisplay />
          <CreateMintForm />
          <MintToForm />
          <TransferToForm />
        </div>
      </WalletContextProvider >
    </div>
  );
}

export default Home;