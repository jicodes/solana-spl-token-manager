import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import * as web3 from "@solana/web3.js";
import { FC, useState } from "react";
import styles from "../styles/Home.module.css";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createBurnCheckedInstruction,
  createTransferInstruction,
  getAccount,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

export const BurnSpl: FC = () => {
  const [txSig, setTxSig] = useState("");
  const [tokenAccount, setTokenAccount] = useState("");
  const [balance, setBalance] = useState("");
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const DECIMALS = 6;
  const link = () => {
    return txSig
      ? `https://explorer.solana.com/tx/${txSig}?cluster=devnet`
      : "";
  };

  const handleBurn = async (event) => {
    event.preventDefault();
    if (!connection || !publicKey) {
      return;
    }

    const mintPubKey = new web3.PublicKey(event.target.mint.value);

    try {
      const transaction = new web3.Transaction();
      let amount = event.target.amount.value;
      amount = BigInt(amount * Math.pow(10, DECIMALS));

      // Get the ATA for the burner
      const burnerAta = await getAssociatedTokenAddress(
        mintPubKey,
        publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      );

      // Check if the burner's ATA exists
      const burnerAccountInfo = await connection.getAccountInfo(burnerAta);
      if (!burnerAccountInfo) {
        throw new Error("Burner's associated token account does not exist.");
      }

      // Check the burner's token balance
      const burnerAccount = await getAccount(connection, burnerAta);
      if (burnerAccount.amount < amount) {
        throw new Error("Burner does not have enough balance");
      }

      // Add Burn Instruction
      transaction.add(
        createBurnCheckedInstruction(
          burnerAta, // PublicKey of Owner's Associated Token Account
          mintPubKey, // Public Key of the Token Mint Address
          publicKey, // Public Key of Owner's Wallet
          amount, // Number of tokens to burn
          DECIMALS, // Number of Decimals of the Token Mint
        ),
      );

      const signature = await sendTransaction(transaction, connection);
      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        {
          signature,
          ...latestBlockhash,
        },
        "confirmed",
      );

      setTxSig(signature);
      setTokenAccount(burnerAta.toString());

      // Fetch the updated balance of burner
      const account = await getAccount(connection, burnerAta);
      const balanceInTokens = Number(account.amount) / Math.pow(10, DECIMALS);
      setBalance(balanceInTokens.toString());
    } catch (error) {
      console.error("Error burning tokens:", error);
    }
  };

  return (
    <div>
      {publicKey ? (
        <form onSubmit={handleBurn} className={styles.form}>
          <label htmlFor="mint">Token Mint:</label>
          <input
            id="mint"
            type="text"
            className={styles.formField}
            placeholder="Enter Token Mint"
            required
          />
          <label htmlFor="amount">Amount to Burn:</label>
          <input
            id="amount"
            type="text"
            className={styles.formField}
            placeholder="e.g. 10"
            required
          />
          <button type="submit" className={styles.formButton}>
            Burn
          </button>
        </form>
      ) : null}
      {txSig ? (
        <div>
          <p>ATA Address: {tokenAccount} </p>
          <p>ATA Balance: {balance} </p>
          <p>View your transaction on </p>
          <a href={link()} target="_blank" rel="noopener noreferrer">
            Solana Explorer
          </a>
        </div>
      ) : null}
    </div>
  );
};
