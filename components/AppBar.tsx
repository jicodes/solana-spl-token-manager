import { FC } from "react";
import styles from "../styles/Home.module.css";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Image from "next/image";

export const AppBar: FC = () => {
  return (
    <div className={styles.AppHeader}>
      <Image src="/solanaLogo.png" alt="solana logo" height={30} width={200} />
      <span>Solana SPL token demo</span>
      <WalletMultiButton />
    </div>
  );
};
