import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import * as web3 from "@solana/web3.js";
import { FC, useState } from "react";
import styles from "../styles/Home.module.css";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

export const TransferToForm: FC = () => {
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

  const handleTransfer = async (event) => {
    event.preventDefault();
    if (!connection || !publicKey) {
      return;
    }

    const mintPubKey = new web3.PublicKey(event.target.mint.value);
    const recipientPubKey = new web3.PublicKey(event.target.recipient.value);

    try {
      const transaction = new web3.Transaction();
      let amount = event.target.amount.value;
      amount = BigInt(amount * Math.pow(10, DECIMALS));

      // Get the ATA for the source account
      const sourceAtaPubKey = await getAssociatedTokenAddress(
        mintPubKey,
        publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      );

      // Check if the sender's ATA exists
      const sourceAtaInfo = await connection.getAccountInfo(sourceAtaPubKey);
      if (!sourceAtaInfo) {
        throw new Error("Sender's associated token account does not exist.");
      }

      // Check the sender's token balance
      const sourceAta = await getAccount(connection, sourceAtaPubKey);
      if (sourceAta.amount < amount) {
        throw new Error("Sender does not have enough balance");
      }

      // Get the ATA pubKey for the recipient
      const recipientAtaPubKey = await getAssociatedTokenAddress(
        mintPubKey,
        recipientPubKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      );
      // Check if the ATA exists
      const recipientAtaInfo = await connection.getAccountInfo(recipientAtaPubKey);

      if (!recipientAtaInfo) {
        // If the ATA doesn't exist, create it
        transaction.add(
          createAssociatedTokenAccountInstruction(
            publicKey, // payer
            recipientAtaPubKey, // associated token account address
            recipientPubKey, // owner
            mintPubKey, // mint
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID,
          ),
        );
      }

      // Add transfer token instruction
      transaction.add(
        createTransferInstruction(
          sourceAtaPubKey,
          recipientAtaPubKey,
          publicKey,
          amount as bigint,
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
      setTokenAccount(recipientAtaPubKey.toString());

      // Fetch the updated balance of recipient
      const recipientAta = await getAccount(connection, recipientAtaPubKey);
      const balanceInTokens = Number(recipientAta.amount) / Math.pow(10, DECIMALS);
      setBalance(balanceInTokens.toString());
    } catch (error) {
      console.error("Error transfering tokens:", error);
    }
  };

  return (
    <div>
      {publicKey ? (
        <form onSubmit={handleTransfer} className={styles.form}>
          <label htmlFor="mint">Token Mint:</label>
          <input
            id="mint"
            type="text"
            className={styles.formField}
            placeholder="Enter Token Mint"
            required
          />
          <label htmlFor="amount">Amount to transfer:</label>
          <input
            id="amount"
            type="text"
            className={styles.formField}
            placeholder="e.g. 10"
            required
          />
          <label htmlFor="recipient">Transfer SPL token to:</label>
          <input
            id="recipient"
            type="text"
            className={styles.formField}
            placeholder="Enter Recipient PublicKey"
            required
          />
          <button type="submit" className={styles.formButton}>
            Transfer
          </button>
        </form>
      ) : null}
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
