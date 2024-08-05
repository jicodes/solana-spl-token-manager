import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import * as web3 from "@solana/web3.js";
import { FC, useState } from "react";
import styles from "../styles/Home.module.css";
import {
  createMintToInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { create } from "domain";

export const MintToForm: FC = () => {
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

  const mintTo = async (event) => {
    event.preventDefault();
    if (!connection || !publicKey) {
      return;
    }

    const mintPubKey = new web3.PublicKey(event.target.mint.value);
    const recipientPubKey = new web3.PublicKey(event.target.recipient.value);

    let amount = event.target.amount.value;
    amount = amount * Math.pow(10, DECIMALS);

    try {
      const transaction = new web3.Transaction();

      // Get the ATA for the recipient
      const ata = await getAssociatedTokenAddress(
        mintPubKey,
        recipientPubKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      );
      // Check if the ATA exists
      const accountInfo = await connection.getAccountInfo(ata);

      if (!accountInfo) {
        // If the ATA doesn't exist, create it
        transaction.add(
          createAssociatedTokenAccountInstruction(
            publicKey, // payer
            ata, // associatedToken
            recipientPubKey, // owner
            mintPubKey, // mint
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID,
          ),
        );
      }
      // Add the mint to instruction
      transaction.add(
        createMintToInstruction(mintPubKey, ata, publicKey, BigInt(amount)),
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
      setTokenAccount(ata.toString());

      // Fetch the updated balance of recipient
      const account = await getAccount(connection, ata);
      const balanceInTokens = Number(account.amount) / Math.pow(10, DECIMALS);
      setBalance(balanceInTokens.toString());
    } catch (error) {
      console.error("Error minting tokens:", error);
    }
  };

  return (
    <div>
      <br />
      {publicKey ? (
        <form onSubmit={mintTo} className={styles.form}>
          <label htmlFor="mint">Token Mint:</label>
          <input
            id="mint"
            type="text"
            className={styles.formField}
            placeholder="Enter Token Mint"
            required
          />
          <label htmlFor="recipient">Recipient:</label>
          <input
            id="recipient"
            type="text"
            className={styles.formField}
            placeholder="Enter Recipient PublicKey"
            required
          />
          <label htmlFor="amount">Amount Tokens to Mint:</label>
          <input
            id="amount"
            type="text"
            className={styles.formField}
            placeholder="e.g. 100"
            required
          />
          <button type="submit" className={styles.formButton}>
            Mint Tokens
          </button>
        </form>
      ) : (
        <span></span>
      )}
      {txSig ? (
        <div>
          <p>Recipient ATA Address: {tokenAccount} </p>
          <p>Recipient ATA Balance: {balance} </p>
          <p>View your transaction on </p>
          <a href={link()} target="_blank" rel="noopener noreferrer">
            Solana Explorer
          </a>
        </div>
      ) : null}
    </div>
  );
};
